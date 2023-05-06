//@ts-check
$$.control.registerControl('rootPage', {


	deps: ['breizbot.rtc'],

	template: {gulp_inject: './main.html'},

	/**
	 * 
	 * @param {Breizbot.Services.RTC.Interface} rtc 
	 */
	init: function(elt, rtc) {

		rtc.on('status', (data) => {
			ctrl.setData({status: data.status})
		})

		const ctrl = $$.viewController(elt, {
			data: {
				status: 'ready',
				isConnected: function() {return this.status == 'connected'}
			},
			events: {
				onHangup: function(ev) {
					stop()
				}
			}
		})



		const pcConfig = {
		  'iceServers': [{
		    'urls': 'stun:stun.l.google.com:19302'
		  }]
		}

		/**@type {HTMLVideoElement} */
		const localVideo = ctrl.scope.localVideo.on('canplay', function(){
			console.log('canplay', this.videoHeight, this.videoWidth)
			ctrl.setData({videoSize: this.videoWidth + 'x' + this.videoHeight})
		}).get(0)

		/**@type {HTMLVideoElement} */
		const remoteVideo = ctrl.scope.remoteVideo.get(0)

		/**@type {RTCPeerConnection} */
		let pc = null

		/**@type {MediaStream} */
		let localStream = null

		/**@type {MediaStream} */
		let remoteStream = null

		function createPeerConnection() {
			console.log('createPeerConnection')
			try {
			  pc = new RTCPeerConnection(pcConfig)

			  pc.onicecandidate = function(event) {
			  	//console.log('onicecandidate', event)
			  	const info = event.candidate

			  	if (info) {
			  		rtc.sendData('candidate', {
			  			label: info.sdpMLineIndex,
			  			id: info.sdpMid,
			  			candidate: info.candidate				  			
			  		})
		  		
			  	}
			  }
			  pc.ontrack = function(event) {
			  	console.log('ontrack', event)
			  	remoteStream = event.streams[0]
			  	remoteVideo.srcObject = remoteStream			  	
			  }

			  pc.onnegotiationneeded = async function(event) {
				console.log('onnegotiationneeded', event)
				const offer = await pc.createOffer()
				//console.log('createOffer', sessionDescription)
				pc.setLocalDescription(offer)
				console.log('send offer', offer)
				rtc.sendData('offer', offer)
			  }
			
			  //pc.onremovestream = handleRemoteStreamRemoved
			  //console.log('Created RTCPeerConnnection')
			} catch (e) {
			  console.log('Failed to create PeerConnection, exception: ' + e.message)
			  alert('Cannot create RTCPeerConnection object.')
			}
		}

		function stop() {
		  pc.close()
		  pc = null	
		  if (remoteStream) {
			remoteStream.getTracks().forEach((track) => track.stop())
		  }	  
		}	
			
		async function openMedia() {
			//console.log('openMedia')
			try {
				const stream = await navigator.mediaDevices.getUserMedia({
					audio: true,
					video: true
				  })
				//console.log('localStream ready')
			
				localVideo.srcObject = stream
				localStream = stream

				if (rtc.isCallee()) {
					rtc.accept()
				}	
			}
			catch (e) {
				console.log('error', e)
				if (rtc.isCallee) {
					rtc.deny()
				}
			}
		}

		rtc.on('accept', async function() {
			console.log('receive accept')
			createPeerConnection()
			localStream.getTracks().forEach((track) => {
				console.log('addTrack', track)
				pc.addTrack(track, localStream)
			})

		})


		rtc.onData('candidate', function(data) {
			const {label, candidate} = data

		    pc.addIceCandidate(new RTCIceCandidate({
		      sdpMLineIndex: label,
		      candidate
		    }))		
		})		

		rtc.onData('offer', async function(data) {
			console.log('receive offer', data)
			createPeerConnection()	

			pc.setRemoteDescription(new RTCSessionDescription(data))
			//console.log('Sending answer to peer.')
			localStream.getTracks().forEach((track) => {
				console.log('addTrack', track)
				pc.addTrack(track, localStream)
			})
			const answer = await pc.createAnswer()
			pc.setLocalDescription(answer)
			console.log('send answer', answer)
			rtc.sendData('answer', answer)
		})	

		rtc.onData('answer', function(data) {
			console.log('receive answer', data)
			pc.setRemoteDescription(new RTCSessionDescription(data))

		})	

		rtc.on('bye', function() {
			stop()
		})	

		rtc.on('ready', () => { 
			openMedia()
		})

		this.onAppExit = function() {
			return rtc.exit()
		}		
	
	}


});




