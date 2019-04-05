$$.control.registerControl('rootPage', {

	deps: ['breizbot.rtc', 'breizbot.broker', 'breizbot.params'],

	template: "<div style=\"margin: 10px;\">\n	\n	<div>\n	  <video bn-bind=\"localVideo\" autoplay muted playsinline></video>\n	  <video bn-bind=\"remoteVideo\" autoplay playsinline></video>\n	</div>\n\n	<div>\n		<button \n			bn-event=\"click: onCall\"\n			bn-show=\"[\'ready\', \'disconnected\', \'refused\', \'canceled\'].includes(status)\"\n			class=\"w3-btn w3-blue\">Call</button>\n\n		<button \n			bn-event=\"click: onCancel\"\n			bn-show=\"status == \'calling\'\"\n			class=\"w3-btn w3-blue\">Cancel</button>\n\n		<button \n			bn-event=\"click: onHangup\"\n			bn-show=\"status == \'connected\'\"\n			class=\"w3-btn w3-blue\">Hangup</button>\n\n	</div>\n	<p>status: <span bn-text=\"status\"></span></p>\n	<p>Distant: <span bn-text=\"distant\"></span></p>\n\n</div>",

	init: function(elt, rtc, broker, params) {

		const data = {
			status: 'ready',
			distant: ''
		}

		if (params.caller != undefined) {
			data.status = 'connected',
			data.distant = params.caller
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
					rtc.bye(ctrl.model.distant)
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
			  		rtc.candidate(ctrl.model.distant, {
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
				rtc.accept(params.caller)
				createPeerConnection()	
				pc.addStream(localStream)				
			}
		})
		.catch(function(e) {
			console.log('error', e)
		  	alert('getUserMedia() error: ' + e.name);

		})

		broker.register('breizbot.rtc.accept', function(msg) {
			if (msg.hist === true) {
				return
			}
			console.log('msg', msg)
			ctrl.setData({status: 'connected'})
			createPeerConnection()
			pc.addStream(localStream)
			pc.createOffer().then((sessionDescription) => {
				console.log('createOffer', sessionDescription)
				pc.setLocalDescription(sessionDescription)
				rtc.offer(ctrl.model.distant, sessionDescription)
			})
		})

		broker.register('breizbot.rtc.deny', function(msg) {
			if (msg.hist === true) {
				return
			}
			console.log('msg', msg)
			ctrl.setData({status: 'refused'})

		})

		broker.register('breizbot.rtc.candidate', function(msg) {
			if (msg.hist === true) {
				return
			}
			console.log('msg', msg)
			const message = msg.data.data

		    const candidate = new RTCIceCandidate({
		      sdpMLineIndex: message.label,
		      candidate: message.candidate
		    })
		    pc.addIceCandidate(candidate)		
		})		

		broker.register('breizbot.rtc.offer', function(msg) {
			if (msg.hist === true) {
				return
			}
			console.log('msg', msg)
			pc.setRemoteDescription(new RTCSessionDescription(msg.data.data))
			console.log('Sending answer to peer.')
			pc.createAnswer().then((sessionDescription) => {
				pc.setLocalDescription(sessionDescription);
				rtc.answer(params.caller, sessionDescription);

			})

		})	

		broker.register('breizbot.rtc.answer', function(msg) {
			if (msg.hist === true) {
				return
			}
			console.log('msg', msg)
			pc.setRemoteDescription(new RTCSessionDescription(msg.data.data))

		})	

		broker.register('breizbot.rtc.bye', function(msg) {
			if (msg.hist === true) {
				return
			}
			console.log('msg', msg)
			ctrl.setData({status: 'disconnected', distant: ''})
			stop()

		})	

		broker.on('ready', () => {
			console.log('onready')

		})

		window.onbeforeunload = function() {
		  rtc.bye(ctrl.model.distant)
		};		
	
	}


});





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImFwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdyb290UGFnZScsIHtcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LnJ0YycsICdicmVpemJvdC5icm9rZXInLCAnYnJlaXpib3QucGFyYW1zJ10sXG5cblx0dGVtcGxhdGU6IFwiPGRpdiBzdHlsZT1cXFwibWFyZ2luOiAxMHB4O1xcXCI+XFxuXHRcXG5cdDxkaXY+XFxuXHQgIDx2aWRlbyBibi1iaW5kPVxcXCJsb2NhbFZpZGVvXFxcIiBhdXRvcGxheSBtdXRlZCBwbGF5c2lubGluZT48L3ZpZGVvPlxcblx0ICA8dmlkZW8gYm4tYmluZD1cXFwicmVtb3RlVmlkZW9cXFwiIGF1dG9wbGF5IHBsYXlzaW5saW5lPjwvdmlkZW8+XFxuXHQ8L2Rpdj5cXG5cXG5cdDxkaXY+XFxuXHRcdDxidXR0b24gXFxuXHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvbkNhbGxcXFwiXFxuXHRcdFx0Ym4tc2hvdz1cXFwiW1xcJ3JlYWR5XFwnLCBcXCdkaXNjb25uZWN0ZWRcXCcsIFxcJ3JlZnVzZWRcXCcsIFxcJ2NhbmNlbGVkXFwnXS5pbmNsdWRlcyhzdGF0dXMpXFxcIlxcblx0XHRcdGNsYXNzPVxcXCJ3My1idG4gdzMtYmx1ZVxcXCI+Q2FsbDwvYnV0dG9uPlxcblxcblx0XHQ8YnV0dG9uIFxcblx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25DYW5jZWxcXFwiXFxuXHRcdFx0Ym4tc2hvdz1cXFwic3RhdHVzID09IFxcJ2NhbGxpbmdcXCdcXFwiXFxuXHRcdFx0Y2xhc3M9XFxcInczLWJ0biB3My1ibHVlXFxcIj5DYW5jZWw8L2J1dHRvbj5cXG5cXG5cdFx0PGJ1dHRvbiBcXG5cdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uSGFuZ3VwXFxcIlxcblx0XHRcdGJuLXNob3c9XFxcInN0YXR1cyA9PSBcXCdjb25uZWN0ZWRcXCdcXFwiXFxuXHRcdFx0Y2xhc3M9XFxcInczLWJ0biB3My1ibHVlXFxcIj5IYW5ndXA8L2J1dHRvbj5cXG5cXG5cdDwvZGl2Plxcblx0PHA+c3RhdHVzOiA8c3BhbiBibi10ZXh0PVxcXCJzdGF0dXNcXFwiPjwvc3Bhbj48L3A+XFxuXHQ8cD5EaXN0YW50OiA8c3BhbiBibi10ZXh0PVxcXCJkaXN0YW50XFxcIj48L3NwYW4+PC9wPlxcblxcbjwvZGl2PlwiLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgcnRjLCBicm9rZXIsIHBhcmFtcykge1xuXG5cdFx0Y29uc3QgZGF0YSA9IHtcblx0XHRcdHN0YXR1czogJ3JlYWR5Jyxcblx0XHRcdGRpc3RhbnQ6ICcnXG5cdFx0fVxuXG5cdFx0aWYgKHBhcmFtcy5jYWxsZXIgIT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRkYXRhLnN0YXR1cyA9ICdjb25uZWN0ZWQnLFxuXHRcdFx0ZGF0YS5kaXN0YW50ID0gcGFyYW1zLmNhbGxlclxuXHRcdH1cblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGEsXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25DYWxsOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdCQkLnVpLnNob3dQcm9tcHQoe3RpdGxlOiAnQ2FsbCcsIGNvbnRlbnQ6ICdVc2VyIE5hbWU6J30sIGZ1bmN0aW9uKHVzZXJOYW1lKXtcblx0XHRcdFx0XHRcdHJ0Yy5jYWxsKHVzZXJOYW1lKVxuXHRcdFx0XHRcdFx0LnRoZW4oKCkgPT4ge1xuXHRcdFx0XHRcdFx0XHRjdHJsLnNldERhdGEoe3N0YXR1czogJ2NhbGxpbmcnLCBkaXN0YW50OiB1c2VyTmFtZX0pXG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0LmNhdGNoKChlKSA9PiB7XG5cdFx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7dGl0bGU6ICdFcnJvcicsIGNvbnRlbnQ6IGUucmVzcG9uc2VUZXh0fSlcblx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fSxcblx0XHRcdFx0b25DYW5jZWw6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0cnRjLmNhbmNlbChjdHJsLm1vZGVsLmRpc3RhbnQpXG5cdFx0XHRcdFx0LnRoZW4oKCkgPT4ge1xuXHRcdFx0XHRcdFx0Y3RybC5zZXREYXRhKHtzdGF0dXM6ICdjYW5jZWxlZCcsIGRpc3RhbnQ6ICcnfSlcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdC5jYXRjaCgoZSkgPT4ge1xuXHRcdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHt0aXRsZTogJ0Vycm9yJywgY29udGVudDogZS5yZXNwb25zZVRleHR9KVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uSGFuZ3VwOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdHJ0Yy5ieWUoY3RybC5tb2RlbC5kaXN0YW50KVxuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7c3RhdHVzOiAncmVhZHknLCBkaXN0YW50OiAnJ30pXG5cdFx0XHRcdFx0c3RvcCgpXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0Y29uc3QgcGNDb25maWcgPSB7XG5cdFx0ICAnaWNlU2VydmVycyc6IFt7XG5cdFx0ICAgICd1cmxzJzogJ3N0dW46c3R1bi5sLmdvb2dsZS5jb206MTkzMDInXG5cdFx0ICB9XVxuXHRcdH1cblx0XHRjb25zdCBsb2NhbFZpZGVvID0gY3RybC5zY29wZS5sb2NhbFZpZGVvLmdldCgwKVxuXHRcdGNvbnN0IHJlbW90ZVZpZGVvID0gY3RybC5zY29wZS5yZW1vdGVWaWRlby5nZXQoMClcblx0XHRsZXQgcGNcblx0XHRsZXQgbG9jYWxTdHJlYW1cblx0XHRsZXQgcmVtb3RlU3RyZWFtXG5cblx0XHRmdW5jdGlvbiBjcmVhdGVQZWVyQ29ubmVjdGlvbigpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdjcmVhdGVQZWVyQ29ubmVjdGlvbicpXG5cdFx0XHR0cnkge1xuXHRcdFx0ICBwYyA9IG5ldyBSVENQZWVyQ29ubmVjdGlvbihwY0NvbmZpZylcblxuXHRcdFx0ICBwYy5vbmljZWNhbmRpZGF0ZSA9IGZ1bmN0aW9uKGV2ZW50KSB7XG5cdFx0XHQgIFx0Ly9jb25zb2xlLmxvZygnb25pY2VjYW5kaWRhdGUnLCBldmVudClcblx0XHRcdCAgXHRpZiAoZXZlbnQuY2FuZGlkYXRlKSB7XG5cdFx0XHQgIFx0XHRydGMuY2FuZGlkYXRlKGN0cmwubW9kZWwuZGlzdGFudCwge1xuXHRcdFx0ICBcdFx0XHRsYWJlbDogZXZlbnQuY2FuZGlkYXRlLnNkcE1MaW5lSW5kZXgsXG5cdFx0XHQgIFx0XHRcdGlkOiBldmVudC5jYW5kaWRhdGUuc2RwTWlkLFxuXHRcdFx0ICBcdFx0XHRjYW5kaWRhdGU6IGV2ZW50LmNhbmRpZGF0ZS5jYW5kaWRhdGVcdFx0ICAgIFx0XHRcdFxuXHRcdFx0ICBcdFx0fSlcblx0XHRcdCAgXHR9XG5cdFx0XHQgIH1cblx0XHRcdCAgcGMub25hZGRzdHJlYW0gPSBmdW5jdGlvbihldmVudCkge1xuXHRcdFx0ICBcdGNvbnNvbGUubG9nKCdvbmFkZHN0cmVhbScsIGV2ZW50KVxuXHRcdFx0ICBcdHJlbW90ZVN0cmVhbSA9IGV2ZW50LnN0cmVhbVxuXHRcdFx0ICBcdHJlbW90ZVZpZGVvLnNyY09iamVjdCA9IHJlbW90ZVN0cmVhbVx0XHRcdCAgXHRcblx0XHRcdCAgfVxuXHRcdFx0ICAvL3BjLm9ucmVtb3Zlc3RyZWFtID0gaGFuZGxlUmVtb3RlU3RyZWFtUmVtb3ZlZFxuXHRcdFx0ICBjb25zb2xlLmxvZygnQ3JlYXRlZCBSVENQZWVyQ29ubm5lY3Rpb24nKVxuXHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0ICBjb25zb2xlLmxvZygnRmFpbGVkIHRvIGNyZWF0ZSBQZWVyQ29ubmVjdGlvbiwgZXhjZXB0aW9uOiAnICsgZS5tZXNzYWdlKVxuXHRcdFx0ICBhbGVydCgnQ2Fubm90IGNyZWF0ZSBSVENQZWVyQ29ubmVjdGlvbiBvYmplY3QuJylcblx0XHRcdH1cblx0XHR9XG5cblx0XHRmdW5jdGlvbiBzdG9wKCkge1xuXHRcdCAgcGMuY2xvc2UoKVxuXHRcdCAgcGMgPSBudWxsXHRcdCAgXG5cdFx0fVx0XG5cdFx0XHRcblxuXHRcdG5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhKHtcblx0XHQgIGF1ZGlvOiB0cnVlLFxuXHRcdCAgdmlkZW86IHtcblx0XHQgIFx0d2lkdGg6IHttYXg6IGVsdC53aWR0aCgpLyAyfVxuXHRcdCAgfVxuXHRcdH0pXG5cdFx0LnRoZW4oZnVuY3Rpb24oc3RyZWFtKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnbG9jYWxTdHJlYW0gcmVhZHknKVxuXHRcdFx0bG9jYWxWaWRlby5zcmNPYmplY3QgPSBzdHJlYW1cblx0XHRcdGxvY2FsU3RyZWFtID0gc3RyZWFtXG5cblx0XHRcdGlmIChwYXJhbXMuY2FsbGVyICE9IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRydGMuYWNjZXB0KHBhcmFtcy5jYWxsZXIpXG5cdFx0XHRcdGNyZWF0ZVBlZXJDb25uZWN0aW9uKClcdFxuXHRcdFx0XHRwYy5hZGRTdHJlYW0obG9jYWxTdHJlYW0pXHRcdFx0XHRcblx0XHRcdH1cblx0XHR9KVxuXHRcdC5jYXRjaChmdW5jdGlvbihlKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnZXJyb3InLCBlKVxuXHRcdCAgXHRhbGVydCgnZ2V0VXNlck1lZGlhKCkgZXJyb3I6ICcgKyBlLm5hbWUpO1xuXG5cdFx0fSlcblxuXHRcdGJyb2tlci5yZWdpc3RlcignYnJlaXpib3QucnRjLmFjY2VwdCcsIGZ1bmN0aW9uKG1zZykge1xuXHRcdFx0aWYgKG1zZy5oaXN0ID09PSB0cnVlKSB7XG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXHRcdFx0Y29uc29sZS5sb2coJ21zZycsIG1zZylcblx0XHRcdGN0cmwuc2V0RGF0YSh7c3RhdHVzOiAnY29ubmVjdGVkJ30pXG5cdFx0XHRjcmVhdGVQZWVyQ29ubmVjdGlvbigpXG5cdFx0XHRwYy5hZGRTdHJlYW0obG9jYWxTdHJlYW0pXG5cdFx0XHRwYy5jcmVhdGVPZmZlcigpLnRoZW4oKHNlc3Npb25EZXNjcmlwdGlvbikgPT4ge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnY3JlYXRlT2ZmZXInLCBzZXNzaW9uRGVzY3JpcHRpb24pXG5cdFx0XHRcdHBjLnNldExvY2FsRGVzY3JpcHRpb24oc2Vzc2lvbkRlc2NyaXB0aW9uKVxuXHRcdFx0XHRydGMub2ZmZXIoY3RybC5tb2RlbC5kaXN0YW50LCBzZXNzaW9uRGVzY3JpcHRpb24pXG5cdFx0XHR9KVxuXHRcdH0pXG5cblx0XHRicm9rZXIucmVnaXN0ZXIoJ2JyZWl6Ym90LnJ0Yy5kZW55JywgZnVuY3Rpb24obXNnKSB7XG5cdFx0XHRpZiAobXNnLmhpc3QgPT09IHRydWUpIHtcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cdFx0XHRjb25zb2xlLmxvZygnbXNnJywgbXNnKVxuXHRcdFx0Y3RybC5zZXREYXRhKHtzdGF0dXM6ICdyZWZ1c2VkJ30pXG5cblx0XHR9KVxuXG5cdFx0YnJva2VyLnJlZ2lzdGVyKCdicmVpemJvdC5ydGMuY2FuZGlkYXRlJywgZnVuY3Rpb24obXNnKSB7XG5cdFx0XHRpZiAobXNnLmhpc3QgPT09IHRydWUpIHtcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cdFx0XHRjb25zb2xlLmxvZygnbXNnJywgbXNnKVxuXHRcdFx0Y29uc3QgbWVzc2FnZSA9IG1zZy5kYXRhLmRhdGFcblxuXHRcdCAgICBjb25zdCBjYW5kaWRhdGUgPSBuZXcgUlRDSWNlQ2FuZGlkYXRlKHtcblx0XHQgICAgICBzZHBNTGluZUluZGV4OiBtZXNzYWdlLmxhYmVsLFxuXHRcdCAgICAgIGNhbmRpZGF0ZTogbWVzc2FnZS5jYW5kaWRhdGVcblx0XHQgICAgfSlcblx0XHQgICAgcGMuYWRkSWNlQ2FuZGlkYXRlKGNhbmRpZGF0ZSlcdFx0XG5cdFx0fSlcdFx0XG5cblx0XHRicm9rZXIucmVnaXN0ZXIoJ2JyZWl6Ym90LnJ0Yy5vZmZlcicsIGZ1bmN0aW9uKG1zZykge1xuXHRcdFx0aWYgKG1zZy5oaXN0ID09PSB0cnVlKSB7XG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXHRcdFx0Y29uc29sZS5sb2coJ21zZycsIG1zZylcblx0XHRcdHBjLnNldFJlbW90ZURlc2NyaXB0aW9uKG5ldyBSVENTZXNzaW9uRGVzY3JpcHRpb24obXNnLmRhdGEuZGF0YSkpXG5cdFx0XHRjb25zb2xlLmxvZygnU2VuZGluZyBhbnN3ZXIgdG8gcGVlci4nKVxuXHRcdFx0cGMuY3JlYXRlQW5zd2VyKCkudGhlbigoc2Vzc2lvbkRlc2NyaXB0aW9uKSA9PiB7XG5cdFx0XHRcdHBjLnNldExvY2FsRGVzY3JpcHRpb24oc2Vzc2lvbkRlc2NyaXB0aW9uKTtcblx0XHRcdFx0cnRjLmFuc3dlcihwYXJhbXMuY2FsbGVyLCBzZXNzaW9uRGVzY3JpcHRpb24pO1xuXG5cdFx0XHR9KVxuXG5cdFx0fSlcdFxuXG5cdFx0YnJva2VyLnJlZ2lzdGVyKCdicmVpemJvdC5ydGMuYW5zd2VyJywgZnVuY3Rpb24obXNnKSB7XG5cdFx0XHRpZiAobXNnLmhpc3QgPT09IHRydWUpIHtcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cdFx0XHRjb25zb2xlLmxvZygnbXNnJywgbXNnKVxuXHRcdFx0cGMuc2V0UmVtb3RlRGVzY3JpcHRpb24obmV3IFJUQ1Nlc3Npb25EZXNjcmlwdGlvbihtc2cuZGF0YS5kYXRhKSlcblxuXHRcdH0pXHRcblxuXHRcdGJyb2tlci5yZWdpc3RlcignYnJlaXpib3QucnRjLmJ5ZScsIGZ1bmN0aW9uKG1zZykge1xuXHRcdFx0aWYgKG1zZy5oaXN0ID09PSB0cnVlKSB7XG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXHRcdFx0Y29uc29sZS5sb2coJ21zZycsIG1zZylcblx0XHRcdGN0cmwuc2V0RGF0YSh7c3RhdHVzOiAnZGlzY29ubmVjdGVkJywgZGlzdGFudDogJyd9KVxuXHRcdFx0c3RvcCgpXG5cblx0XHR9KVx0XG5cblx0XHRicm9rZXIub24oJ3JlYWR5JywgKCkgPT4ge1xuXHRcdFx0Y29uc29sZS5sb2coJ29ucmVhZHknKVxuXG5cdFx0fSlcblxuXHRcdHdpbmRvdy5vbmJlZm9yZXVubG9hZCA9IGZ1bmN0aW9uKCkge1xuXHRcdCAgcnRjLmJ5ZShjdHJsLm1vZGVsLmRpc3RhbnQpXG5cdFx0fTtcdFx0XG5cdFxuXHR9XG5cblxufSk7XG5cblxuXG5cbiJdfQ==
