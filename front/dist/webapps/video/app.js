$$.control.registerControl('rootPage', {

	deps: ['breizbot.rtc', 'breizbot.broker', 'breizbot.params'],

	template: "<div style=\"margin: 10px;\">\n	\n	<div>\n	  <video bn-bind=\"localVideo\" autoplay muted playsinline></video>\n	  <video bn-bind=\"remoteVideo\" autoplay playsinline></video>\n	</div>\n\n	<div>\n		<button \n			bn-event=\"click: onCall\"\n			bn-show=\"[\'ready\', \'disconnected\', \'refused\', \'canceled\'].includes(status)\"\n			class=\"w3-btn w3-blue\">Call</button>\n\n		<button \n			bn-event=\"click: onCancel\"\n			bn-show=\"status == \'calling\'\"\n			class=\"w3-btn w3-blue\">Cancel</button>\n\n		<button \n			bn-event=\"click: onHangup\"\n			bn-show=\"status == \'connected\'\"\n			class=\"w3-btn w3-blue\">Hangup</button>\n\n	</div>\n	<p>status: <span bn-text=\"status\"></span></p>\n	<p>Distant: <span bn-text=\"distant\"></span></p>\n\n</div>",

	init: function(elt, rtc, broker, params) {

		let localClientId
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
						rtc.call(userName, localClientId)
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
				rtc.accept(remoteClientId, localClientId)
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
			remoteClientId = msg.data.fromClientId

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

		broker.on('ready', (data) => {
			console.log('onready', data)
			localClientId = data.clientId			
		})

		window.onbeforeunload = function() {
		  rtc.bye(remoteClientId)
		};		
	
	}


});





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJhcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgncm9vdFBhZ2UnLCB7XG5cblx0ZGVwczogWydicmVpemJvdC5ydGMnLCAnYnJlaXpib3QuYnJva2VyJywgJ2JyZWl6Ym90LnBhcmFtcyddLFxuXG5cdHRlbXBsYXRlOiBcIjxkaXYgc3R5bGU9XFxcIm1hcmdpbjogMTBweDtcXFwiPlxcblx0XFxuXHQ8ZGl2Plxcblx0ICA8dmlkZW8gYm4tYmluZD1cXFwibG9jYWxWaWRlb1xcXCIgYXV0b3BsYXkgbXV0ZWQgcGxheXNpbmxpbmU+PC92aWRlbz5cXG5cdCAgPHZpZGVvIGJuLWJpbmQ9XFxcInJlbW90ZVZpZGVvXFxcIiBhdXRvcGxheSBwbGF5c2lubGluZT48L3ZpZGVvPlxcblx0PC9kaXY+XFxuXFxuXHQ8ZGl2Plxcblx0XHQ8YnV0dG9uIFxcblx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25DYWxsXFxcIlxcblx0XHRcdGJuLXNob3c9XFxcIltcXCdyZWFkeVxcJywgXFwnZGlzY29ubmVjdGVkXFwnLCBcXCdyZWZ1c2VkXFwnLCBcXCdjYW5jZWxlZFxcJ10uaW5jbHVkZXMoc3RhdHVzKVxcXCJcXG5cdFx0XHRjbGFzcz1cXFwidzMtYnRuIHczLWJsdWVcXFwiPkNhbGw8L2J1dHRvbj5cXG5cXG5cdFx0PGJ1dHRvbiBcXG5cdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uQ2FuY2VsXFxcIlxcblx0XHRcdGJuLXNob3c9XFxcInN0YXR1cyA9PSBcXCdjYWxsaW5nXFwnXFxcIlxcblx0XHRcdGNsYXNzPVxcXCJ3My1idG4gdzMtYmx1ZVxcXCI+Q2FuY2VsPC9idXR0b24+XFxuXFxuXHRcdDxidXR0b24gXFxuXHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvbkhhbmd1cFxcXCJcXG5cdFx0XHRibi1zaG93PVxcXCJzdGF0dXMgPT0gXFwnY29ubmVjdGVkXFwnXFxcIlxcblx0XHRcdGNsYXNzPVxcXCJ3My1idG4gdzMtYmx1ZVxcXCI+SGFuZ3VwPC9idXR0b24+XFxuXFxuXHQ8L2Rpdj5cXG5cdDxwPnN0YXR1czogPHNwYW4gYm4tdGV4dD1cXFwic3RhdHVzXFxcIj48L3NwYW4+PC9wPlxcblx0PHA+RGlzdGFudDogPHNwYW4gYm4tdGV4dD1cXFwiZGlzdGFudFxcXCI+PC9zcGFuPjwvcD5cXG5cXG48L2Rpdj5cIixcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIHJ0YywgYnJva2VyLCBwYXJhbXMpIHtcblxuXHRcdGxldCBsb2NhbENsaWVudElkXG5cdFx0bGV0IHJlbW90ZUNsaWVudElkXG5cblx0XHRjb25zdCBkYXRhID0ge1xuXHRcdFx0c3RhdHVzOiAncmVhZHknLFxuXHRcdFx0ZGlzdGFudDogJydcblx0XHR9XG5cblx0XHRpZiAocGFyYW1zLmNhbGxlciAhPSB1bmRlZmluZWQpIHtcblx0XHRcdGRhdGEuc3RhdHVzID0gJ2Nvbm5lY3RlZCdcblx0XHRcdGRhdGEuZGlzdGFudCA9IHBhcmFtcy5jYWxsZXJcblx0XHRcdHJlbW90ZUNsaWVudElkID0gcGFyYW1zLmNsaWVudElkXG5cdFx0fVxuXG5cblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGEsXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25DYWxsOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdCQkLnVpLnNob3dQcm9tcHQoe3RpdGxlOiAnQ2FsbCcsIGNvbnRlbnQ6ICdVc2VyIE5hbWU6J30sIGZ1bmN0aW9uKHVzZXJOYW1lKXtcblx0XHRcdFx0XHRcdHJ0Yy5jYWxsKHVzZXJOYW1lLCBsb2NhbENsaWVudElkKVxuXHRcdFx0XHRcdFx0LnRoZW4oKCkgPT4ge1xuXHRcdFx0XHRcdFx0XHRjdHJsLnNldERhdGEoe3N0YXR1czogJ2NhbGxpbmcnLCBkaXN0YW50OiB1c2VyTmFtZX0pXG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0LmNhdGNoKChlKSA9PiB7XG5cdFx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7dGl0bGU6ICdFcnJvcicsIGNvbnRlbnQ6IGUucmVzcG9uc2VUZXh0fSlcblx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fSxcblx0XHRcdFx0b25DYW5jZWw6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0cnRjLmNhbmNlbChjdHJsLm1vZGVsLmRpc3RhbnQpXG5cdFx0XHRcdFx0LnRoZW4oKCkgPT4ge1xuXHRcdFx0XHRcdFx0Y3RybC5zZXREYXRhKHtzdGF0dXM6ICdjYW5jZWxlZCcsIGRpc3RhbnQ6ICcnfSlcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdC5jYXRjaCgoZSkgPT4ge1xuXHRcdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHt0aXRsZTogJ0Vycm9yJywgY29udGVudDogZS5yZXNwb25zZVRleHR9KVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uSGFuZ3VwOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdHJ0Yy5ieWUocmVtb3RlQ2xpZW50SWQpXG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHtzdGF0dXM6ICdyZWFkeScsIGRpc3RhbnQ6ICcnfSlcblx0XHRcdFx0XHRzdG9wKClcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHRjb25zdCBwY0NvbmZpZyA9IHtcblx0XHQgICdpY2VTZXJ2ZXJzJzogW3tcblx0XHQgICAgJ3VybHMnOiAnc3R1bjpzdHVuLmwuZ29vZ2xlLmNvbToxOTMwMidcblx0XHQgIH1dXG5cdFx0fVxuXHRcdGNvbnN0IGxvY2FsVmlkZW8gPSBjdHJsLnNjb3BlLmxvY2FsVmlkZW8uZ2V0KDApXG5cdFx0Y29uc3QgcmVtb3RlVmlkZW8gPSBjdHJsLnNjb3BlLnJlbW90ZVZpZGVvLmdldCgwKVxuXHRcdGxldCBwY1xuXHRcdGxldCBsb2NhbFN0cmVhbVxuXHRcdGxldCByZW1vdGVTdHJlYW1cblxuXHRcdGZ1bmN0aW9uIGNyZWF0ZVBlZXJDb25uZWN0aW9uKCkge1xuXHRcdFx0Y29uc29sZS5sb2coJ2NyZWF0ZVBlZXJDb25uZWN0aW9uJylcblx0XHRcdHRyeSB7XG5cdFx0XHQgIHBjID0gbmV3IFJUQ1BlZXJDb25uZWN0aW9uKHBjQ29uZmlnKVxuXG5cdFx0XHQgIHBjLm9uaWNlY2FuZGlkYXRlID0gZnVuY3Rpb24oZXZlbnQpIHtcblx0XHRcdCAgXHQvL2NvbnNvbGUubG9nKCdvbmljZWNhbmRpZGF0ZScsIGV2ZW50KVxuXHRcdFx0ICBcdGlmIChldmVudC5jYW5kaWRhdGUpIHtcblx0XHRcdCAgXHRcdHJ0Yy5jYW5kaWRhdGUocmVtb3RlQ2xpZW50SWQsIHtcblx0XHRcdCAgXHRcdFx0bGFiZWw6IGV2ZW50LmNhbmRpZGF0ZS5zZHBNTGluZUluZGV4LFxuXHRcdFx0ICBcdFx0XHRpZDogZXZlbnQuY2FuZGlkYXRlLnNkcE1pZCxcblx0XHRcdCAgXHRcdFx0Y2FuZGlkYXRlOiBldmVudC5jYW5kaWRhdGUuY2FuZGlkYXRlXHRcdCAgICBcdFx0XHRcblx0XHRcdCAgXHRcdH0pXG5cdFx0XHQgIFx0fVxuXHRcdFx0ICB9XG5cdFx0XHQgIHBjLm9uYWRkc3RyZWFtID0gZnVuY3Rpb24oZXZlbnQpIHtcblx0XHRcdCAgXHRjb25zb2xlLmxvZygnb25hZGRzdHJlYW0nLCBldmVudClcblx0XHRcdCAgXHRyZW1vdGVTdHJlYW0gPSBldmVudC5zdHJlYW1cblx0XHRcdCAgXHRyZW1vdGVWaWRlby5zcmNPYmplY3QgPSByZW1vdGVTdHJlYW1cdFx0XHQgIFx0XG5cdFx0XHQgIH1cblx0XHRcdCAgLy9wYy5vbnJlbW92ZXN0cmVhbSA9IGhhbmRsZVJlbW90ZVN0cmVhbVJlbW92ZWRcblx0XHRcdCAgY29uc29sZS5sb2coJ0NyZWF0ZWQgUlRDUGVlckNvbm5uZWN0aW9uJylcblx0XHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdCAgY29uc29sZS5sb2coJ0ZhaWxlZCB0byBjcmVhdGUgUGVlckNvbm5lY3Rpb24sIGV4Y2VwdGlvbjogJyArIGUubWVzc2FnZSlcblx0XHRcdCAgYWxlcnQoJ0Nhbm5vdCBjcmVhdGUgUlRDUGVlckNvbm5lY3Rpb24gb2JqZWN0LicpXG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gc3RvcCgpIHtcblx0XHQgIHBjLmNsb3NlKClcblx0XHQgIHBjID0gbnVsbFx0XHQgIFxuXHRcdH1cdFxuXHRcdFx0XG5cblx0XHRuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmdldFVzZXJNZWRpYSh7XG5cdFx0ICBhdWRpbzogdHJ1ZSxcblx0XHQgIHZpZGVvOiB7XG5cdFx0ICBcdHdpZHRoOiB7bWF4OiBlbHQud2lkdGgoKS8gMn1cblx0XHQgIH1cblx0XHR9KVxuXHRcdC50aGVuKGZ1bmN0aW9uKHN0cmVhbSkge1xuXHRcdFx0Y29uc29sZS5sb2coJ2xvY2FsU3RyZWFtIHJlYWR5Jylcblx0XHRcdGxvY2FsVmlkZW8uc3JjT2JqZWN0ID0gc3RyZWFtXG5cdFx0XHRsb2NhbFN0cmVhbSA9IHN0cmVhbVxuXG5cdFx0XHRpZiAocGFyYW1zLmNhbGxlciAhPSB1bmRlZmluZWQpIHtcblx0XHRcdFx0cnRjLmFjY2VwdChyZW1vdGVDbGllbnRJZCwgbG9jYWxDbGllbnRJZClcblx0XHRcdFx0Y3JlYXRlUGVlckNvbm5lY3Rpb24oKVx0XG5cdFx0XHRcdHBjLmFkZFN0cmVhbShsb2NhbFN0cmVhbSlcdFx0XHRcdFxuXHRcdFx0fVxuXHRcdH0pXG5cdFx0LmNhdGNoKGZ1bmN0aW9uKGUpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdlcnJvcicsIGUpXG5cdFx0XHRpZiAocmVtb3RlQ2xpZW50SWQgIT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdHJ0Yy5kZW55KHJlbW90ZUNsaWVudElkKVxuXHRcdFx0fVxuXHRcdFx0Y3RybC5zZXREYXRhKHtkaXN0YW50OiAnJywgc3RhdHVzOiAnZmFpbGVkJ30pXG5cdFx0ICBcdC8vYWxlcnQoJ2dldFVzZXJNZWRpYSgpIGVycm9yOiAnICsgZS5uYW1lKTtcblxuXHRcdH0pXG5cblx0XHRicm9rZXIub25Ub3BpYygnYnJlaXpib3QucnRjLmFjY2VwdCcsIGZ1bmN0aW9uKG1zZykge1xuXHRcdFx0aWYgKG1zZy5oaXN0ID09PSB0cnVlKSB7XG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXHRcdFx0Y29uc29sZS5sb2coJ21zZycsIG1zZylcblx0XHRcdHJ0Yy5jYW5jZWwoY3RybC5tb2RlbC5kaXN0YW50KVxuXHRcdFx0cmVtb3RlQ2xpZW50SWQgPSBtc2cuZGF0YS5mcm9tQ2xpZW50SWRcblxuXHRcdFx0Y3RybC5zZXREYXRhKHtzdGF0dXM6ICdjb25uZWN0ZWQnfSlcblx0XHRcdGNyZWF0ZVBlZXJDb25uZWN0aW9uKClcblx0XHRcdHBjLmFkZFN0cmVhbShsb2NhbFN0cmVhbSlcblx0XHRcdHBjLmNyZWF0ZU9mZmVyKCkudGhlbigoc2Vzc2lvbkRlc2NyaXB0aW9uKSA9PiB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdjcmVhdGVPZmZlcicsIHNlc3Npb25EZXNjcmlwdGlvbilcblx0XHRcdFx0cGMuc2V0TG9jYWxEZXNjcmlwdGlvbihzZXNzaW9uRGVzY3JpcHRpb24pXG5cdFx0XHRcdHJ0Yy5vZmZlcihyZW1vdGVDbGllbnRJZCwgc2Vzc2lvbkRlc2NyaXB0aW9uKVxuXHRcdFx0fSlcblx0XHR9KVxuXG5cdFx0YnJva2VyLm9uVG9waWMoJ2JyZWl6Ym90LnJ0Yy5kZW55JywgZnVuY3Rpb24obXNnKSB7XG5cdFx0XHRpZiAobXNnLmhpc3QgPT09IHRydWUpIHtcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cdFx0XHRjb25zb2xlLmxvZygnbXNnJywgbXNnKVxuXHRcdFx0Y3RybC5zZXREYXRhKHtzdGF0dXM6ICdyZWZ1c2VkJ30pXG5cdFx0XHRydGMuY2FuY2VsKGN0cmwubW9kZWwuZGlzdGFudClcblxuXHRcdH0pXG5cblx0XHRicm9rZXIub25Ub3BpYygnYnJlaXpib3QucnRjLmNhbmRpZGF0ZScsIGZ1bmN0aW9uKG1zZykge1xuXHRcdFx0aWYgKG1zZy5oaXN0ID09PSB0cnVlKSB7XG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXHRcdFx0Y29uc29sZS5sb2coJ21zZycsIG1zZylcblx0XHRcdGNvbnN0IG1lc3NhZ2UgPSBtc2cuZGF0YVxuXG5cdFx0ICAgIGNvbnN0IGNhbmRpZGF0ZSA9IG5ldyBSVENJY2VDYW5kaWRhdGUoe1xuXHRcdCAgICAgIHNkcE1MaW5lSW5kZXg6IG1lc3NhZ2UubGFiZWwsXG5cdFx0ICAgICAgY2FuZGlkYXRlOiBtZXNzYWdlLmNhbmRpZGF0ZVxuXHRcdCAgICB9KVxuXHRcdCAgICBwYy5hZGRJY2VDYW5kaWRhdGUoY2FuZGlkYXRlKVx0XHRcblx0XHR9KVx0XHRcblxuXHRcdGJyb2tlci5vblRvcGljKCdicmVpemJvdC5ydGMub2ZmZXInLCBmdW5jdGlvbihtc2cpIHtcblx0XHRcdGlmIChtc2cuaGlzdCA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblx0XHRcdGNvbnNvbGUubG9nKCdtc2cnLCBtc2cpXG5cdFx0XHRwYy5zZXRSZW1vdGVEZXNjcmlwdGlvbihuZXcgUlRDU2Vzc2lvbkRlc2NyaXB0aW9uKG1zZy5kYXRhKSlcblx0XHRcdGNvbnNvbGUubG9nKCdTZW5kaW5nIGFuc3dlciB0byBwZWVyLicpXG5cdFx0XHRwYy5jcmVhdGVBbnN3ZXIoKS50aGVuKChzZXNzaW9uRGVzY3JpcHRpb24pID0+IHtcblx0XHRcdFx0cGMuc2V0TG9jYWxEZXNjcmlwdGlvbihzZXNzaW9uRGVzY3JpcHRpb24pXG5cdFx0XHRcdHJ0Yy5hbnN3ZXIocmVtb3RlQ2xpZW50SWQsIHNlc3Npb25EZXNjcmlwdGlvbilcblxuXHRcdFx0fSlcblxuXHRcdH0pXHRcblxuXHRcdGJyb2tlci5vblRvcGljKCdicmVpemJvdC5ydGMuYW5zd2VyJywgZnVuY3Rpb24obXNnKSB7XG5cdFx0XHRpZiAobXNnLmhpc3QgPT09IHRydWUpIHtcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cdFx0XHRjb25zb2xlLmxvZygnbXNnJywgbXNnKVxuXHRcdFx0cGMuc2V0UmVtb3RlRGVzY3JpcHRpb24obmV3IFJUQ1Nlc3Npb25EZXNjcmlwdGlvbihtc2cuZGF0YSkpXG5cblx0XHR9KVx0XG5cblx0XHRicm9rZXIub25Ub3BpYygnYnJlaXpib3QucnRjLmJ5ZScsIGZ1bmN0aW9uKG1zZykge1xuXHRcdFx0aWYgKG1zZy5oaXN0ID09PSB0cnVlKSB7XG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXHRcdFx0Y29uc29sZS5sb2coJ21zZycsIG1zZylcblx0XHRcdGN0cmwuc2V0RGF0YSh7c3RhdHVzOiAnZGlzY29ubmVjdGVkJywgZGlzdGFudDogJyd9KVxuXHRcdFx0c3RvcCgpXG5cblx0XHR9KVx0XG5cblx0XHRicm9rZXIub24oJ3JlYWR5JywgKGRhdGEpID0+IHtcblx0XHRcdGNvbnNvbGUubG9nKCdvbnJlYWR5JywgZGF0YSlcblx0XHRcdGxvY2FsQ2xpZW50SWQgPSBkYXRhLmNsaWVudElkXHRcdFx0XG5cdFx0fSlcblxuXHRcdHdpbmRvdy5vbmJlZm9yZXVubG9hZCA9IGZ1bmN0aW9uKCkge1xuXHRcdCAgcnRjLmJ5ZShyZW1vdGVDbGllbnRJZClcblx0XHR9O1x0XHRcblx0XG5cdH1cblxuXG59KTtcblxuXG5cblxuIl19
