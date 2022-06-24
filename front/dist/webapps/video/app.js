//@ts-check
$$.control.registerControl('rootPage', {


	deps: ['breizbot.rtc'],

	template: "<div bn-control=\"breizbot.rtc\" \n	bn-data=\"{\n		appName:\'video\',\n		iconCls: \'fa fa-phone fa-flip-vertical\',\n		title: \'Select a friend to call\'\n	}\"\n	bn-event=\"rtchangup: onHangup\"\n>\n</div>\n<div class=\"video\">\n\n	  <video bn-bind=\"localVideo\" autoplay muted playsinline bn-class=\"{reduced: isConnected}\"></video>\n	  <video bn-bind=\"remoteVideo\" autoplay playsinline bn-show=\"isConnected\"></video>	\n</div>		\n\n\n\n",

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

		const localVideo = ctrl.scope.localVideo.on('canplay', function(){
			console.log('canplay', this.videoHeight, this.videoWidth)
			ctrl.setData({videoSize: this.videoWidth + 'x' + this.videoHeight})
		}).get(0)

		const remoteVideo = ctrl.scope.remoteVideo.get(0)
		let pc
		let localStream
		let remoteStream

		function createPeerConnection() {
			//console.log('createPeerConnection')
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
			  	//console.log('onaddstream', event)
			  	remoteStream = event.stream
			  	remoteVideo.srcObject = remoteStream			  	
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
			//console.log('createOffer', sessionDescription)
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
			//console.log('Sending answer to peer.')
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
			return rtc.exit()
		}		
	
	}


});





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy9AdHMtY2hlY2tcbiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdyb290UGFnZScsIHtcblxuXG5cdGRlcHM6IFsnYnJlaXpib3QucnRjJ10sXG5cblx0dGVtcGxhdGU6IFwiPGRpdiBibi1jb250cm9sPVxcXCJicmVpemJvdC5ydGNcXFwiIFxcblx0Ym4tZGF0YT1cXFwie1xcblx0XHRhcHBOYW1lOlxcJ3ZpZGVvXFwnLFxcblx0XHRpY29uQ2xzOiBcXCdmYSBmYS1waG9uZSBmYS1mbGlwLXZlcnRpY2FsXFwnLFxcblx0XHR0aXRsZTogXFwnU2VsZWN0IGEgZnJpZW5kIHRvIGNhbGxcXCdcXG5cdH1cXFwiXFxuXHRibi1ldmVudD1cXFwicnRjaGFuZ3VwOiBvbkhhbmd1cFxcXCJcXG4+XFxuPC9kaXY+XFxuPGRpdiBjbGFzcz1cXFwidmlkZW9cXFwiPlxcblxcblx0ICA8dmlkZW8gYm4tYmluZD1cXFwibG9jYWxWaWRlb1xcXCIgYXV0b3BsYXkgbXV0ZWQgcGxheXNpbmxpbmUgYm4tY2xhc3M9XFxcIntyZWR1Y2VkOiBpc0Nvbm5lY3RlZH1cXFwiPjwvdmlkZW8+XFxuXHQgIDx2aWRlbyBibi1iaW5kPVxcXCJyZW1vdGVWaWRlb1xcXCIgYXV0b3BsYXkgcGxheXNpbmxpbmUgYm4tc2hvdz1cXFwiaXNDb25uZWN0ZWRcXFwiPjwvdmlkZW8+XHRcXG48L2Rpdj5cdFx0XFxuXFxuXFxuXFxuXCIsXG5cblx0LyoqXG5cdCAqIFxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLlJUQy5JbnRlcmZhY2V9IHJ0YyBcblx0ICovXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgcnRjKSB7XG5cblx0XHRydGMub24oJ3N0YXR1cycsIChkYXRhKSA9PiB7XG5cdFx0XHRjdHJsLnNldERhdGEoe3N0YXR1czogZGF0YS5zdGF0dXN9KVxuXHRcdH0pXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdHN0YXR1czogJ3JlYWR5Jyxcblx0XHRcdFx0aXNDb25uZWN0ZWQ6IGZ1bmN0aW9uKCkge3JldHVybiB0aGlzLnN0YXR1cyA9PSAnY29ubmVjdGVkJ31cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25IYW5ndXA6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0c3RvcCgpXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVxuXG5cblxuXHRcdGNvbnN0IHBjQ29uZmlnID0ge1xuXHRcdCAgJ2ljZVNlcnZlcnMnOiBbe1xuXHRcdCAgICAndXJscyc6ICdzdHVuOnN0dW4ubC5nb29nbGUuY29tOjE5MzAyJ1xuXHRcdCAgfV1cblx0XHR9XG5cblx0XHRjb25zdCBsb2NhbFZpZGVvID0gY3RybC5zY29wZS5sb2NhbFZpZGVvLm9uKCdjYW5wbGF5JywgZnVuY3Rpb24oKXtcblx0XHRcdGNvbnNvbGUubG9nKCdjYW5wbGF5JywgdGhpcy52aWRlb0hlaWdodCwgdGhpcy52aWRlb1dpZHRoKVxuXHRcdFx0Y3RybC5zZXREYXRhKHt2aWRlb1NpemU6IHRoaXMudmlkZW9XaWR0aCArICd4JyArIHRoaXMudmlkZW9IZWlnaHR9KVxuXHRcdH0pLmdldCgwKVxuXG5cdFx0Y29uc3QgcmVtb3RlVmlkZW8gPSBjdHJsLnNjb3BlLnJlbW90ZVZpZGVvLmdldCgwKVxuXHRcdGxldCBwY1xuXHRcdGxldCBsb2NhbFN0cmVhbVxuXHRcdGxldCByZW1vdGVTdHJlYW1cblxuXHRcdGZ1bmN0aW9uIGNyZWF0ZVBlZXJDb25uZWN0aW9uKCkge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnY3JlYXRlUGVlckNvbm5lY3Rpb24nKVxuXHRcdFx0dHJ5IHtcblx0XHRcdCAgcGMgPSBuZXcgUlRDUGVlckNvbm5lY3Rpb24ocGNDb25maWcpXG5cblx0XHRcdCAgcGMub25pY2VjYW5kaWRhdGUgPSBmdW5jdGlvbihldmVudCkge1xuXHRcdFx0ICBcdC8vY29uc29sZS5sb2coJ29uaWNlY2FuZGlkYXRlJywgZXZlbnQpXG5cdFx0XHQgIFx0Y29uc3QgaW5mbyA9IGV2ZW50LmNhbmRpZGF0ZVxuXG5cdFx0XHQgIFx0aWYgKGluZm8pIHtcblx0XHRcdCAgXHRcdHJ0Yy5zZW5kRGF0YSgnY2FuZGlkYXRlJywge1xuXHRcdFx0ICBcdFx0XHRsYWJlbDogaW5mby5zZHBNTGluZUluZGV4LFxuXHRcdFx0ICBcdFx0XHRpZDogaW5mby5zZHBNaWQsXG5cdFx0XHQgIFx0XHRcdGNhbmRpZGF0ZTogaW5mby5jYW5kaWRhdGVcdFx0XHRcdCAgXHRcdFx0XG5cdFx0XHQgIFx0XHR9KVxuXHRcdCAgXHRcdFxuXHRcdFx0ICBcdH1cblx0XHRcdCAgfVxuXHRcdFx0ICBwYy5vbmFkZHN0cmVhbSA9IGZ1bmN0aW9uKGV2ZW50KSB7XG5cdFx0XHQgIFx0Ly9jb25zb2xlLmxvZygnb25hZGRzdHJlYW0nLCBldmVudClcblx0XHRcdCAgXHRyZW1vdGVTdHJlYW0gPSBldmVudC5zdHJlYW1cblx0XHRcdCAgXHRyZW1vdGVWaWRlby5zcmNPYmplY3QgPSByZW1vdGVTdHJlYW1cdFx0XHQgIFx0XG5cdFx0XHQgIH1cblx0XHRcdCAgLy9wYy5vbnJlbW92ZXN0cmVhbSA9IGhhbmRsZVJlbW90ZVN0cmVhbVJlbW92ZWRcblx0XHRcdCAgLy9jb25zb2xlLmxvZygnQ3JlYXRlZCBSVENQZWVyQ29ubm5lY3Rpb24nKVxuXHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0ICBjb25zb2xlLmxvZygnRmFpbGVkIHRvIGNyZWF0ZSBQZWVyQ29ubmVjdGlvbiwgZXhjZXB0aW9uOiAnICsgZS5tZXNzYWdlKVxuXHRcdFx0ICBhbGVydCgnQ2Fubm90IGNyZWF0ZSBSVENQZWVyQ29ubmVjdGlvbiBvYmplY3QuJylcblx0XHRcdH1cblx0XHR9XG5cblx0XHRmdW5jdGlvbiBzdG9wKCkge1xuXHRcdCAgcGMuY2xvc2UoKVxuXHRcdCAgcGMgPSBudWxsXHRcdCAgXG5cdFx0fVx0XG5cdFx0XHRcblx0XHRhc3luYyBmdW5jdGlvbiBvcGVuTWVkaWEoKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdvcGVuTWVkaWEnKVxuXHRcdFx0dHJ5IHtcblx0XHRcdFx0Y29uc3Qgc3RyZWFtID0gYXdhaXQgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXRVc2VyTWVkaWEoe1xuXHRcdFx0XHRcdGF1ZGlvOiB0cnVlLFxuXHRcdFx0XHRcdHZpZGVvOiB0cnVlXG5cdFx0XHRcdCAgfSlcblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnbG9jYWxTdHJlYW0gcmVhZHknKVxuXHRcdFx0XG5cdFx0XHRcdGxvY2FsVmlkZW8uc3JjT2JqZWN0ID0gc3RyZWFtXG5cdFx0XHRcdGxvY2FsU3RyZWFtID0gc3RyZWFtXG5cblx0XHRcdFx0aWYgKHJ0Yy5pc0NhbGxlZSgpKSB7XG5cdFx0XHRcdFx0cnRjLmFjY2VwdCgpXG5cdFx0XHRcdFx0Y3JlYXRlUGVlckNvbm5lY3Rpb24oKVx0XG5cdFx0XHRcdFx0cGMuYWRkU3RyZWFtKGxvY2FsU3RyZWFtKVx0XHRcdFx0XG5cdFx0XHRcdH1cdFxuXHRcdFx0fVxuXHRcdFx0Y2F0Y2ggKGUpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ2Vycm9yJywgZSlcblx0XHRcdFx0aWYgKHJ0Yy5pc0NhbGxlZSkge1xuXHRcdFx0XHRcdHJ0Yy5kZW55KClcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJ0Yy5vbignYWNjZXB0JywgYXN5bmMgZnVuY3Rpb24oKSB7XG5cdFx0XHRjcmVhdGVQZWVyQ29ubmVjdGlvbigpXG5cdFx0XHRwYy5hZGRTdHJlYW0obG9jYWxTdHJlYW0pXG5cdFx0XHRjb25zdCBzZXNzaW9uRGVzY3JpcHRpb24gPSBhd2FpdCBwYy5jcmVhdGVPZmZlcigpXG5cdFx0XHQvL2NvbnNvbGUubG9nKCdjcmVhdGVPZmZlcicsIHNlc3Npb25EZXNjcmlwdGlvbilcblx0XHRcdHBjLnNldExvY2FsRGVzY3JpcHRpb24oc2Vzc2lvbkRlc2NyaXB0aW9uKVxuXHRcdFx0cnRjLnNlbmREYXRhKCdvZmZlcicsIHNlc3Npb25EZXNjcmlwdGlvbilcblx0XHR9KVxuXG5cblx0XHRydGMub25EYXRhKCdjYW5kaWRhdGUnLCBmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHRjb25zdCB7bGFiZWwsIGNhbmRpZGF0ZX0gPSBkYXRhXG5cblx0XHQgICAgcGMuYWRkSWNlQ2FuZGlkYXRlKG5ldyBSVENJY2VDYW5kaWRhdGUoe1xuXHRcdCAgICAgIHNkcE1MaW5lSW5kZXg6IGxhYmVsLFxuXHRcdCAgICAgIGNhbmRpZGF0ZVxuXHRcdCAgICB9KSlcdFx0XG5cdFx0fSlcdFx0XG5cblx0XHRydGMub25EYXRhKCdvZmZlcicsIGFzeW5jIGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdHBjLnNldFJlbW90ZURlc2NyaXB0aW9uKG5ldyBSVENTZXNzaW9uRGVzY3JpcHRpb24oZGF0YSkpXG5cdFx0XHQvL2NvbnNvbGUubG9nKCdTZW5kaW5nIGFuc3dlciB0byBwZWVyLicpXG5cdFx0XHRjb25zdCBzZXNzaW9uRGVzY3JpcHRpb24gPSBhd2FpdCBwYy5jcmVhdGVBbnN3ZXIoKVxuXHRcdFx0cGMuc2V0TG9jYWxEZXNjcmlwdGlvbihzZXNzaW9uRGVzY3JpcHRpb24pXG5cdFx0XHRydGMuc2VuZERhdGEoJ2Fuc3dlcicsIHNlc3Npb25EZXNjcmlwdGlvbilcblx0XHR9KVx0XG5cblx0XHRydGMub25EYXRhKCdhbnN3ZXInLCBmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHRwYy5zZXRSZW1vdGVEZXNjcmlwdGlvbihuZXcgUlRDU2Vzc2lvbkRlc2NyaXB0aW9uKGRhdGEpKVxuXG5cdFx0fSlcdFxuXG5cdFx0cnRjLm9uKCdieWUnLCBmdW5jdGlvbigpIHtcblx0XHRcdHN0b3AoKVxuXHRcdH0pXHRcblxuXHRcdHJ0Yy5vbigncmVhZHknLCAoKSA9PiB7IFxuXHRcdFx0b3Blbk1lZGlhKClcblx0XHR9KVxuXG5cdFx0dGhpcy5vbkFwcEV4aXQgPSBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiBydGMuZXhpdCgpXG5cdFx0fVx0XHRcblx0XG5cdH1cblxuXG59KTtcblxuXG5cblxuIl19
