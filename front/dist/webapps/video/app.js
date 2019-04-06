$$.control.registerControl('rootPage', {

	deps: ['breizbot.rtc', 'breizbot.broker', 'breizbot.params'],

	template: "<div style=\"margin: 10px;\">\n	\n	<div>\n	  <video bn-bind=\"localVideo\" autoplay muted playsinline></video>\n	  <video bn-bind=\"remoteVideo\" autoplay playsinline></video>\n	</div>\n\n	<div>\n		<button \n			bn-event=\"click: onCall\"\n			bn-show=\"[\'ready\', \'disconnected\', \'refused\', \'canceled\'].includes(status)\"\n			class=\"w3-btn w3-blue\">Call</button>\n\n		<button \n			bn-event=\"click: onCancel\"\n			bn-show=\"status == \'calling\'\"\n			class=\"w3-btn w3-blue\">Cancel</button>\n\n		<button \n			bn-event=\"click: onHangup\"\n			bn-show=\"status == \'connected\'\"\n			class=\"w3-btn w3-blue\">Hangup</button>\n\n	</div>\n	<p>status: <span bn-text=\"status\"></span></p>\n	<p>Distant: <span bn-text=\"distant\"></span></p>\n\n</div>",

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





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJhcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgncm9vdFBhZ2UnLCB7XG5cblx0ZGVwczogWydicmVpemJvdC5ydGMnLCAnYnJlaXpib3QuYnJva2VyJywgJ2JyZWl6Ym90LnBhcmFtcyddLFxuXG5cdHRlbXBsYXRlOiBcIjxkaXYgc3R5bGU9XFxcIm1hcmdpbjogMTBweDtcXFwiPlxcblx0XFxuXHQ8ZGl2Plxcblx0ICA8dmlkZW8gYm4tYmluZD1cXFwibG9jYWxWaWRlb1xcXCIgYXV0b3BsYXkgbXV0ZWQgcGxheXNpbmxpbmU+PC92aWRlbz5cXG5cdCAgPHZpZGVvIGJuLWJpbmQ9XFxcInJlbW90ZVZpZGVvXFxcIiBhdXRvcGxheSBwbGF5c2lubGluZT48L3ZpZGVvPlxcblx0PC9kaXY+XFxuXFxuXHQ8ZGl2Plxcblx0XHQ8YnV0dG9uIFxcblx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25DYWxsXFxcIlxcblx0XHRcdGJuLXNob3c9XFxcIltcXCdyZWFkeVxcJywgXFwnZGlzY29ubmVjdGVkXFwnLCBcXCdyZWZ1c2VkXFwnLCBcXCdjYW5jZWxlZFxcJ10uaW5jbHVkZXMoc3RhdHVzKVxcXCJcXG5cdFx0XHRjbGFzcz1cXFwidzMtYnRuIHczLWJsdWVcXFwiPkNhbGw8L2J1dHRvbj5cXG5cXG5cdFx0PGJ1dHRvbiBcXG5cdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uQ2FuY2VsXFxcIlxcblx0XHRcdGJuLXNob3c9XFxcInN0YXR1cyA9PSBcXCdjYWxsaW5nXFwnXFxcIlxcblx0XHRcdGNsYXNzPVxcXCJ3My1idG4gdzMtYmx1ZVxcXCI+Q2FuY2VsPC9idXR0b24+XFxuXFxuXHRcdDxidXR0b24gXFxuXHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvbkhhbmd1cFxcXCJcXG5cdFx0XHRibi1zaG93PVxcXCJzdGF0dXMgPT0gXFwnY29ubmVjdGVkXFwnXFxcIlxcblx0XHRcdGNsYXNzPVxcXCJ3My1idG4gdzMtYmx1ZVxcXCI+SGFuZ3VwPC9idXR0b24+XFxuXFxuXHQ8L2Rpdj5cXG5cdDxwPnN0YXR1czogPHNwYW4gYm4tdGV4dD1cXFwic3RhdHVzXFxcIj48L3NwYW4+PC9wPlxcblx0PHA+RGlzdGFudDogPHNwYW4gYm4tdGV4dD1cXFwiZGlzdGFudFxcXCI+PC9zcGFuPjwvcD5cXG5cXG48L2Rpdj5cIixcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIHJ0YywgYnJva2VyLCBwYXJhbXMpIHtcblxuXHRcdGxldCByZW1vdGVDbGllbnRJZFxuXG5cdFx0Y29uc3QgZGF0YSA9IHtcblx0XHRcdHN0YXR1czogJ3JlYWR5Jyxcblx0XHRcdGRpc3RhbnQ6ICcnXG5cdFx0fVxuXG5cdFx0aWYgKHBhcmFtcy5jYWxsZXIgIT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRkYXRhLnN0YXR1cyA9ICdjb25uZWN0ZWQnXG5cdFx0XHRkYXRhLmRpc3RhbnQgPSBwYXJhbXMuY2FsbGVyXG5cdFx0XHRyZW1vdGVDbGllbnRJZCA9IHBhcmFtcy5jbGllbnRJZFxuXHRcdH1cblxuXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhLFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uQ2FsbDogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHQkJC51aS5zaG93UHJvbXB0KHt0aXRsZTogJ0NhbGwnLCBjb250ZW50OiAnVXNlciBOYW1lOid9LCBmdW5jdGlvbih1c2VyTmFtZSl7XG5cdFx0XHRcdFx0XHRydGMuY2FsbCh1c2VyTmFtZSlcblx0XHRcdFx0XHRcdC50aGVuKCgpID0+IHtcblx0XHRcdFx0XHRcdFx0Y3RybC5zZXREYXRhKHtzdGF0dXM6ICdjYWxsaW5nJywgZGlzdGFudDogdXNlck5hbWV9KVxuXHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRcdC5jYXRjaCgoZSkgPT4ge1xuXHRcdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe3RpdGxlOiAnRXJyb3InLCBjb250ZW50OiBlLnJlc3BvbnNlVGV4dH0pXG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uQ2FuY2VsOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdHJ0Yy5jYW5jZWwoY3RybC5tb2RlbC5kaXN0YW50KVxuXHRcdFx0XHRcdC50aGVuKCgpID0+IHtcblx0XHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7c3RhdHVzOiAnY2FuY2VsZWQnLCBkaXN0YW50OiAnJ30pXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0XHQuY2F0Y2goKGUpID0+IHtcblx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7dGl0bGU6ICdFcnJvcicsIGNvbnRlbnQ6IGUucmVzcG9uc2VUZXh0fSlcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkhhbmd1cDogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRydGMuYnllKHJlbW90ZUNsaWVudElkKVxuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7c3RhdHVzOiAncmVhZHknLCBkaXN0YW50OiAnJ30pXG5cdFx0XHRcdFx0c3RvcCgpXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0Y29uc3QgcGNDb25maWcgPSB7XG5cdFx0ICAnaWNlU2VydmVycyc6IFt7XG5cdFx0ICAgICd1cmxzJzogJ3N0dW46c3R1bi5sLmdvb2dsZS5jb206MTkzMDInXG5cdFx0ICB9XVxuXHRcdH1cblx0XHRjb25zdCBsb2NhbFZpZGVvID0gY3RybC5zY29wZS5sb2NhbFZpZGVvLmdldCgwKVxuXHRcdGNvbnN0IHJlbW90ZVZpZGVvID0gY3RybC5zY29wZS5yZW1vdGVWaWRlby5nZXQoMClcblx0XHRsZXQgcGNcblx0XHRsZXQgbG9jYWxTdHJlYW1cblx0XHRsZXQgcmVtb3RlU3RyZWFtXG5cblx0XHRmdW5jdGlvbiBjcmVhdGVQZWVyQ29ubmVjdGlvbigpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdjcmVhdGVQZWVyQ29ubmVjdGlvbicpXG5cdFx0XHR0cnkge1xuXHRcdFx0ICBwYyA9IG5ldyBSVENQZWVyQ29ubmVjdGlvbihwY0NvbmZpZylcblxuXHRcdFx0ICBwYy5vbmljZWNhbmRpZGF0ZSA9IGZ1bmN0aW9uKGV2ZW50KSB7XG5cdFx0XHQgIFx0Ly9jb25zb2xlLmxvZygnb25pY2VjYW5kaWRhdGUnLCBldmVudClcblx0XHRcdCAgXHRpZiAoZXZlbnQuY2FuZGlkYXRlKSB7XG5cdFx0XHQgIFx0XHRydGMuY2FuZGlkYXRlKHJlbW90ZUNsaWVudElkLCB7XG5cdFx0XHQgIFx0XHRcdGxhYmVsOiBldmVudC5jYW5kaWRhdGUuc2RwTUxpbmVJbmRleCxcblx0XHRcdCAgXHRcdFx0aWQ6IGV2ZW50LmNhbmRpZGF0ZS5zZHBNaWQsXG5cdFx0XHQgIFx0XHRcdGNhbmRpZGF0ZTogZXZlbnQuY2FuZGlkYXRlLmNhbmRpZGF0ZVx0XHQgICAgXHRcdFx0XG5cdFx0XHQgIFx0XHR9KVxuXHRcdFx0ICBcdH1cblx0XHRcdCAgfVxuXHRcdFx0ICBwYy5vbmFkZHN0cmVhbSA9IGZ1bmN0aW9uKGV2ZW50KSB7XG5cdFx0XHQgIFx0Y29uc29sZS5sb2coJ29uYWRkc3RyZWFtJywgZXZlbnQpXG5cdFx0XHQgIFx0cmVtb3RlU3RyZWFtID0gZXZlbnQuc3RyZWFtXG5cdFx0XHQgIFx0cmVtb3RlVmlkZW8uc3JjT2JqZWN0ID0gcmVtb3RlU3RyZWFtXHRcdFx0ICBcdFxuXHRcdFx0ICB9XG5cdFx0XHQgIC8vcGMub25yZW1vdmVzdHJlYW0gPSBoYW5kbGVSZW1vdGVTdHJlYW1SZW1vdmVkXG5cdFx0XHQgIGNvbnNvbGUubG9nKCdDcmVhdGVkIFJUQ1BlZXJDb25ubmVjdGlvbicpXG5cdFx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHQgIGNvbnNvbGUubG9nKCdGYWlsZWQgdG8gY3JlYXRlIFBlZXJDb25uZWN0aW9uLCBleGNlcHRpb246ICcgKyBlLm1lc3NhZ2UpXG5cdFx0XHQgIGFsZXJ0KCdDYW5ub3QgY3JlYXRlIFJUQ1BlZXJDb25uZWN0aW9uIG9iamVjdC4nKVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHN0b3AoKSB7XG5cdFx0ICBwYy5jbG9zZSgpXG5cdFx0ICBwYyA9IG51bGxcdFx0ICBcblx0XHR9XHRcblx0XHRcdFxuXG5cdFx0bmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXRVc2VyTWVkaWEoe1xuXHRcdCAgYXVkaW86IHRydWUsXG5cdFx0ICB2aWRlbzoge1xuXHRcdCAgXHR3aWR0aDoge21heDogZWx0LndpZHRoKCkvIDJ9XG5cdFx0ICB9XG5cdFx0fSlcblx0XHQudGhlbihmdW5jdGlvbihzdHJlYW0pIHtcblx0XHRcdGNvbnNvbGUubG9nKCdsb2NhbFN0cmVhbSByZWFkeScpXG5cdFx0XHRsb2NhbFZpZGVvLnNyY09iamVjdCA9IHN0cmVhbVxuXHRcdFx0bG9jYWxTdHJlYW0gPSBzdHJlYW1cblxuXHRcdFx0aWYgKHBhcmFtcy5jYWxsZXIgIT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdHJ0Yy5hY2NlcHQocmVtb3RlQ2xpZW50SWQpXG5cdFx0XHRcdGNyZWF0ZVBlZXJDb25uZWN0aW9uKClcdFxuXHRcdFx0XHRwYy5hZGRTdHJlYW0obG9jYWxTdHJlYW0pXHRcdFx0XHRcblx0XHRcdH1cblx0XHR9KVxuXHRcdC5jYXRjaChmdW5jdGlvbihlKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnZXJyb3InLCBlKVxuXHRcdFx0aWYgKHJlbW90ZUNsaWVudElkICE9IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRydGMuZGVueShyZW1vdGVDbGllbnRJZClcblx0XHRcdH1cblx0XHRcdGN0cmwuc2V0RGF0YSh7ZGlzdGFudDogJycsIHN0YXR1czogJ2ZhaWxlZCd9KVxuXHRcdCAgXHQvL2FsZXJ0KCdnZXRVc2VyTWVkaWEoKSBlcnJvcjogJyArIGUubmFtZSk7XG5cblx0XHR9KVxuXG5cdFx0YnJva2VyLm9uVG9waWMoJ2JyZWl6Ym90LnJ0Yy5hY2NlcHQnLCBmdW5jdGlvbihtc2cpIHtcblx0XHRcdGlmIChtc2cuaGlzdCA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblx0XHRcdGNvbnNvbGUubG9nKCdtc2cnLCBtc2cpXG5cdFx0XHRydGMuY2FuY2VsKGN0cmwubW9kZWwuZGlzdGFudClcblx0XHRcdHJlbW90ZUNsaWVudElkID0gbXNnLnNyY0lkXG5cblx0XHRcdGN0cmwuc2V0RGF0YSh7c3RhdHVzOiAnY29ubmVjdGVkJ30pXG5cdFx0XHRjcmVhdGVQZWVyQ29ubmVjdGlvbigpXG5cdFx0XHRwYy5hZGRTdHJlYW0obG9jYWxTdHJlYW0pXG5cdFx0XHRwYy5jcmVhdGVPZmZlcigpLnRoZW4oKHNlc3Npb25EZXNjcmlwdGlvbikgPT4ge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnY3JlYXRlT2ZmZXInLCBzZXNzaW9uRGVzY3JpcHRpb24pXG5cdFx0XHRcdHBjLnNldExvY2FsRGVzY3JpcHRpb24oc2Vzc2lvbkRlc2NyaXB0aW9uKVxuXHRcdFx0XHRydGMub2ZmZXIocmVtb3RlQ2xpZW50SWQsIHNlc3Npb25EZXNjcmlwdGlvbilcblx0XHRcdH0pXG5cdFx0fSlcblxuXHRcdGJyb2tlci5vblRvcGljKCdicmVpemJvdC5ydGMuZGVueScsIGZ1bmN0aW9uKG1zZykge1xuXHRcdFx0aWYgKG1zZy5oaXN0ID09PSB0cnVlKSB7XG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXHRcdFx0Y29uc29sZS5sb2coJ21zZycsIG1zZylcblx0XHRcdGN0cmwuc2V0RGF0YSh7c3RhdHVzOiAncmVmdXNlZCd9KVxuXHRcdFx0cnRjLmNhbmNlbChjdHJsLm1vZGVsLmRpc3RhbnQpXG5cblx0XHR9KVxuXG5cdFx0YnJva2VyLm9uVG9waWMoJ2JyZWl6Ym90LnJ0Yy5jYW5kaWRhdGUnLCBmdW5jdGlvbihtc2cpIHtcblx0XHRcdGlmIChtc2cuaGlzdCA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblx0XHRcdGNvbnNvbGUubG9nKCdtc2cnLCBtc2cpXG5cdFx0XHRjb25zdCBtZXNzYWdlID0gbXNnLmRhdGFcblxuXHRcdCAgICBjb25zdCBjYW5kaWRhdGUgPSBuZXcgUlRDSWNlQ2FuZGlkYXRlKHtcblx0XHQgICAgICBzZHBNTGluZUluZGV4OiBtZXNzYWdlLmxhYmVsLFxuXHRcdCAgICAgIGNhbmRpZGF0ZTogbWVzc2FnZS5jYW5kaWRhdGVcblx0XHQgICAgfSlcblx0XHQgICAgcGMuYWRkSWNlQ2FuZGlkYXRlKGNhbmRpZGF0ZSlcdFx0XG5cdFx0fSlcdFx0XG5cblx0XHRicm9rZXIub25Ub3BpYygnYnJlaXpib3QucnRjLm9mZmVyJywgZnVuY3Rpb24obXNnKSB7XG5cdFx0XHRpZiAobXNnLmhpc3QgPT09IHRydWUpIHtcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cdFx0XHRjb25zb2xlLmxvZygnbXNnJywgbXNnKVxuXHRcdFx0cGMuc2V0UmVtb3RlRGVzY3JpcHRpb24obmV3IFJUQ1Nlc3Npb25EZXNjcmlwdGlvbihtc2cuZGF0YSkpXG5cdFx0XHRjb25zb2xlLmxvZygnU2VuZGluZyBhbnN3ZXIgdG8gcGVlci4nKVxuXHRcdFx0cGMuY3JlYXRlQW5zd2VyKCkudGhlbigoc2Vzc2lvbkRlc2NyaXB0aW9uKSA9PiB7XG5cdFx0XHRcdHBjLnNldExvY2FsRGVzY3JpcHRpb24oc2Vzc2lvbkRlc2NyaXB0aW9uKVxuXHRcdFx0XHRydGMuYW5zd2VyKHJlbW90ZUNsaWVudElkLCBzZXNzaW9uRGVzY3JpcHRpb24pXG5cblx0XHRcdH0pXG5cblx0XHR9KVx0XG5cblx0XHRicm9rZXIub25Ub3BpYygnYnJlaXpib3QucnRjLmFuc3dlcicsIGZ1bmN0aW9uKG1zZykge1xuXHRcdFx0aWYgKG1zZy5oaXN0ID09PSB0cnVlKSB7XG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXHRcdFx0Y29uc29sZS5sb2coJ21zZycsIG1zZylcblx0XHRcdHBjLnNldFJlbW90ZURlc2NyaXB0aW9uKG5ldyBSVENTZXNzaW9uRGVzY3JpcHRpb24obXNnLmRhdGEpKVxuXG5cdFx0fSlcdFxuXG5cdFx0YnJva2VyLm9uVG9waWMoJ2JyZWl6Ym90LnJ0Yy5ieWUnLCBmdW5jdGlvbihtc2cpIHtcblx0XHRcdGlmIChtc2cuaGlzdCA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblx0XHRcdGNvbnNvbGUubG9nKCdtc2cnLCBtc2cpXG5cdFx0XHRjdHJsLnNldERhdGEoe3N0YXR1czogJ2Rpc2Nvbm5lY3RlZCcsIGRpc3RhbnQ6ICcnfSlcblx0XHRcdHN0b3AoKVxuXG5cdFx0fSlcdFxuXG5cblx0XHR3aW5kb3cub25iZWZvcmV1bmxvYWQgPSBmdW5jdGlvbigpIHtcblx0XHRcdGlmIChwYyAhPSB1bmRlZmluZWQpIHtcblx0XHQgIFx0XHRydGMuYnllKHJlbW90ZUNsaWVudElkKVxuXHRcdFx0fVxuXHRcdH07XHRcdFxuXHRcblx0fVxuXG5cbn0pO1xuXG5cblxuXG4iXX0=
