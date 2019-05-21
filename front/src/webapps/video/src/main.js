$$.control.registerControl('rootPage', {

	props: {
		$pager: null
	},

	deps: ['breizbot.rtc', 'breizbot.broker', 'breizbot.params'],

	template: {gulp_inject: './main.html'},

	init: function(elt, rtc, broker, params) {

		const {$pager} = this.props

		const data = {
			status: 'ready',
			distant: '',
			videoSize: ''
		}

		if (params.caller != undefined) {
			data.status = 'connected'
			data.distant = params.caller
			rtc.setRemoteClientId(params.clientId)
		}



		const ctrl = $$.viewController(elt, {
			data,
			events: {
				onCall: function(ev) {
					console.log('onCall')

					$pager.pushPage('friendsPage', {
						title: 'Select a friend'
					})

				},
				onCancel: function(ev) {
					rtc.cancel(ctrl.model.distant)
					.then(() => {
						ctrl.setData({status: 'canceled', distant: ''})
					})
					.catch((e) => {
						$$.ui.showAlert({title: 'Error', content: e.responseText})
					})
				},
				onHangup: function(ev) {
					rtc.bye()
					ctrl.setData({status: 'ready', distant: ''})
					stop()
				}
			}
		})

		this.onReturn = function(userName) {
			//console.log('onReturn', userName)
			if (userName == undefined) {
				return
			}
			
			rtc.call(userName)
			.then(() => {
				ctrl.setData({status: 'calling', distant: userName})
			})
			.catch((e) => {
				$$.ui.showAlert({title: 'Error', content: e.responseText})
			})
		}

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
			  	if (event.candidate) {
			  		rtc.candidate(event.candidate)
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
			
		console.log('height', elt.find('.video').height())

		navigator.mediaDevices.getUserMedia({
		  audio: true,
		  video: true
		})
		.then(function(stream) {
			console.log('localStream ready')
			
			localVideo.srcObject = stream
			localStream = stream

			if (params.caller != undefined) {
				rtc.accept()
				createPeerConnection()	
				pc.addStream(localStream)				
			}
		})
		.catch(function(e) {
			console.log('error', e)
			if (params.caller != undefined) {
				rtc.deny()
			}
			ctrl.setData({distant: '', status: 'failed'})
		  	//alert('getUserMedia() error: ' + e.name);

		})

		broker.onTopic('breizbot.rtc.accept', function(msg) {
			if (msg.hist === true) {
				return
			}
			console.log('msg', msg)
			rtc.cancel(ctrl.model.distant)
			rtc.setRemoteClientId(msg.srcId)

			ctrl.setData({status: 'connected'})
			createPeerConnection()
			pc.addStream(localStream)
			pc.createOffer().then((sessionDescription) => {
				console.log('createOffer', sessionDescription)
				pc.setLocalDescription(sessionDescription)
				rtc.offer(sessionDescription)
			})
		})

		broker.onTopic('breizbot.rtc.deny', function(msg) {
			if (msg.hist === true) {
				return
			}
			console.log('msg', msg)
			ctrl.setData({status: 'refused'})
			rtc.cancel(ctrl.model.distant)

		})

		broker.onTopic('breizbot.rtc.candidate', function(msg) {
			if (msg.hist === true) {
				return
			}
			console.log('msg', msg)
			const {label, candidate} = msg.data

		    pc.addIceCandidate(new RTCIceCandidate({
		      sdpMLineIndex: label,
		      candidate
		    }))		
		})		

		broker.onTopic('breizbot.rtc.offer', function(msg) {
			if (msg.hist === true) {
				return
			}
			console.log('msg', msg)
			pc.setRemoteDescription(new RTCSessionDescription(msg.data))
			console.log('Sending answer to peer.')
			pc.createAnswer().then((sessionDescription) => {
				pc.setLocalDescription(sessionDescription)
				rtc.answer(sessionDescription)

			})

		})	

		broker.onTopic('breizbot.rtc.answer', function(msg) {
			if (msg.hist === true) {
				return
			}
			console.log('msg', msg)
			pc.setRemoteDescription(new RTCSessionDescription(msg.data))

		})	

		broker.onTopic('breizbot.rtc.bye', function(msg) {
			if (msg.hist === true) {
				return
			}
			console.log('msg', msg)
			ctrl.setData({status: 'disconnected', distant: ''})
			stop()

		})	


		window.onbeforeunload = function() {
			if (pc != undefined) {
		  		rtc.bye()
			}
		};		
	
	}


});




