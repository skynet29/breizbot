$$.control.registerControl('rootPage', {

	deps: ['breizbot.rtc', 'breizbot.broker', 'breizbot.params'],

	template: "<div style=\"margin: 10px;\">\n	\n	<div>\n	  <video bn-bind=\"localVideo\" autoplay muted playsinline></video>\n	  <video bn-bind=\"remoteVideo\" autoplay playsinline></video>\n	</div>\n\n	<div>\n		<button \n			bn-event=\"click: onCall\"\n			bn-show=\"[\'ready\', \'disconnected\', \'refused\', \'canceled\'].includes(status)\"\n			class=\"w3-btn w3-blue\">Call</button>\n\n		<button \n			bn-event=\"click: onCancel\"\n			bn-show=\"status == \'calling\'\"\n			class=\"w3-btn w3-blue\">Cancel</button>\n\n		<button \n			bn-event=\"click: onHangup\"\n			bn-show=\"status == \'connected\'\"\n			class=\"w3-btn w3-blue\">Hangup</button>\n\n	</div>\n	<p>status: <span bn-text=\"status\"></span></p>\n	<p>Distant: <span bn-text=\"distant\"></span></p>\n\n</div>",

	init: function(elt, rtc, broker, params) {

		const data = {
			status: 'ready',
			distant: ''
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
					rtc.bye()
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





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ3Jvb3RQYWdlJywge1xuXG5cdGRlcHM6IFsnYnJlaXpib3QucnRjJywgJ2JyZWl6Ym90LmJyb2tlcicsICdicmVpemJvdC5wYXJhbXMnXSxcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IHN0eWxlPVxcXCJtYXJnaW46IDEwcHg7XFxcIj5cXG5cdFxcblx0PGRpdj5cXG5cdCAgPHZpZGVvIGJuLWJpbmQ9XFxcImxvY2FsVmlkZW9cXFwiIGF1dG9wbGF5IG11dGVkIHBsYXlzaW5saW5lPjwvdmlkZW8+XFxuXHQgIDx2aWRlbyBibi1iaW5kPVxcXCJyZW1vdGVWaWRlb1xcXCIgYXV0b3BsYXkgcGxheXNpbmxpbmU+PC92aWRlbz5cXG5cdDwvZGl2Plxcblxcblx0PGRpdj5cXG5cdFx0PGJ1dHRvbiBcXG5cdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uQ2FsbFxcXCJcXG5cdFx0XHRibi1zaG93PVxcXCJbXFwncmVhZHlcXCcsIFxcJ2Rpc2Nvbm5lY3RlZFxcJywgXFwncmVmdXNlZFxcJywgXFwnY2FuY2VsZWRcXCddLmluY2x1ZGVzKHN0YXR1cylcXFwiXFxuXHRcdFx0Y2xhc3M9XFxcInczLWJ0biB3My1ibHVlXFxcIj5DYWxsPC9idXR0b24+XFxuXFxuXHRcdDxidXR0b24gXFxuXHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvbkNhbmNlbFxcXCJcXG5cdFx0XHRibi1zaG93PVxcXCJzdGF0dXMgPT0gXFwnY2FsbGluZ1xcJ1xcXCJcXG5cdFx0XHRjbGFzcz1cXFwidzMtYnRuIHczLWJsdWVcXFwiPkNhbmNlbDwvYnV0dG9uPlxcblxcblx0XHQ8YnV0dG9uIFxcblx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25IYW5ndXBcXFwiXFxuXHRcdFx0Ym4tc2hvdz1cXFwic3RhdHVzID09IFxcJ2Nvbm5lY3RlZFxcJ1xcXCJcXG5cdFx0XHRjbGFzcz1cXFwidzMtYnRuIHczLWJsdWVcXFwiPkhhbmd1cDwvYnV0dG9uPlxcblxcblx0PC9kaXY+XFxuXHQ8cD5zdGF0dXM6IDxzcGFuIGJuLXRleHQ9XFxcInN0YXR1c1xcXCI+PC9zcGFuPjwvcD5cXG5cdDxwPkRpc3RhbnQ6IDxzcGFuIGJuLXRleHQ9XFxcImRpc3RhbnRcXFwiPjwvc3Bhbj48L3A+XFxuXFxuPC9kaXY+XCIsXG5cblx0aW5pdDogZnVuY3Rpb24oZWx0LCBydGMsIGJyb2tlciwgcGFyYW1zKSB7XG5cblx0XHRjb25zdCBkYXRhID0ge1xuXHRcdFx0c3RhdHVzOiAncmVhZHknLFxuXHRcdFx0ZGlzdGFudDogJydcblx0XHR9XG5cblx0XHRpZiAocGFyYW1zLmNhbGxlciAhPSB1bmRlZmluZWQpIHtcblx0XHRcdGRhdGEuc3RhdHVzID0gJ2Nvbm5lY3RlZCdcblx0XHRcdGRhdGEuZGlzdGFudCA9IHBhcmFtcy5jYWxsZXJcblx0XHRcdHJ0Yy5zZXRSZW1vdGVDbGllbnRJZChwYXJhbXMuY2xpZW50SWQpXG5cdFx0fVxuXG5cblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGEsXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25DYWxsOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdCQkLnVpLnNob3dQcm9tcHQoe3RpdGxlOiAnQ2FsbCcsIGNvbnRlbnQ6ICdVc2VyIE5hbWU6J30sIGZ1bmN0aW9uKHVzZXJOYW1lKXtcblx0XHRcdFx0XHRcdHJ0Yy5jYWxsKHVzZXJOYW1lKVxuXHRcdFx0XHRcdFx0LnRoZW4oKCkgPT4ge1xuXHRcdFx0XHRcdFx0XHRjdHJsLnNldERhdGEoe3N0YXR1czogJ2NhbGxpbmcnLCBkaXN0YW50OiB1c2VyTmFtZX0pXG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0LmNhdGNoKChlKSA9PiB7XG5cdFx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7dGl0bGU6ICdFcnJvcicsIGNvbnRlbnQ6IGUucmVzcG9uc2VUZXh0fSlcblx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fSxcblx0XHRcdFx0b25DYW5jZWw6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0cnRjLmNhbmNlbChjdHJsLm1vZGVsLmRpc3RhbnQpXG5cdFx0XHRcdFx0LnRoZW4oKCkgPT4ge1xuXHRcdFx0XHRcdFx0Y3RybC5zZXREYXRhKHtzdGF0dXM6ICdjYW5jZWxlZCcsIGRpc3RhbnQ6ICcnfSlcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdC5jYXRjaCgoZSkgPT4ge1xuXHRcdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHt0aXRsZTogJ0Vycm9yJywgY29udGVudDogZS5yZXNwb25zZVRleHR9KVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uSGFuZ3VwOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdHJ0Yy5ieWUoKVxuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7c3RhdHVzOiAncmVhZHknLCBkaXN0YW50OiAnJ30pXG5cdFx0XHRcdFx0c3RvcCgpXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0Y29uc3QgcGNDb25maWcgPSB7XG5cdFx0ICAnaWNlU2VydmVycyc6IFt7XG5cdFx0ICAgICd1cmxzJzogJ3N0dW46c3R1bi5sLmdvb2dsZS5jb206MTkzMDInXG5cdFx0ICB9XVxuXHRcdH1cblx0XHRjb25zdCBsb2NhbFZpZGVvID0gY3RybC5zY29wZS5sb2NhbFZpZGVvLmdldCgwKVxuXHRcdGNvbnN0IHJlbW90ZVZpZGVvID0gY3RybC5zY29wZS5yZW1vdGVWaWRlby5nZXQoMClcblx0XHRsZXQgcGNcblx0XHRsZXQgbG9jYWxTdHJlYW1cblx0XHRsZXQgcmVtb3RlU3RyZWFtXG5cblx0XHRmdW5jdGlvbiBjcmVhdGVQZWVyQ29ubmVjdGlvbigpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdjcmVhdGVQZWVyQ29ubmVjdGlvbicpXG5cdFx0XHR0cnkge1xuXHRcdFx0ICBwYyA9IG5ldyBSVENQZWVyQ29ubmVjdGlvbihwY0NvbmZpZylcblxuXHRcdFx0ICBwYy5vbmljZWNhbmRpZGF0ZSA9IGZ1bmN0aW9uKGV2ZW50KSB7XG5cdFx0XHQgIFx0Ly9jb25zb2xlLmxvZygnb25pY2VjYW5kaWRhdGUnLCBldmVudClcblx0XHRcdCAgXHRpZiAoZXZlbnQuY2FuZGlkYXRlKSB7XG5cdFx0XHQgIFx0XHRydGMuY2FuZGlkYXRlKGV2ZW50LmNhbmRpZGF0ZSlcblx0XHRcdCAgXHR9XG5cdFx0XHQgIH1cblx0XHRcdCAgcGMub25hZGRzdHJlYW0gPSBmdW5jdGlvbihldmVudCkge1xuXHRcdFx0ICBcdGNvbnNvbGUubG9nKCdvbmFkZHN0cmVhbScsIGV2ZW50KVxuXHRcdFx0ICBcdHJlbW90ZVN0cmVhbSA9IGV2ZW50LnN0cmVhbVxuXHRcdFx0ICBcdHJlbW90ZVZpZGVvLnNyY09iamVjdCA9IHJlbW90ZVN0cmVhbVx0XHRcdCAgXHRcblx0XHRcdCAgfVxuXHRcdFx0ICAvL3BjLm9ucmVtb3Zlc3RyZWFtID0gaGFuZGxlUmVtb3RlU3RyZWFtUmVtb3ZlZFxuXHRcdFx0ICBjb25zb2xlLmxvZygnQ3JlYXRlZCBSVENQZWVyQ29ubm5lY3Rpb24nKVxuXHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0ICBjb25zb2xlLmxvZygnRmFpbGVkIHRvIGNyZWF0ZSBQZWVyQ29ubmVjdGlvbiwgZXhjZXB0aW9uOiAnICsgZS5tZXNzYWdlKVxuXHRcdFx0ICBhbGVydCgnQ2Fubm90IGNyZWF0ZSBSVENQZWVyQ29ubmVjdGlvbiBvYmplY3QuJylcblx0XHRcdH1cblx0XHR9XG5cblx0XHRmdW5jdGlvbiBzdG9wKCkge1xuXHRcdCAgcGMuY2xvc2UoKVxuXHRcdCAgcGMgPSBudWxsXHRcdCAgXG5cdFx0fVx0XG5cdFx0XHRcblxuXHRcdG5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhKHtcblx0XHQgIGF1ZGlvOiB0cnVlLFxuXHRcdCAgdmlkZW86IHtcblx0XHQgIFx0d2lkdGg6IHttYXg6IGVsdC53aWR0aCgpLyAyfVxuXHRcdCAgfVxuXHRcdH0pXG5cdFx0LnRoZW4oZnVuY3Rpb24oc3RyZWFtKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnbG9jYWxTdHJlYW0gcmVhZHknKVxuXHRcdFx0bG9jYWxWaWRlby5zcmNPYmplY3QgPSBzdHJlYW1cblx0XHRcdGxvY2FsU3RyZWFtID0gc3RyZWFtXG5cblx0XHRcdGlmIChwYXJhbXMuY2FsbGVyICE9IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRydGMuYWNjZXB0KClcblx0XHRcdFx0Y3JlYXRlUGVlckNvbm5lY3Rpb24oKVx0XG5cdFx0XHRcdHBjLmFkZFN0cmVhbShsb2NhbFN0cmVhbSlcdFx0XHRcdFxuXHRcdFx0fVxuXHRcdH0pXG5cdFx0LmNhdGNoKGZ1bmN0aW9uKGUpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdlcnJvcicsIGUpXG5cdFx0XHRpZiAocGFyYW1zLmNhbGxlciAhPSB1bmRlZmluZWQpIHtcblx0XHRcdFx0cnRjLmRlbnkoKVxuXHRcdFx0fVxuXHRcdFx0Y3RybC5zZXREYXRhKHtkaXN0YW50OiAnJywgc3RhdHVzOiAnZmFpbGVkJ30pXG5cdFx0ICBcdC8vYWxlcnQoJ2dldFVzZXJNZWRpYSgpIGVycm9yOiAnICsgZS5uYW1lKTtcblxuXHRcdH0pXG5cblx0XHRicm9rZXIub25Ub3BpYygnYnJlaXpib3QucnRjLmFjY2VwdCcsIGZ1bmN0aW9uKG1zZykge1xuXHRcdFx0aWYgKG1zZy5oaXN0ID09PSB0cnVlKSB7XG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXHRcdFx0Y29uc29sZS5sb2coJ21zZycsIG1zZylcblx0XHRcdHJ0Yy5jYW5jZWwoY3RybC5tb2RlbC5kaXN0YW50KVxuXHRcdFx0cnRjLnNldFJlbW90ZUNsaWVudElkKG1zZy5zcmNJZClcblxuXHRcdFx0Y3RybC5zZXREYXRhKHtzdGF0dXM6ICdjb25uZWN0ZWQnfSlcblx0XHRcdGNyZWF0ZVBlZXJDb25uZWN0aW9uKClcblx0XHRcdHBjLmFkZFN0cmVhbShsb2NhbFN0cmVhbSlcblx0XHRcdHBjLmNyZWF0ZU9mZmVyKCkudGhlbigoc2Vzc2lvbkRlc2NyaXB0aW9uKSA9PiB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdjcmVhdGVPZmZlcicsIHNlc3Npb25EZXNjcmlwdGlvbilcblx0XHRcdFx0cGMuc2V0TG9jYWxEZXNjcmlwdGlvbihzZXNzaW9uRGVzY3JpcHRpb24pXG5cdFx0XHRcdHJ0Yy5vZmZlcihzZXNzaW9uRGVzY3JpcHRpb24pXG5cdFx0XHR9KVxuXHRcdH0pXG5cblx0XHRicm9rZXIub25Ub3BpYygnYnJlaXpib3QucnRjLmRlbnknLCBmdW5jdGlvbihtc2cpIHtcblx0XHRcdGlmIChtc2cuaGlzdCA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblx0XHRcdGNvbnNvbGUubG9nKCdtc2cnLCBtc2cpXG5cdFx0XHRjdHJsLnNldERhdGEoe3N0YXR1czogJ3JlZnVzZWQnfSlcblx0XHRcdHJ0Yy5jYW5jZWwoY3RybC5tb2RlbC5kaXN0YW50KVxuXG5cdFx0fSlcblxuXHRcdGJyb2tlci5vblRvcGljKCdicmVpemJvdC5ydGMuY2FuZGlkYXRlJywgZnVuY3Rpb24obXNnKSB7XG5cdFx0XHRpZiAobXNnLmhpc3QgPT09IHRydWUpIHtcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cdFx0XHRjb25zb2xlLmxvZygnbXNnJywgbXNnKVxuXHRcdFx0Y29uc3Qge2xhYmVsLCBjYW5kaWRhdGV9ID0gbXNnLmRhdGFcblxuXHRcdCAgICBwYy5hZGRJY2VDYW5kaWRhdGUobmV3IFJUQ0ljZUNhbmRpZGF0ZSh7XG5cdFx0ICAgICAgc2RwTUxpbmVJbmRleDogbGFiZWwsXG5cdFx0ICAgICAgY2FuZGlkYXRlXG5cdFx0ICAgIH0pKVx0XHRcblx0XHR9KVx0XHRcblxuXHRcdGJyb2tlci5vblRvcGljKCdicmVpemJvdC5ydGMub2ZmZXInLCBmdW5jdGlvbihtc2cpIHtcblx0XHRcdGlmIChtc2cuaGlzdCA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblx0XHRcdGNvbnNvbGUubG9nKCdtc2cnLCBtc2cpXG5cdFx0XHRwYy5zZXRSZW1vdGVEZXNjcmlwdGlvbihuZXcgUlRDU2Vzc2lvbkRlc2NyaXB0aW9uKG1zZy5kYXRhKSlcblx0XHRcdGNvbnNvbGUubG9nKCdTZW5kaW5nIGFuc3dlciB0byBwZWVyLicpXG5cdFx0XHRwYy5jcmVhdGVBbnN3ZXIoKS50aGVuKChzZXNzaW9uRGVzY3JpcHRpb24pID0+IHtcblx0XHRcdFx0cGMuc2V0TG9jYWxEZXNjcmlwdGlvbihzZXNzaW9uRGVzY3JpcHRpb24pXG5cdFx0XHRcdHJ0Yy5hbnN3ZXIoc2Vzc2lvbkRlc2NyaXB0aW9uKVxuXG5cdFx0XHR9KVxuXG5cdFx0fSlcdFxuXG5cdFx0YnJva2VyLm9uVG9waWMoJ2JyZWl6Ym90LnJ0Yy5hbnN3ZXInLCBmdW5jdGlvbihtc2cpIHtcblx0XHRcdGlmIChtc2cuaGlzdCA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblx0XHRcdGNvbnNvbGUubG9nKCdtc2cnLCBtc2cpXG5cdFx0XHRwYy5zZXRSZW1vdGVEZXNjcmlwdGlvbihuZXcgUlRDU2Vzc2lvbkRlc2NyaXB0aW9uKG1zZy5kYXRhKSlcblxuXHRcdH0pXHRcblxuXHRcdGJyb2tlci5vblRvcGljKCdicmVpemJvdC5ydGMuYnllJywgZnVuY3Rpb24obXNnKSB7XG5cdFx0XHRpZiAobXNnLmhpc3QgPT09IHRydWUpIHtcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cdFx0XHRjb25zb2xlLmxvZygnbXNnJywgbXNnKVxuXHRcdFx0Y3RybC5zZXREYXRhKHtzdGF0dXM6ICdkaXNjb25uZWN0ZWQnLCBkaXN0YW50OiAnJ30pXG5cdFx0XHRzdG9wKClcblxuXHRcdH0pXHRcblxuXG5cdFx0d2luZG93Lm9uYmVmb3JldW5sb2FkID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRpZiAocGMgIT0gdW5kZWZpbmVkKSB7XG5cdFx0ICBcdFx0cnRjLmJ5ZSgpXG5cdFx0XHR9XG5cdFx0fTtcdFx0XG5cdFxuXHR9XG5cblxufSk7XG5cblxuXG5cbiJdfQ==
