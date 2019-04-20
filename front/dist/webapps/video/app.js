$$.control.registerControl('friendsPage', {

	template: "<div bn-control=\"breizbot.friends\" \n	data-show-selection=\"true\"\n	bn-event=\"friendclick: onFriendSelect\"\n	bn-iface=\"friends\"\n	></div>",

	props: {
		$pager: null
	},

	init: function(elt) {

		const {$pager} = this.props

		const ctrl = $$.viewController(elt, {
			events: {
				onFriendSelect: function(ev, data) {
					//console.log('onFriendSelect', data)
				}
			}
		})

		this.onAction = function(cmd) {
			console.log('onAction', cmd)
			const userName = ctrl.scope.friends.getSelection()
			console.log('userName', userName)
			$pager.popPage(userName)
		}
	}

})
$$.control.registerControl('rootPage', {

	props: {
		$pager: null
	},

	deps: ['breizbot.rtc', 'breizbot.broker', 'breizbot.params'],

	template: "\n\n<div class=\"toolbar\">\n\n		<div>\n			<p>status: <span bn-text=\"status\"></span></p>\n			<p>Distant: <span bn-text=\"distant\"></span></p>						\n<!-- 			<p>Video Size: <span bn-text=\"videoSize\"></span></p>						\n -->		</div>		\n\n		<div>\n			<button \n				title=\"Call a friend\" \n				bn-event=\"click: onCall\"\n				bn-show=\"[\'ready\', \'disconnected\', \'refused\', \'canceled\'].includes(status)\"\n				class=\"w3-btn w3-green\"><i class=\"fa fa-phone\"></i></button>\n\n			<button \n				bn-event=\"click: onCancel\"\n				bn-show=\"status == \'calling\'\"\n				class=\"w3-btn w3-blue\">Cancel</button>\n\n			<button \n				title=\"Hangup\" \n				bn-event=\"click: onHangup\"\n				bn-show=\"status == \'connected\'\"\n				class=\"w3-btn w3-red\"><i class=\"fa fa-phone-slash\"></i></button>			\n		</div>\n\n\n</div>\n\n	\n\n<div class=\"video\">\n\n	  <video bn-bind=\"localVideo\" autoplay muted playsinline bn-class=\"{reduced: status == \'connected\'}\"></video>\n	  <video bn-bind=\"remoteVideo\" autoplay playsinline bn-show=\"status == \'connected\'\"></video>	\n</div>		\n\n\n\n",

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
					// $$.ui.showPrompt({title: 'Call', content: 'User Name:'}, function(userName){
					// 	rtc.call(userName)
					// 	.then(() => {
					// 		ctrl.setData({status: 'calling', distant: userName})
					// 	})
					// 	.catch((e) => {
					// 		$$.ui.showAlert({title: 'Error', content: e.responseText})
					// 	})
					// })
					$pager.pushPage('friendsPage', {
						title: 'Select a friend',
						buttons: [{name: 'call', label: 'Call'}]
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
		  video: {
		  	// width: {max: elt.width()/ 2},
		  	height: {max: elt.find('.video').height()/ 2}
		  	//height: {max: 120}
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





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZyaWVuZHMuanMiLCJtYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2ZyaWVuZHNQYWdlJywge1xuXG5cdHRlbXBsYXRlOiBcIjxkaXYgYm4tY29udHJvbD1cXFwiYnJlaXpib3QuZnJpZW5kc1xcXCIgXFxuXHRkYXRhLXNob3ctc2VsZWN0aW9uPVxcXCJ0cnVlXFxcIlxcblx0Ym4tZXZlbnQ9XFxcImZyaWVuZGNsaWNrOiBvbkZyaWVuZFNlbGVjdFxcXCJcXG5cdGJuLWlmYWNlPVxcXCJmcmllbmRzXFxcIlxcblx0PjwvZGl2PlwiLFxuXG5cdHByb3BzOiB7XG5cdFx0JHBhZ2VyOiBudWxsXG5cdH0sXG5cblx0aW5pdDogZnVuY3Rpb24oZWx0KSB7XG5cblx0XHRjb25zdCB7JHBhZ2VyfSA9IHRoaXMucHJvcHNcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvbkZyaWVuZFNlbGVjdDogZnVuY3Rpb24oZXYsIGRhdGEpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbkZyaWVuZFNlbGVjdCcsIGRhdGEpXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0dGhpcy5vbkFjdGlvbiA9IGZ1bmN0aW9uKGNtZCkge1xuXHRcdFx0Y29uc29sZS5sb2coJ29uQWN0aW9uJywgY21kKVxuXHRcdFx0Y29uc3QgdXNlck5hbWUgPSBjdHJsLnNjb3BlLmZyaWVuZHMuZ2V0U2VsZWN0aW9uKClcblx0XHRcdGNvbnNvbGUubG9nKCd1c2VyTmFtZScsIHVzZXJOYW1lKVxuXHRcdFx0JHBhZ2VyLnBvcFBhZ2UodXNlck5hbWUpXG5cdFx0fVxuXHR9XG5cbn0pIiwiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ3Jvb3RQYWdlJywge1xuXG5cdHByb3BzOiB7XG5cdFx0JHBhZ2VyOiBudWxsXG5cdH0sXG5cblx0ZGVwczogWydicmVpemJvdC5ydGMnLCAnYnJlaXpib3QuYnJva2VyJywgJ2JyZWl6Ym90LnBhcmFtcyddLFxuXG5cdHRlbXBsYXRlOiBcIlxcblxcbjxkaXYgY2xhc3M9XFxcInRvb2xiYXJcXFwiPlxcblxcblx0XHQ8ZGl2Plxcblx0XHRcdDxwPnN0YXR1czogPHNwYW4gYm4tdGV4dD1cXFwic3RhdHVzXFxcIj48L3NwYW4+PC9wPlxcblx0XHRcdDxwPkRpc3RhbnQ6IDxzcGFuIGJuLXRleHQ9XFxcImRpc3RhbnRcXFwiPjwvc3Bhbj48L3A+XHRcdFx0XHRcdFx0XFxuPCEtLSBcdFx0XHQ8cD5WaWRlbyBTaXplOiA8c3BhbiBibi10ZXh0PVxcXCJ2aWRlb1NpemVcXFwiPjwvc3Bhbj48L3A+XHRcdFx0XHRcdFx0XFxuIC0tPlx0XHQ8L2Rpdj5cdFx0XFxuXFxuXHRcdDxkaXY+XFxuXHRcdFx0PGJ1dHRvbiBcXG5cdFx0XHRcdHRpdGxlPVxcXCJDYWxsIGEgZnJpZW5kXFxcIiBcXG5cdFx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25DYWxsXFxcIlxcblx0XHRcdFx0Ym4tc2hvdz1cXFwiW1xcJ3JlYWR5XFwnLCBcXCdkaXNjb25uZWN0ZWRcXCcsIFxcJ3JlZnVzZWRcXCcsIFxcJ2NhbmNlbGVkXFwnXS5pbmNsdWRlcyhzdGF0dXMpXFxcIlxcblx0XHRcdFx0Y2xhc3M9XFxcInczLWJ0biB3My1ncmVlblxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXBob25lXFxcIj48L2k+PC9idXR0b24+XFxuXFxuXHRcdFx0PGJ1dHRvbiBcXG5cdFx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25DYW5jZWxcXFwiXFxuXHRcdFx0XHRibi1zaG93PVxcXCJzdGF0dXMgPT0gXFwnY2FsbGluZ1xcJ1xcXCJcXG5cdFx0XHRcdGNsYXNzPVxcXCJ3My1idG4gdzMtYmx1ZVxcXCI+Q2FuY2VsPC9idXR0b24+XFxuXFxuXHRcdFx0PGJ1dHRvbiBcXG5cdFx0XHRcdHRpdGxlPVxcXCJIYW5ndXBcXFwiIFxcblx0XHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvbkhhbmd1cFxcXCJcXG5cdFx0XHRcdGJuLXNob3c9XFxcInN0YXR1cyA9PSBcXCdjb25uZWN0ZWRcXCdcXFwiXFxuXHRcdFx0XHRjbGFzcz1cXFwidzMtYnRuIHczLXJlZFxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXBob25lLXNsYXNoXFxcIj48L2k+PC9idXR0b24+XHRcdFx0XFxuXHRcdDwvZGl2PlxcblxcblxcbjwvZGl2Plxcblxcblx0XFxuXFxuPGRpdiBjbGFzcz1cXFwidmlkZW9cXFwiPlxcblxcblx0ICA8dmlkZW8gYm4tYmluZD1cXFwibG9jYWxWaWRlb1xcXCIgYXV0b3BsYXkgbXV0ZWQgcGxheXNpbmxpbmUgYm4tY2xhc3M9XFxcIntyZWR1Y2VkOiBzdGF0dXMgPT0gXFwnY29ubmVjdGVkXFwnfVxcXCI+PC92aWRlbz5cXG5cdCAgPHZpZGVvIGJuLWJpbmQ9XFxcInJlbW90ZVZpZGVvXFxcIiBhdXRvcGxheSBwbGF5c2lubGluZSBibi1zaG93PVxcXCJzdGF0dXMgPT0gXFwnY29ubmVjdGVkXFwnXFxcIj48L3ZpZGVvPlx0XFxuPC9kaXY+XHRcdFxcblxcblxcblxcblwiLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgcnRjLCBicm9rZXIsIHBhcmFtcykge1xuXG5cdFx0Y29uc3QgeyRwYWdlcn0gPSB0aGlzLnByb3BzXG5cblx0XHRjb25zdCBkYXRhID0ge1xuXHRcdFx0c3RhdHVzOiAncmVhZHknLFxuXHRcdFx0ZGlzdGFudDogJycsXG5cdFx0XHR2aWRlb1NpemU6ICcnXG5cdFx0fVxuXG5cdFx0aWYgKHBhcmFtcy5jYWxsZXIgIT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRkYXRhLnN0YXR1cyA9ICdjb25uZWN0ZWQnXG5cdFx0XHRkYXRhLmRpc3RhbnQgPSBwYXJhbXMuY2FsbGVyXG5cdFx0XHRydGMuc2V0UmVtb3RlQ2xpZW50SWQocGFyYW1zLmNsaWVudElkKVxuXHRcdH1cblxuXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhLFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uQ2FsbDogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25DYWxsJylcblx0XHRcdFx0XHQvLyAkJC51aS5zaG93UHJvbXB0KHt0aXRsZTogJ0NhbGwnLCBjb250ZW50OiAnVXNlciBOYW1lOid9LCBmdW5jdGlvbih1c2VyTmFtZSl7XG5cdFx0XHRcdFx0Ly8gXHRydGMuY2FsbCh1c2VyTmFtZSlcblx0XHRcdFx0XHQvLyBcdC50aGVuKCgpID0+IHtcblx0XHRcdFx0XHQvLyBcdFx0Y3RybC5zZXREYXRhKHtzdGF0dXM6ICdjYWxsaW5nJywgZGlzdGFudDogdXNlck5hbWV9KVxuXHRcdFx0XHRcdC8vIFx0fSlcblx0XHRcdFx0XHQvLyBcdC5jYXRjaCgoZSkgPT4ge1xuXHRcdFx0XHRcdC8vIFx0XHQkJC51aS5zaG93QWxlcnQoe3RpdGxlOiAnRXJyb3InLCBjb250ZW50OiBlLnJlc3BvbnNlVGV4dH0pXG5cdFx0XHRcdFx0Ly8gXHR9KVxuXHRcdFx0XHRcdC8vIH0pXG5cdFx0XHRcdFx0JHBhZ2VyLnB1c2hQYWdlKCdmcmllbmRzUGFnZScsIHtcblx0XHRcdFx0XHRcdHRpdGxlOiAnU2VsZWN0IGEgZnJpZW5kJyxcblx0XHRcdFx0XHRcdGJ1dHRvbnM6IFt7bmFtZTogJ2NhbGwnLCBsYWJlbDogJ0NhbGwnfV1cblx0XHRcdFx0XHR9KVxuXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uQ2FuY2VsOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdHJ0Yy5jYW5jZWwoY3RybC5tb2RlbC5kaXN0YW50KVxuXHRcdFx0XHRcdC50aGVuKCgpID0+IHtcblx0XHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7c3RhdHVzOiAnY2FuY2VsZWQnLCBkaXN0YW50OiAnJ30pXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0XHQuY2F0Y2goKGUpID0+IHtcblx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7dGl0bGU6ICdFcnJvcicsIGNvbnRlbnQ6IGUucmVzcG9uc2VUZXh0fSlcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkhhbmd1cDogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRydGMuYnllKClcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoe3N0YXR1czogJ3JlYWR5JywgZGlzdGFudDogJyd9KVxuXHRcdFx0XHRcdHN0b3AoKVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdHRoaXMub25SZXR1cm4gPSBmdW5jdGlvbih1c2VyTmFtZSkge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnb25SZXR1cm4nLCB1c2VyTmFtZSlcblx0XHRcdHJ0Yy5jYWxsKHVzZXJOYW1lKVxuXHRcdFx0LnRoZW4oKCkgPT4ge1xuXHRcdFx0XHRjdHJsLnNldERhdGEoe3N0YXR1czogJ2NhbGxpbmcnLCBkaXN0YW50OiB1c2VyTmFtZX0pXG5cdFx0XHR9KVxuXHRcdFx0LmNhdGNoKChlKSA9PiB7XG5cdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7dGl0bGU6ICdFcnJvcicsIGNvbnRlbnQ6IGUucmVzcG9uc2VUZXh0fSlcblx0XHRcdH0pXG5cdFx0fVxuXG5cdFx0Y29uc3QgcGNDb25maWcgPSB7XG5cdFx0ICAnaWNlU2VydmVycyc6IFt7XG5cdFx0ICAgICd1cmxzJzogJ3N0dW46c3R1bi5sLmdvb2dsZS5jb206MTkzMDInXG5cdFx0ICB9XVxuXHRcdH1cblxuXHRcdGNvbnN0IGxvY2FsVmlkZW8gPSBjdHJsLnNjb3BlLmxvY2FsVmlkZW8ub24oJ2NhbnBsYXknLCBmdW5jdGlvbigpe1xuXHRcdFx0Y29uc29sZS5sb2coJ2NhbnBsYXknLCB0aGlzLnZpZGVvSGVpZ2h0LCB0aGlzLnZpZGVvV2lkdGgpXG5cdFx0XHRjdHJsLnNldERhdGEoe3ZpZGVvU2l6ZTogdGhpcy52aWRlb1dpZHRoICsgJ3gnICsgdGhpcy52aWRlb0hlaWdodH0pXG5cdFx0fSkuZ2V0KDApXG5cblx0XHRjb25zdCByZW1vdGVWaWRlbyA9IGN0cmwuc2NvcGUucmVtb3RlVmlkZW8uZ2V0KDApXG5cdFx0bGV0IHBjXG5cdFx0bGV0IGxvY2FsU3RyZWFtXG5cdFx0bGV0IHJlbW90ZVN0cmVhbVxuXG5cdFx0ZnVuY3Rpb24gY3JlYXRlUGVlckNvbm5lY3Rpb24oKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnY3JlYXRlUGVlckNvbm5lY3Rpb24nKVxuXHRcdFx0dHJ5IHtcblx0XHRcdCAgcGMgPSBuZXcgUlRDUGVlckNvbm5lY3Rpb24ocGNDb25maWcpXG5cblx0XHRcdCAgcGMub25pY2VjYW5kaWRhdGUgPSBmdW5jdGlvbihldmVudCkge1xuXHRcdFx0ICBcdC8vY29uc29sZS5sb2coJ29uaWNlY2FuZGlkYXRlJywgZXZlbnQpXG5cdFx0XHQgIFx0aWYgKGV2ZW50LmNhbmRpZGF0ZSkge1xuXHRcdFx0ICBcdFx0cnRjLmNhbmRpZGF0ZShldmVudC5jYW5kaWRhdGUpXG5cdFx0XHQgIFx0fVxuXHRcdFx0ICB9XG5cdFx0XHQgIHBjLm9uYWRkc3RyZWFtID0gZnVuY3Rpb24oZXZlbnQpIHtcblx0XHRcdCAgXHRjb25zb2xlLmxvZygnb25hZGRzdHJlYW0nLCBldmVudClcblx0XHRcdCAgXHRyZW1vdGVTdHJlYW0gPSBldmVudC5zdHJlYW1cblx0XHRcdCAgXHRyZW1vdGVWaWRlby5zcmNPYmplY3QgPSByZW1vdGVTdHJlYW1cdFx0XHQgIFx0XG5cdFx0XHQgIH1cblx0XHRcdCAgLy9wYy5vbnJlbW92ZXN0cmVhbSA9IGhhbmRsZVJlbW90ZVN0cmVhbVJlbW92ZWRcblx0XHRcdCAgY29uc29sZS5sb2coJ0NyZWF0ZWQgUlRDUGVlckNvbm5uZWN0aW9uJylcblx0XHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdCAgY29uc29sZS5sb2coJ0ZhaWxlZCB0byBjcmVhdGUgUGVlckNvbm5lY3Rpb24sIGV4Y2VwdGlvbjogJyArIGUubWVzc2FnZSlcblx0XHRcdCAgYWxlcnQoJ0Nhbm5vdCBjcmVhdGUgUlRDUGVlckNvbm5lY3Rpb24gb2JqZWN0LicpXG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gc3RvcCgpIHtcblx0XHQgIHBjLmNsb3NlKClcblx0XHQgIHBjID0gbnVsbFx0XHQgIFxuXHRcdH1cdFxuXHRcdFx0XG5cdFx0Y29uc29sZS5sb2coJ2hlaWdodCcsIGVsdC5maW5kKCcudmlkZW8nKS5oZWlnaHQoKSlcblxuXHRcdG5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhKHtcblx0XHQgIGF1ZGlvOiB0cnVlLFxuXHRcdCAgdmlkZW86IHtcblx0XHQgIFx0Ly8gd2lkdGg6IHttYXg6IGVsdC53aWR0aCgpLyAyfSxcblx0XHQgIFx0aGVpZ2h0OiB7bWF4OiBlbHQuZmluZCgnLnZpZGVvJykuaGVpZ2h0KCkvIDJ9XG5cdFx0ICBcdC8vaGVpZ2h0OiB7bWF4OiAxMjB9XG5cdFx0ICB9XG5cdFx0fSlcblx0XHQudGhlbihmdW5jdGlvbihzdHJlYW0pIHtcblx0XHRcdGNvbnNvbGUubG9nKCdsb2NhbFN0cmVhbSByZWFkeScpXG5cdFx0XHRcblx0XHRcdGxvY2FsVmlkZW8uc3JjT2JqZWN0ID0gc3RyZWFtXG5cdFx0XHRsb2NhbFN0cmVhbSA9IHN0cmVhbVxuXG5cdFx0XHRpZiAocGFyYW1zLmNhbGxlciAhPSB1bmRlZmluZWQpIHtcblx0XHRcdFx0cnRjLmFjY2VwdCgpXG5cdFx0XHRcdGNyZWF0ZVBlZXJDb25uZWN0aW9uKClcdFxuXHRcdFx0XHRwYy5hZGRTdHJlYW0obG9jYWxTdHJlYW0pXHRcdFx0XHRcblx0XHRcdH1cblx0XHR9KVxuXHRcdC5jYXRjaChmdW5jdGlvbihlKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnZXJyb3InLCBlKVxuXHRcdFx0aWYgKHBhcmFtcy5jYWxsZXIgIT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdHJ0Yy5kZW55KClcblx0XHRcdH1cblx0XHRcdGN0cmwuc2V0RGF0YSh7ZGlzdGFudDogJycsIHN0YXR1czogJ2ZhaWxlZCd9KVxuXHRcdCAgXHQvL2FsZXJ0KCdnZXRVc2VyTWVkaWEoKSBlcnJvcjogJyArIGUubmFtZSk7XG5cblx0XHR9KVxuXG5cdFx0YnJva2VyLm9uVG9waWMoJ2JyZWl6Ym90LnJ0Yy5hY2NlcHQnLCBmdW5jdGlvbihtc2cpIHtcblx0XHRcdGlmIChtc2cuaGlzdCA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblx0XHRcdGNvbnNvbGUubG9nKCdtc2cnLCBtc2cpXG5cdFx0XHRydGMuY2FuY2VsKGN0cmwubW9kZWwuZGlzdGFudClcblx0XHRcdHJ0Yy5zZXRSZW1vdGVDbGllbnRJZChtc2cuc3JjSWQpXG5cblx0XHRcdGN0cmwuc2V0RGF0YSh7c3RhdHVzOiAnY29ubmVjdGVkJ30pXG5cdFx0XHRjcmVhdGVQZWVyQ29ubmVjdGlvbigpXG5cdFx0XHRwYy5hZGRTdHJlYW0obG9jYWxTdHJlYW0pXG5cdFx0XHRwYy5jcmVhdGVPZmZlcigpLnRoZW4oKHNlc3Npb25EZXNjcmlwdGlvbikgPT4ge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnY3JlYXRlT2ZmZXInLCBzZXNzaW9uRGVzY3JpcHRpb24pXG5cdFx0XHRcdHBjLnNldExvY2FsRGVzY3JpcHRpb24oc2Vzc2lvbkRlc2NyaXB0aW9uKVxuXHRcdFx0XHRydGMub2ZmZXIoc2Vzc2lvbkRlc2NyaXB0aW9uKVxuXHRcdFx0fSlcblx0XHR9KVxuXG5cdFx0YnJva2VyLm9uVG9waWMoJ2JyZWl6Ym90LnJ0Yy5kZW55JywgZnVuY3Rpb24obXNnKSB7XG5cdFx0XHRpZiAobXNnLmhpc3QgPT09IHRydWUpIHtcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cdFx0XHRjb25zb2xlLmxvZygnbXNnJywgbXNnKVxuXHRcdFx0Y3RybC5zZXREYXRhKHtzdGF0dXM6ICdyZWZ1c2VkJ30pXG5cdFx0XHRydGMuY2FuY2VsKGN0cmwubW9kZWwuZGlzdGFudClcblxuXHRcdH0pXG5cblx0XHRicm9rZXIub25Ub3BpYygnYnJlaXpib3QucnRjLmNhbmRpZGF0ZScsIGZ1bmN0aW9uKG1zZykge1xuXHRcdFx0aWYgKG1zZy5oaXN0ID09PSB0cnVlKSB7XG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXHRcdFx0Y29uc29sZS5sb2coJ21zZycsIG1zZylcblx0XHRcdGNvbnN0IHtsYWJlbCwgY2FuZGlkYXRlfSA9IG1zZy5kYXRhXG5cblx0XHQgICAgcGMuYWRkSWNlQ2FuZGlkYXRlKG5ldyBSVENJY2VDYW5kaWRhdGUoe1xuXHRcdCAgICAgIHNkcE1MaW5lSW5kZXg6IGxhYmVsLFxuXHRcdCAgICAgIGNhbmRpZGF0ZVxuXHRcdCAgICB9KSlcdFx0XG5cdFx0fSlcdFx0XG5cblx0XHRicm9rZXIub25Ub3BpYygnYnJlaXpib3QucnRjLm9mZmVyJywgZnVuY3Rpb24obXNnKSB7XG5cdFx0XHRpZiAobXNnLmhpc3QgPT09IHRydWUpIHtcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cdFx0XHRjb25zb2xlLmxvZygnbXNnJywgbXNnKVxuXHRcdFx0cGMuc2V0UmVtb3RlRGVzY3JpcHRpb24obmV3IFJUQ1Nlc3Npb25EZXNjcmlwdGlvbihtc2cuZGF0YSkpXG5cdFx0XHRjb25zb2xlLmxvZygnU2VuZGluZyBhbnN3ZXIgdG8gcGVlci4nKVxuXHRcdFx0cGMuY3JlYXRlQW5zd2VyKCkudGhlbigoc2Vzc2lvbkRlc2NyaXB0aW9uKSA9PiB7XG5cdFx0XHRcdHBjLnNldExvY2FsRGVzY3JpcHRpb24oc2Vzc2lvbkRlc2NyaXB0aW9uKVxuXHRcdFx0XHRydGMuYW5zd2VyKHNlc3Npb25EZXNjcmlwdGlvbilcblxuXHRcdFx0fSlcblxuXHRcdH0pXHRcblxuXHRcdGJyb2tlci5vblRvcGljKCdicmVpemJvdC5ydGMuYW5zd2VyJywgZnVuY3Rpb24obXNnKSB7XG5cdFx0XHRpZiAobXNnLmhpc3QgPT09IHRydWUpIHtcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cdFx0XHRjb25zb2xlLmxvZygnbXNnJywgbXNnKVxuXHRcdFx0cGMuc2V0UmVtb3RlRGVzY3JpcHRpb24obmV3IFJUQ1Nlc3Npb25EZXNjcmlwdGlvbihtc2cuZGF0YSkpXG5cblx0XHR9KVx0XG5cblx0XHRicm9rZXIub25Ub3BpYygnYnJlaXpib3QucnRjLmJ5ZScsIGZ1bmN0aW9uKG1zZykge1xuXHRcdFx0aWYgKG1zZy5oaXN0ID09PSB0cnVlKSB7XG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXHRcdFx0Y29uc29sZS5sb2coJ21zZycsIG1zZylcblx0XHRcdGN0cmwuc2V0RGF0YSh7c3RhdHVzOiAnZGlzY29ubmVjdGVkJywgZGlzdGFudDogJyd9KVxuXHRcdFx0c3RvcCgpXG5cblx0XHR9KVx0XG5cblxuXHRcdHdpbmRvdy5vbmJlZm9yZXVubG9hZCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0aWYgKHBjICE9IHVuZGVmaW5lZCkge1xuXHRcdCAgXHRcdHJ0Yy5ieWUoKVxuXHRcdFx0fVxuXHRcdH07XHRcdFxuXHRcblx0fVxuXG5cbn0pO1xuXG5cblxuXG4iXX0=
