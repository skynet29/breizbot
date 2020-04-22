$$.control.registerControl('rootPage', {


	deps: ['breizbot.rtc'],

	template: {gulp_inject: './main.html'},

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

		const localVideo = ctrl.scope.localVideo.on('canplay', function(){
			console.log('canplay', this.videoHeight, this.videoWidth)
			ctrl.setData({videoSize: this.videoWidth + 'x' + this.videoHeight})
		}).get(0)

		const remoteVideo = ctrl.scope.remoteVideo.get(0)
		let pc
		let localStream
		let remoteStream

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
			  pc.onaddstream = function(event) {
			  	console.log('onaddstream', event)
			  	remoteStream = event.stream
			  	remoteVideo.srcObject = remoteStream			  	
			  }
			  //pc.onremovestream = handleRemoteStreamRemoved
			  console.log('Created RTCPeerConnnection')
			} catch (e) {
			  console.log('Failed to create PeerConnection, exception: ' + e.message)
			  alert('Cannot create RTCPeerConnection object.')
			}
		}

		function stop() {
		  pc.close()
		  pc = null		  
		}	
			
		async function openMedia() {
			console.log('openMedia')
			try {
				const stream = await navigator.mediaDevices.getUserMedia({
					audio: true,
					video: true
				  })
				console.log('localStream ready')
			
				localVideo.srcObject = stream
				localStream = stream

				if (rtc.isCallee) {
					rtc.accept()
					createPeerConnection()	
					pc.addStream(localStream)				
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
			createPeerConnection()
			pc.addStream(localStream)
			const sessionDescription = await pc.createOffer()
			console.log('createOffer', sessionDescription)
			pc.setLocalDescription(sessionDescription)
			rtc.sendData('offer', sessionDescription)
		})


		rtc.onData('candidate', function(data) {
			const {label, candidate} = data

		    pc.addIceCandidate(new RTCIceCandidate({
		      sdpMLineIndex: label,
		      candidate
		    }))		
		})		

		rtc.onData('offer', async function(data) {
			pc.setRemoteDescription(new RTCSessionDescription(data))
			console.log('Sending answer to peer.')
			const sessionDescription = await pc.createAnswer()
			pc.setLocalDescription(sessionDescription)
			rtc.sendData('answer', sessionDescription)
		})	

		rtc.onData('answer', function(data) {
			pc.setRemoteDescription(new RTCSessionDescription(data))

		})	

		rtc.on('bye', function() {
			stop()
		})	

		rtc.on('ready', () => { 
			openMedia()
		})

		this.onAppExit = function() {
			return rtc.bye()
		}		
	
	}


});




