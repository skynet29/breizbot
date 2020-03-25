$$.control.registerControl('rootPage', {

	deps: ['breizbot.files', 'breizbot.pager'],

	template: "<div class=\"footer\">\n	<button \n		title=\"Take picture\" \n		bn-event=\"click: onTakePicture\" \n		bn-show=\"ready\"\n		class=\"w3-button w3-circle w3-blue\">\n			<i class=\"fa fa-camera\"></i>\n		</button>\n	\n</div>\n\n<div \n	bn-control=\"brainjs.selectmenu\" \n	bn-data=\"{items: videoDevices}\"\n	bn-event=\"selectmenuchange: onDeviceChange\"\n	bn-show=\"show1\"\n	>\n		\n</div>\n\n<div class=\"main w3-pale-blue\">\n	<div bn-show=\"showMessage\">Sorry, no video device found !</div>\n	<div \n		bn-control=\"brainjs.camera\" \n		bn-event=\"cameraready: onCameraReady\"\n		bn-data=\"{constraints}\"\n		bn-iface=\"camera\">\n			\n		</div>	\n	\n</div>\n",


	init: function(elt, srvFiles, pager) {

		const audio = new Audio('/webapps/camera/assets/camera_shutter.mp3')

		function saveImage(url) {
			const fileName = 'SNAP' + Date.now() + '.png'
			console.log('fileName', fileName)
			const blob = $$.util.dataURLtoBlob(url)
			srvFiles.uploadFile(blob, fileName, '/apps/camera').then(function(resp) {
				console.log('resp', resp)
				pager.popPage()
			})	
			.catch(function(resp) {
				$$.ui.showAlert({
					title: 'Error',
					content: resp.responseText
				})
			})			
		}

		const ctrl = $$.viewController(elt, {
			data: {
				ready: false,
				videoDevices: [],
				constraints: {video: true},
				showMessage: false,
				show1: function() {
					return this.videoDevices.length > 1
				}
			},
			events: {
				onCameraReady: function() {
					console.log('onCameraReady')
					ctrl.setData({ready: true})
				},
				onTakePicture: function(ev) {
					audio.play()
					const url = ctrl.scope.camera.takePicture()
					
					pager.pushPage('breizbot.viewer', {
						title: 'Snapshot', 
						props: {url, type: 'image'},
						buttons: {
							save: {
								title: 'Save',
								icon: 'fa fa-save',
								onClick: function() {
									saveImage(url)
								}
							}
						},	
					})
				},
				onDeviceChange: function(ev, data) {
					console.log('onDeviceChange', $(this).getValue())
					const constraints = {
						video: {
							deviceId: {
								exact: $(this).getValue()
							}
						}
					}
					ctrl.setData({constraints})


				}
			}
		})

		$$.util.getVideoDevices().then((videoDevices) => {
			ctrl.setData({
				videoDevices: videoDevices.map((i) => {
					return {value: i.id, label: i.label}
				})
			})

			if (videoDevices.length > 0) {
				ctrl.scope.camera.start()
			}
			else {
				ctrl.setData({showMessage: true})
			}
		})

		

	}


});





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImFwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdyb290UGFnZScsIHtcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LmZpbGVzJywgJ2JyZWl6Ym90LnBhZ2VyJ10sXG5cblx0dGVtcGxhdGU6IFwiPGRpdiBjbGFzcz1cXFwiZm9vdGVyXFxcIj5cXG5cdDxidXR0b24gXFxuXHRcdHRpdGxlPVxcXCJUYWtlIHBpY3R1cmVcXFwiIFxcblx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uVGFrZVBpY3R1cmVcXFwiIFxcblx0XHRibi1zaG93PVxcXCJyZWFkeVxcXCJcXG5cdFx0Y2xhc3M9XFxcInczLWJ1dHRvbiB3My1jaXJjbGUgdzMtYmx1ZVxcXCI+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLWNhbWVyYVxcXCI+PC9pPlxcblx0XHQ8L2J1dHRvbj5cXG5cdFxcbjwvZGl2PlxcblxcbjxkaXYgXFxuXHRibi1jb250cm9sPVxcXCJicmFpbmpzLnNlbGVjdG1lbnVcXFwiIFxcblx0Ym4tZGF0YT1cXFwie2l0ZW1zOiB2aWRlb0RldmljZXN9XFxcIlxcblx0Ym4tZXZlbnQ9XFxcInNlbGVjdG1lbnVjaGFuZ2U6IG9uRGV2aWNlQ2hhbmdlXFxcIlxcblx0Ym4tc2hvdz1cXFwic2hvdzFcXFwiXFxuXHQ+XFxuXHRcdFxcbjwvZGl2PlxcblxcbjxkaXYgY2xhc3M9XFxcIm1haW4gdzMtcGFsZS1ibHVlXFxcIj5cXG5cdDxkaXYgYm4tc2hvdz1cXFwic2hvd01lc3NhZ2VcXFwiPlNvcnJ5LCBubyB2aWRlbyBkZXZpY2UgZm91bmQgITwvZGl2Plxcblx0PGRpdiBcXG5cdFx0Ym4tY29udHJvbD1cXFwiYnJhaW5qcy5jYW1lcmFcXFwiIFxcblx0XHRibi1ldmVudD1cXFwiY2FtZXJhcmVhZHk6IG9uQ2FtZXJhUmVhZHlcXFwiXFxuXHRcdGJuLWRhdGE9XFxcIntjb25zdHJhaW50c31cXFwiXFxuXHRcdGJuLWlmYWNlPVxcXCJjYW1lcmFcXFwiPlxcblx0XHRcdFxcblx0XHQ8L2Rpdj5cdFxcblx0XFxuPC9kaXY+XFxuXCIsXG5cblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIHNydkZpbGVzLCBwYWdlcikge1xuXG5cdFx0Y29uc3QgYXVkaW8gPSBuZXcgQXVkaW8oJy93ZWJhcHBzL2NhbWVyYS9hc3NldHMvY2FtZXJhX3NodXR0ZXIubXAzJylcblxuXHRcdGZ1bmN0aW9uIHNhdmVJbWFnZSh1cmwpIHtcblx0XHRcdGNvbnN0IGZpbGVOYW1lID0gJ1NOQVAnICsgRGF0ZS5ub3coKSArICcucG5nJ1xuXHRcdFx0Y29uc29sZS5sb2coJ2ZpbGVOYW1lJywgZmlsZU5hbWUpXG5cdFx0XHRjb25zdCBibG9iID0gJCQudXRpbC5kYXRhVVJMdG9CbG9iKHVybClcblx0XHRcdHNydkZpbGVzLnVwbG9hZEZpbGUoYmxvYiwgZmlsZU5hbWUsICcvYXBwcy9jYW1lcmEnKS50aGVuKGZ1bmN0aW9uKHJlc3ApIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKVxuXHRcdFx0XHRwYWdlci5wb3BQYWdlKClcblx0XHRcdH0pXHRcblx0XHRcdC5jYXRjaChmdW5jdGlvbihyZXNwKSB7XG5cdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7XG5cdFx0XHRcdFx0dGl0bGU6ICdFcnJvcicsXG5cdFx0XHRcdFx0Y29udGVudDogcmVzcC5yZXNwb25zZVRleHRcblx0XHRcdFx0fSlcblx0XHRcdH0pXHRcdFx0XG5cdFx0fVxuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRyZWFkeTogZmFsc2UsXG5cdFx0XHRcdHZpZGVvRGV2aWNlczogW10sXG5cdFx0XHRcdGNvbnN0cmFpbnRzOiB7dmlkZW86IHRydWV9LFxuXHRcdFx0XHRzaG93TWVzc2FnZTogZmFsc2UsXG5cdFx0XHRcdHNob3cxOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy52aWRlb0RldmljZXMubGVuZ3RoID4gMVxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uQ2FtZXJhUmVhZHk6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbkNhbWVyYVJlYWR5Jylcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoe3JlYWR5OiB0cnVlfSlcblx0XHRcdFx0fSxcblx0XHRcdFx0b25UYWtlUGljdHVyZTogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRhdWRpby5wbGF5KClcblx0XHRcdFx0XHRjb25zdCB1cmwgPSBjdHJsLnNjb3BlLmNhbWVyYS50YWtlUGljdHVyZSgpXG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0cGFnZXIucHVzaFBhZ2UoJ2JyZWl6Ym90LnZpZXdlcicsIHtcblx0XHRcdFx0XHRcdHRpdGxlOiAnU25hcHNob3QnLCBcblx0XHRcdFx0XHRcdHByb3BzOiB7dXJsLCB0eXBlOiAnaW1hZ2UnfSxcblx0XHRcdFx0XHRcdGJ1dHRvbnM6IHtcblx0XHRcdFx0XHRcdFx0c2F2ZToge1xuXHRcdFx0XHRcdFx0XHRcdHRpdGxlOiAnU2F2ZScsXG5cdFx0XHRcdFx0XHRcdFx0aWNvbjogJ2ZhIGZhLXNhdmUnLFxuXHRcdFx0XHRcdFx0XHRcdG9uQ2xpY2s6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0c2F2ZUltYWdlKHVybClcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0sXHRcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkRldmljZUNoYW5nZTogZnVuY3Rpb24oZXYsIGRhdGEpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25EZXZpY2VDaGFuZ2UnLCAkKHRoaXMpLmdldFZhbHVlKCkpXG5cdFx0XHRcdFx0Y29uc3QgY29uc3RyYWludHMgPSB7XG5cdFx0XHRcdFx0XHR2aWRlbzoge1xuXHRcdFx0XHRcdFx0XHRkZXZpY2VJZDoge1xuXHRcdFx0XHRcdFx0XHRcdGV4YWN0OiAkKHRoaXMpLmdldFZhbHVlKClcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRjdHJsLnNldERhdGEoe2NvbnN0cmFpbnRzfSlcblxuXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0JCQudXRpbC5nZXRWaWRlb0RldmljZXMoKS50aGVuKCh2aWRlb0RldmljZXMpID0+IHtcblx0XHRcdGN0cmwuc2V0RGF0YSh7XG5cdFx0XHRcdHZpZGVvRGV2aWNlczogdmlkZW9EZXZpY2VzLm1hcCgoaSkgPT4ge1xuXHRcdFx0XHRcdHJldHVybiB7dmFsdWU6IGkuaWQsIGxhYmVsOiBpLmxhYmVsfVxuXHRcdFx0XHR9KVxuXHRcdFx0fSlcblxuXHRcdFx0aWYgKHZpZGVvRGV2aWNlcy5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdGN0cmwuc2NvcGUuY2FtZXJhLnN0YXJ0KClcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHRjdHJsLnNldERhdGEoe3Nob3dNZXNzYWdlOiB0cnVlfSlcblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0XG5cblx0fVxuXG5cbn0pO1xuXG5cblxuXG4iXX0=
