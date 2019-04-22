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
			const {friendUserName, isConnected} = ctrl.scope.friends.getSelection()
			console.log('userName', friendUserName)
			if (!isConnected) {
				$$.ui.showAlert({
					title: 'Error', 
					content: `User <strong>${friendUserName}</strong> is not connected`
				})
			}
			else {
				$pager.popPage(friendUserName)
			}
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





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZyaWVuZHMuanMiLCJtYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImFwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdmcmllbmRzUGFnZScsIHtcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGJuLWNvbnRyb2w9XFxcImJyZWl6Ym90LmZyaWVuZHNcXFwiIFxcblx0ZGF0YS1zaG93LXNlbGVjdGlvbj1cXFwidHJ1ZVxcXCJcXG5cdGJuLWV2ZW50PVxcXCJmcmllbmRjbGljazogb25GcmllbmRTZWxlY3RcXFwiXFxuXHRibi1pZmFjZT1cXFwiZnJpZW5kc1xcXCJcXG5cdD48L2Rpdj5cIixcblxuXHRwcm9wczoge1xuXHRcdCRwYWdlcjogbnVsbFxuXHR9LFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCkge1xuXG5cdFx0Y29uc3QgeyRwYWdlcn0gPSB0aGlzLnByb3BzXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25GcmllbmRTZWxlY3Q6IGZ1bmN0aW9uKGV2LCBkYXRhKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25GcmllbmRTZWxlY3QnLCBkYXRhKVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdHRoaXMub25BY3Rpb24gPSBmdW5jdGlvbihjbWQpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdvbkFjdGlvbicsIGNtZClcblx0XHRcdGNvbnN0IHtmcmllbmRVc2VyTmFtZSwgaXNDb25uZWN0ZWR9ID0gY3RybC5zY29wZS5mcmllbmRzLmdldFNlbGVjdGlvbigpXG5cdFx0XHRjb25zb2xlLmxvZygndXNlck5hbWUnLCBmcmllbmRVc2VyTmFtZSlcblx0XHRcdGlmICghaXNDb25uZWN0ZWQpIHtcblx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHtcblx0XHRcdFx0XHR0aXRsZTogJ0Vycm9yJywgXG5cdFx0XHRcdFx0Y29udGVudDogYFVzZXIgPHN0cm9uZz4ke2ZyaWVuZFVzZXJOYW1lfTwvc3Ryb25nPiBpcyBub3QgY29ubmVjdGVkYFxuXHRcdFx0XHR9KVxuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdCRwYWdlci5wb3BQYWdlKGZyaWVuZFVzZXJOYW1lKVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG59KSIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdyb290UGFnZScsIHtcblxuXHRwcm9wczoge1xuXHRcdCRwYWdlcjogbnVsbFxuXHR9LFxuXG5cdGRlcHM6IFsnYnJlaXpib3QucnRjJywgJ2JyZWl6Ym90LmJyb2tlcicsICdicmVpemJvdC5wYXJhbXMnXSxcblxuXHR0ZW1wbGF0ZTogXCJcXG5cXG48ZGl2IGNsYXNzPVxcXCJ0b29sYmFyXFxcIj5cXG5cXG5cdFx0PGRpdj5cXG5cdFx0XHQ8cD5zdGF0dXM6IDxzcGFuIGJuLXRleHQ9XFxcInN0YXR1c1xcXCI+PC9zcGFuPjwvcD5cXG5cdFx0XHQ8cD5EaXN0YW50OiA8c3BhbiBibi10ZXh0PVxcXCJkaXN0YW50XFxcIj48L3NwYW4+PC9wPlx0XHRcdFx0XHRcdFxcbjwhLS0gXHRcdFx0PHA+VmlkZW8gU2l6ZTogPHNwYW4gYm4tdGV4dD1cXFwidmlkZW9TaXplXFxcIj48L3NwYW4+PC9wPlx0XHRcdFx0XHRcdFxcbiAtLT5cdFx0PC9kaXY+XHRcdFxcblxcblx0XHQ8ZGl2Plxcblx0XHRcdDxidXR0b24gXFxuXHRcdFx0XHR0aXRsZT1cXFwiQ2FsbCBhIGZyaWVuZFxcXCIgXFxuXHRcdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uQ2FsbFxcXCJcXG5cdFx0XHRcdGJuLXNob3c9XFxcIltcXCdyZWFkeVxcJywgXFwnZGlzY29ubmVjdGVkXFwnLCBcXCdyZWZ1c2VkXFwnLCBcXCdjYW5jZWxlZFxcJ10uaW5jbHVkZXMoc3RhdHVzKVxcXCJcXG5cdFx0XHRcdGNsYXNzPVxcXCJ3My1idG4gdzMtZ3JlZW5cXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1waG9uZVxcXCI+PC9pPjwvYnV0dG9uPlxcblxcblx0XHRcdDxidXR0b24gXFxuXHRcdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uQ2FuY2VsXFxcIlxcblx0XHRcdFx0Ym4tc2hvdz1cXFwic3RhdHVzID09IFxcJ2NhbGxpbmdcXCdcXFwiXFxuXHRcdFx0XHRjbGFzcz1cXFwidzMtYnRuIHczLWJsdWVcXFwiPkNhbmNlbDwvYnV0dG9uPlxcblxcblx0XHRcdDxidXR0b24gXFxuXHRcdFx0XHR0aXRsZT1cXFwiSGFuZ3VwXFxcIiBcXG5cdFx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25IYW5ndXBcXFwiXFxuXHRcdFx0XHRibi1zaG93PVxcXCJzdGF0dXMgPT0gXFwnY29ubmVjdGVkXFwnXFxcIlxcblx0XHRcdFx0Y2xhc3M9XFxcInczLWJ0biB3My1yZWRcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1waG9uZS1zbGFzaFxcXCI+PC9pPjwvYnV0dG9uPlx0XHRcdFxcblx0XHQ8L2Rpdj5cXG5cXG5cXG48L2Rpdj5cXG5cXG5cdFxcblxcbjxkaXYgY2xhc3M9XFxcInZpZGVvXFxcIj5cXG5cXG5cdCAgPHZpZGVvIGJuLWJpbmQ9XFxcImxvY2FsVmlkZW9cXFwiIGF1dG9wbGF5IG11dGVkIHBsYXlzaW5saW5lIGJuLWNsYXNzPVxcXCJ7cmVkdWNlZDogc3RhdHVzID09IFxcJ2Nvbm5lY3RlZFxcJ31cXFwiPjwvdmlkZW8+XFxuXHQgIDx2aWRlbyBibi1iaW5kPVxcXCJyZW1vdGVWaWRlb1xcXCIgYXV0b3BsYXkgcGxheXNpbmxpbmUgYm4tc2hvdz1cXFwic3RhdHVzID09IFxcJ2Nvbm5lY3RlZFxcJ1xcXCI+PC92aWRlbz5cdFxcbjwvZGl2Plx0XHRcXG5cXG5cXG5cXG5cIixcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIHJ0YywgYnJva2VyLCBwYXJhbXMpIHtcblxuXHRcdGNvbnN0IHskcGFnZXJ9ID0gdGhpcy5wcm9wc1xuXG5cdFx0Y29uc3QgZGF0YSA9IHtcblx0XHRcdHN0YXR1czogJ3JlYWR5Jyxcblx0XHRcdGRpc3RhbnQ6ICcnLFxuXHRcdFx0dmlkZW9TaXplOiAnJ1xuXHRcdH1cblxuXHRcdGlmIChwYXJhbXMuY2FsbGVyICE9IHVuZGVmaW5lZCkge1xuXHRcdFx0ZGF0YS5zdGF0dXMgPSAnY29ubmVjdGVkJ1xuXHRcdFx0ZGF0YS5kaXN0YW50ID0gcGFyYW1zLmNhbGxlclxuXHRcdFx0cnRjLnNldFJlbW90ZUNsaWVudElkKHBhcmFtcy5jbGllbnRJZClcblx0XHR9XG5cblxuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvbkNhbGw6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uQ2FsbCcpXG5cdFx0XHRcdFx0Ly8gJCQudWkuc2hvd1Byb21wdCh7dGl0bGU6ICdDYWxsJywgY29udGVudDogJ1VzZXIgTmFtZTonfSwgZnVuY3Rpb24odXNlck5hbWUpe1xuXHRcdFx0XHRcdC8vIFx0cnRjLmNhbGwodXNlck5hbWUpXG5cdFx0XHRcdFx0Ly8gXHQudGhlbigoKSA9PiB7XG5cdFx0XHRcdFx0Ly8gXHRcdGN0cmwuc2V0RGF0YSh7c3RhdHVzOiAnY2FsbGluZycsIGRpc3RhbnQ6IHVzZXJOYW1lfSlcblx0XHRcdFx0XHQvLyBcdH0pXG5cdFx0XHRcdFx0Ly8gXHQuY2F0Y2goKGUpID0+IHtcblx0XHRcdFx0XHQvLyBcdFx0JCQudWkuc2hvd0FsZXJ0KHt0aXRsZTogJ0Vycm9yJywgY29udGVudDogZS5yZXNwb25zZVRleHR9KVxuXHRcdFx0XHRcdC8vIFx0fSlcblx0XHRcdFx0XHQvLyB9KVxuXHRcdFx0XHRcdCRwYWdlci5wdXNoUGFnZSgnZnJpZW5kc1BhZ2UnLCB7XG5cdFx0XHRcdFx0XHR0aXRsZTogJ1NlbGVjdCBhIGZyaWVuZCcsXG5cdFx0XHRcdFx0XHRidXR0b25zOiBbe25hbWU6ICdjYWxsJywgbGFiZWw6ICdDYWxsJ31dXG5cdFx0XHRcdFx0fSlcblxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkNhbmNlbDogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRydGMuY2FuY2VsKGN0cmwubW9kZWwuZGlzdGFudClcblx0XHRcdFx0XHQudGhlbigoKSA9PiB7XG5cdFx0XHRcdFx0XHRjdHJsLnNldERhdGEoe3N0YXR1czogJ2NhbmNlbGVkJywgZGlzdGFudDogJyd9KVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0LmNhdGNoKChlKSA9PiB7XG5cdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe3RpdGxlOiAnRXJyb3InLCBjb250ZW50OiBlLnJlc3BvbnNlVGV4dH0pXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fSxcblx0XHRcdFx0b25IYW5ndXA6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0cnRjLmJ5ZSgpXG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHtzdGF0dXM6ICdyZWFkeScsIGRpc3RhbnQ6ICcnfSlcblx0XHRcdFx0XHRzdG9wKClcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHR0aGlzLm9uUmV0dXJuID0gZnVuY3Rpb24odXNlck5hbWUpIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ29uUmV0dXJuJywgdXNlck5hbWUpXG5cdFx0XHRydGMuY2FsbCh1c2VyTmFtZSlcblx0XHRcdC50aGVuKCgpID0+IHtcblx0XHRcdFx0Y3RybC5zZXREYXRhKHtzdGF0dXM6ICdjYWxsaW5nJywgZGlzdGFudDogdXNlck5hbWV9KVxuXHRcdFx0fSlcblx0XHRcdC5jYXRjaCgoZSkgPT4ge1xuXHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe3RpdGxlOiAnRXJyb3InLCBjb250ZW50OiBlLnJlc3BvbnNlVGV4dH0pXG5cdFx0XHR9KVxuXHRcdH1cblxuXHRcdGNvbnN0IHBjQ29uZmlnID0ge1xuXHRcdCAgJ2ljZVNlcnZlcnMnOiBbe1xuXHRcdCAgICAndXJscyc6ICdzdHVuOnN0dW4ubC5nb29nbGUuY29tOjE5MzAyJ1xuXHRcdCAgfV1cblx0XHR9XG5cblx0XHRjb25zdCBsb2NhbFZpZGVvID0gY3RybC5zY29wZS5sb2NhbFZpZGVvLm9uKCdjYW5wbGF5JywgZnVuY3Rpb24oKXtcblx0XHRcdGNvbnNvbGUubG9nKCdjYW5wbGF5JywgdGhpcy52aWRlb0hlaWdodCwgdGhpcy52aWRlb1dpZHRoKVxuXHRcdFx0Y3RybC5zZXREYXRhKHt2aWRlb1NpemU6IHRoaXMudmlkZW9XaWR0aCArICd4JyArIHRoaXMudmlkZW9IZWlnaHR9KVxuXHRcdH0pLmdldCgwKVxuXG5cdFx0Y29uc3QgcmVtb3RlVmlkZW8gPSBjdHJsLnNjb3BlLnJlbW90ZVZpZGVvLmdldCgwKVxuXHRcdGxldCBwY1xuXHRcdGxldCBsb2NhbFN0cmVhbVxuXHRcdGxldCByZW1vdGVTdHJlYW1cblxuXHRcdGZ1bmN0aW9uIGNyZWF0ZVBlZXJDb25uZWN0aW9uKCkge1xuXHRcdFx0Y29uc29sZS5sb2coJ2NyZWF0ZVBlZXJDb25uZWN0aW9uJylcblx0XHRcdHRyeSB7XG5cdFx0XHQgIHBjID0gbmV3IFJUQ1BlZXJDb25uZWN0aW9uKHBjQ29uZmlnKVxuXG5cdFx0XHQgIHBjLm9uaWNlY2FuZGlkYXRlID0gZnVuY3Rpb24oZXZlbnQpIHtcblx0XHRcdCAgXHQvL2NvbnNvbGUubG9nKCdvbmljZWNhbmRpZGF0ZScsIGV2ZW50KVxuXHRcdFx0ICBcdGlmIChldmVudC5jYW5kaWRhdGUpIHtcblx0XHRcdCAgXHRcdHJ0Yy5jYW5kaWRhdGUoZXZlbnQuY2FuZGlkYXRlKVxuXHRcdFx0ICBcdH1cblx0XHRcdCAgfVxuXHRcdFx0ICBwYy5vbmFkZHN0cmVhbSA9IGZ1bmN0aW9uKGV2ZW50KSB7XG5cdFx0XHQgIFx0Y29uc29sZS5sb2coJ29uYWRkc3RyZWFtJywgZXZlbnQpXG5cdFx0XHQgIFx0cmVtb3RlU3RyZWFtID0gZXZlbnQuc3RyZWFtXG5cdFx0XHQgIFx0cmVtb3RlVmlkZW8uc3JjT2JqZWN0ID0gcmVtb3RlU3RyZWFtXHRcdFx0ICBcdFxuXHRcdFx0ICB9XG5cdFx0XHQgIC8vcGMub25yZW1vdmVzdHJlYW0gPSBoYW5kbGVSZW1vdGVTdHJlYW1SZW1vdmVkXG5cdFx0XHQgIGNvbnNvbGUubG9nKCdDcmVhdGVkIFJUQ1BlZXJDb25ubmVjdGlvbicpXG5cdFx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHQgIGNvbnNvbGUubG9nKCdGYWlsZWQgdG8gY3JlYXRlIFBlZXJDb25uZWN0aW9uLCBleGNlcHRpb246ICcgKyBlLm1lc3NhZ2UpXG5cdFx0XHQgIGFsZXJ0KCdDYW5ub3QgY3JlYXRlIFJUQ1BlZXJDb25uZWN0aW9uIG9iamVjdC4nKVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHN0b3AoKSB7XG5cdFx0ICBwYy5jbG9zZSgpXG5cdFx0ICBwYyA9IG51bGxcdFx0ICBcblx0XHR9XHRcblx0XHRcdFxuXHRcdGNvbnNvbGUubG9nKCdoZWlnaHQnLCBlbHQuZmluZCgnLnZpZGVvJykuaGVpZ2h0KCkpXG5cblx0XHRuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmdldFVzZXJNZWRpYSh7XG5cdFx0ICBhdWRpbzogdHJ1ZSxcblx0XHQgIHZpZGVvOiB7XG5cdFx0ICBcdC8vIHdpZHRoOiB7bWF4OiBlbHQud2lkdGgoKS8gMn0sXG5cdFx0ICBcdGhlaWdodDoge21heDogZWx0LmZpbmQoJy52aWRlbycpLmhlaWdodCgpLyAyfVxuXHRcdCAgXHQvL2hlaWdodDoge21heDogMTIwfVxuXHRcdCAgfVxuXHRcdH0pXG5cdFx0LnRoZW4oZnVuY3Rpb24oc3RyZWFtKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnbG9jYWxTdHJlYW0gcmVhZHknKVxuXHRcdFx0XG5cdFx0XHRsb2NhbFZpZGVvLnNyY09iamVjdCA9IHN0cmVhbVxuXHRcdFx0bG9jYWxTdHJlYW0gPSBzdHJlYW1cblxuXHRcdFx0aWYgKHBhcmFtcy5jYWxsZXIgIT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdHJ0Yy5hY2NlcHQoKVxuXHRcdFx0XHRjcmVhdGVQZWVyQ29ubmVjdGlvbigpXHRcblx0XHRcdFx0cGMuYWRkU3RyZWFtKGxvY2FsU3RyZWFtKVx0XHRcdFx0XG5cdFx0XHR9XG5cdFx0fSlcblx0XHQuY2F0Y2goZnVuY3Rpb24oZSkge1xuXHRcdFx0Y29uc29sZS5sb2coJ2Vycm9yJywgZSlcblx0XHRcdGlmIChwYXJhbXMuY2FsbGVyICE9IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRydGMuZGVueSgpXG5cdFx0XHR9XG5cdFx0XHRjdHJsLnNldERhdGEoe2Rpc3RhbnQ6ICcnLCBzdGF0dXM6ICdmYWlsZWQnfSlcblx0XHQgIFx0Ly9hbGVydCgnZ2V0VXNlck1lZGlhKCkgZXJyb3I6ICcgKyBlLm5hbWUpO1xuXG5cdFx0fSlcblxuXHRcdGJyb2tlci5vblRvcGljKCdicmVpemJvdC5ydGMuYWNjZXB0JywgZnVuY3Rpb24obXNnKSB7XG5cdFx0XHRpZiAobXNnLmhpc3QgPT09IHRydWUpIHtcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cdFx0XHRjb25zb2xlLmxvZygnbXNnJywgbXNnKVxuXHRcdFx0cnRjLmNhbmNlbChjdHJsLm1vZGVsLmRpc3RhbnQpXG5cdFx0XHRydGMuc2V0UmVtb3RlQ2xpZW50SWQobXNnLnNyY0lkKVxuXG5cdFx0XHRjdHJsLnNldERhdGEoe3N0YXR1czogJ2Nvbm5lY3RlZCd9KVxuXHRcdFx0Y3JlYXRlUGVlckNvbm5lY3Rpb24oKVxuXHRcdFx0cGMuYWRkU3RyZWFtKGxvY2FsU3RyZWFtKVxuXHRcdFx0cGMuY3JlYXRlT2ZmZXIoKS50aGVuKChzZXNzaW9uRGVzY3JpcHRpb24pID0+IHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ2NyZWF0ZU9mZmVyJywgc2Vzc2lvbkRlc2NyaXB0aW9uKVxuXHRcdFx0XHRwYy5zZXRMb2NhbERlc2NyaXB0aW9uKHNlc3Npb25EZXNjcmlwdGlvbilcblx0XHRcdFx0cnRjLm9mZmVyKHNlc3Npb25EZXNjcmlwdGlvbilcblx0XHRcdH0pXG5cdFx0fSlcblxuXHRcdGJyb2tlci5vblRvcGljKCdicmVpemJvdC5ydGMuZGVueScsIGZ1bmN0aW9uKG1zZykge1xuXHRcdFx0aWYgKG1zZy5oaXN0ID09PSB0cnVlKSB7XG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXHRcdFx0Y29uc29sZS5sb2coJ21zZycsIG1zZylcblx0XHRcdGN0cmwuc2V0RGF0YSh7c3RhdHVzOiAncmVmdXNlZCd9KVxuXHRcdFx0cnRjLmNhbmNlbChjdHJsLm1vZGVsLmRpc3RhbnQpXG5cblx0XHR9KVxuXG5cdFx0YnJva2VyLm9uVG9waWMoJ2JyZWl6Ym90LnJ0Yy5jYW5kaWRhdGUnLCBmdW5jdGlvbihtc2cpIHtcblx0XHRcdGlmIChtc2cuaGlzdCA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblx0XHRcdGNvbnNvbGUubG9nKCdtc2cnLCBtc2cpXG5cdFx0XHRjb25zdCB7bGFiZWwsIGNhbmRpZGF0ZX0gPSBtc2cuZGF0YVxuXG5cdFx0ICAgIHBjLmFkZEljZUNhbmRpZGF0ZShuZXcgUlRDSWNlQ2FuZGlkYXRlKHtcblx0XHQgICAgICBzZHBNTGluZUluZGV4OiBsYWJlbCxcblx0XHQgICAgICBjYW5kaWRhdGVcblx0XHQgICAgfSkpXHRcdFxuXHRcdH0pXHRcdFxuXG5cdFx0YnJva2VyLm9uVG9waWMoJ2JyZWl6Ym90LnJ0Yy5vZmZlcicsIGZ1bmN0aW9uKG1zZykge1xuXHRcdFx0aWYgKG1zZy5oaXN0ID09PSB0cnVlKSB7XG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXHRcdFx0Y29uc29sZS5sb2coJ21zZycsIG1zZylcblx0XHRcdHBjLnNldFJlbW90ZURlc2NyaXB0aW9uKG5ldyBSVENTZXNzaW9uRGVzY3JpcHRpb24obXNnLmRhdGEpKVxuXHRcdFx0Y29uc29sZS5sb2coJ1NlbmRpbmcgYW5zd2VyIHRvIHBlZXIuJylcblx0XHRcdHBjLmNyZWF0ZUFuc3dlcigpLnRoZW4oKHNlc3Npb25EZXNjcmlwdGlvbikgPT4ge1xuXHRcdFx0XHRwYy5zZXRMb2NhbERlc2NyaXB0aW9uKHNlc3Npb25EZXNjcmlwdGlvbilcblx0XHRcdFx0cnRjLmFuc3dlcihzZXNzaW9uRGVzY3JpcHRpb24pXG5cblx0XHRcdH0pXG5cblx0XHR9KVx0XG5cblx0XHRicm9rZXIub25Ub3BpYygnYnJlaXpib3QucnRjLmFuc3dlcicsIGZ1bmN0aW9uKG1zZykge1xuXHRcdFx0aWYgKG1zZy5oaXN0ID09PSB0cnVlKSB7XG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXHRcdFx0Y29uc29sZS5sb2coJ21zZycsIG1zZylcblx0XHRcdHBjLnNldFJlbW90ZURlc2NyaXB0aW9uKG5ldyBSVENTZXNzaW9uRGVzY3JpcHRpb24obXNnLmRhdGEpKVxuXG5cdFx0fSlcdFxuXG5cdFx0YnJva2VyLm9uVG9waWMoJ2JyZWl6Ym90LnJ0Yy5ieWUnLCBmdW5jdGlvbihtc2cpIHtcblx0XHRcdGlmIChtc2cuaGlzdCA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblx0XHRcdGNvbnNvbGUubG9nKCdtc2cnLCBtc2cpXG5cdFx0XHRjdHJsLnNldERhdGEoe3N0YXR1czogJ2Rpc2Nvbm5lY3RlZCcsIGRpc3RhbnQ6ICcnfSlcblx0XHRcdHN0b3AoKVxuXG5cdFx0fSlcdFxuXG5cblx0XHR3aW5kb3cub25iZWZvcmV1bmxvYWQgPSBmdW5jdGlvbigpIHtcblx0XHRcdGlmIChwYyAhPSB1bmRlZmluZWQpIHtcblx0XHQgIFx0XHRydGMuYnllKClcblx0XHRcdH1cblx0XHR9O1x0XHRcblx0XG5cdH1cblxuXG59KTtcblxuXG5cblxuIl19
