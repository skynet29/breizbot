$$.control.registerControl('rootPage', {

	deps: ['breizbot.rtc', 'breizbot.broker', 'breizbot.params'],

	template: {gulp_inject: './main.html'},

	init: function(elt, rtc, broker, params) {

		let remoteClientId

		const data = {
			status: 'ready',
			distant: ''
		}

		if (params.caller != undefined) {
			data.status = 'connected'
			data.distant = params.caller
			remoteClientId = params.clientId
		}



		const ctrl = $$.viewController(elt, {
			data,
			events: {
				onCall: function(ev) {
					$$.ui.showPrompt({title: 'Call', content: 'User Name:'}, function(userName){
						rtc.call(userName)
						.then(() => {
							ctrl.setData({status: 'calling', distant: userName})
						})
						.catch((e) => {
							$$.ui.showAlert({title: 'Error', content: e.responseText})
						})
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
					rtc.bye(remoteClientId)
					ctrl.setData({status: 'ready', distant: ''})
					stop()
				}
			}
		})

		const pcConfig = {
		  'iceServers': [{
		    'urls': 'stun:stun.l.google.com:19302'
		  }]
		}
		const localVideo = ctrl.scope.localVideo.get(0)
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
			  		rtc.candidate(remoteClientId, {
			  			label: event.candidate.sdpMLineIndex,
			  			id: event.candidate.sdpMid,
			  			candidate: event.candidate.candidate		    			
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
			

		navigator.mediaDevices.getUserMedia({
		  audio: true,
		  video: {
		  	width: {max: elt.width()/ 2}
		  }
		})
		.then(function(stream) {
			console.log('localStream ready')
			localVideo.srcObject = stream
			localStream = stream

			if (params.caller != undefined) {
				rtc.accept(remoteClientId)
				createPeerConnection()	
				pc.addStream(localStream)				
			}
		})
		.catch(function(e) {
			console.log('error', e)
			if (remoteClientId != undefined) {
				rtc.deny(remoteClientId)
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
			remoteClientId = msg.srcId

			ctrl.setData({status: 'connected'})
			createPeerConnection()
			pc.addStream(localStream)
			pc.createOffer().then((sessionDescription) => {
				console.log('createOffer', sessionDescription)
				pc.setLocalDescription(sessionDescription)
				rtc.offer(remoteClientId, sessionDescription)
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
			const message = msg.data

		    const candidate = new RTCIceCandidate({
		      sdpMLineIndex: message.label,
		      candidate: message.candidate
		    })
		    pc.addIceCandidate(candidate)		
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
				rtc.answer(remoteClientId, sessionDescription)

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
		  		rtc.bye(remoteClientId)
			}
		};		
	
	}


});




