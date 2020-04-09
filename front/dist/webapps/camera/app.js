$$.control.registerControl('rootPage', {

	deps: ['breizbot.files', 'breizbot.pager'],

	template: "<div class=\"footer\">\n	<button \n		title=\"Take picture\" \n		bn-event=\"click: onTakePicture\" \n		bn-show=\"ready\"\n		class=\"w3-button w3-circle w3-blue\">\n			<i class=\"fa fa-camera\"></i>\n		</button>\n	\n</div>\n\n<div \n	bn-control=\"brainjs.selectmenu\" \n	bn-data=\"{items: videoDevices}\"\n	bn-event=\"selectmenuchange: onDeviceChange\"\n	bn-show=\"show1\"\n	>\n		\n</div>\n\n<div class=\"main w3-pale-blue\">\n	<div bn-show=\"showMessage\">Sorry, no video device found !</div>\n	<div \n		bn-control=\"brainjs.camera\" \n		bn-event=\"cameraready: onCameraReady\"\n		bn-data=\"{constraints}\"\n		bn-iface=\"camera\">\n			\n		</div>	\n	\n</div>\n",


	init: function(elt, srvFiles, pager) {

		const audio = new Audio('/webapps/camera/assets/camera_shutter.mp3')

		function saveImage(blob) {
			const fileName = 'SNAP' + Date.now() + '.png'
			console.log('fileName', fileName)
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
					ctrl.scope.camera.takePicture().then((blob) => {
						pager.pushPage('breizbot.viewer', {
							title: 'Snapshot', 
							props: {url: URL.createObjectURL(blob), type: 'image'},
							buttons: {
								save: {
									title: 'Save',
									icon: 'fa fa-save',
									onClick: function() {
										saveImage(blob)
									}
								}
							},	
						})
	
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





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ3Jvb3RQYWdlJywge1xuXG5cdGRlcHM6IFsnYnJlaXpib3QuZmlsZXMnLCAnYnJlaXpib3QucGFnZXInXSxcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGNsYXNzPVxcXCJmb290ZXJcXFwiPlxcblx0PGJ1dHRvbiBcXG5cdFx0dGl0bGU9XFxcIlRha2UgcGljdHVyZVxcXCIgXFxuXHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25UYWtlUGljdHVyZVxcXCIgXFxuXHRcdGJuLXNob3c9XFxcInJlYWR5XFxcIlxcblx0XHRjbGFzcz1cXFwidzMtYnV0dG9uIHczLWNpcmNsZSB3My1ibHVlXFxcIj5cXG5cdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtY2FtZXJhXFxcIj48L2k+XFxuXHRcdDwvYnV0dG9uPlxcblx0XFxuPC9kaXY+XFxuXFxuPGRpdiBcXG5cdGJuLWNvbnRyb2w9XFxcImJyYWluanMuc2VsZWN0bWVudVxcXCIgXFxuXHRibi1kYXRhPVxcXCJ7aXRlbXM6IHZpZGVvRGV2aWNlc31cXFwiXFxuXHRibi1ldmVudD1cXFwic2VsZWN0bWVudWNoYW5nZTogb25EZXZpY2VDaGFuZ2VcXFwiXFxuXHRibi1zaG93PVxcXCJzaG93MVxcXCJcXG5cdD5cXG5cdFx0XFxuPC9kaXY+XFxuXFxuPGRpdiBjbGFzcz1cXFwibWFpbiB3My1wYWxlLWJsdWVcXFwiPlxcblx0PGRpdiBibi1zaG93PVxcXCJzaG93TWVzc2FnZVxcXCI+U29ycnksIG5vIHZpZGVvIGRldmljZSBmb3VuZCAhPC9kaXY+XFxuXHQ8ZGl2IFxcblx0XHRibi1jb250cm9sPVxcXCJicmFpbmpzLmNhbWVyYVxcXCIgXFxuXHRcdGJuLWV2ZW50PVxcXCJjYW1lcmFyZWFkeTogb25DYW1lcmFSZWFkeVxcXCJcXG5cdFx0Ym4tZGF0YT1cXFwie2NvbnN0cmFpbnRzfVxcXCJcXG5cdFx0Ym4taWZhY2U9XFxcImNhbWVyYVxcXCI+XFxuXHRcdFx0XFxuXHRcdDwvZGl2Plx0XFxuXHRcXG48L2Rpdj5cXG5cIixcblxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgc3J2RmlsZXMsIHBhZ2VyKSB7XG5cblx0XHRjb25zdCBhdWRpbyA9IG5ldyBBdWRpbygnL3dlYmFwcHMvY2FtZXJhL2Fzc2V0cy9jYW1lcmFfc2h1dHRlci5tcDMnKVxuXG5cdFx0ZnVuY3Rpb24gc2F2ZUltYWdlKGJsb2IpIHtcblx0XHRcdGNvbnN0IGZpbGVOYW1lID0gJ1NOQVAnICsgRGF0ZS5ub3coKSArICcucG5nJ1xuXHRcdFx0Y29uc29sZS5sb2coJ2ZpbGVOYW1lJywgZmlsZU5hbWUpXG5cdFx0XHRzcnZGaWxlcy51cGxvYWRGaWxlKGJsb2IsIGZpbGVOYW1lLCAnL2FwcHMvY2FtZXJhJykudGhlbihmdW5jdGlvbihyZXNwKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcClcblx0XHRcdFx0cGFnZXIucG9wUGFnZSgpXG5cdFx0XHR9KVx0XG5cdFx0XHQuY2F0Y2goZnVuY3Rpb24ocmVzcCkge1xuXHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe1xuXHRcdFx0XHRcdHRpdGxlOiAnRXJyb3InLFxuXHRcdFx0XHRcdGNvbnRlbnQ6IHJlc3AucmVzcG9uc2VUZXh0XG5cdFx0XHRcdH0pXG5cdFx0XHR9KVx0XHRcdFxuXHRcdH1cblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0cmVhZHk6IGZhbHNlLFxuXHRcdFx0XHR2aWRlb0RldmljZXM6IFtdLFxuXHRcdFx0XHRjb25zdHJhaW50czoge3ZpZGVvOiB0cnVlfSxcblx0XHRcdFx0c2hvd01lc3NhZ2U6IGZhbHNlLFxuXHRcdFx0XHRzaG93MTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMudmlkZW9EZXZpY2VzLmxlbmd0aCA+IDFcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvbkNhbWVyYVJlYWR5OiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25DYW1lcmFSZWFkeScpXG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHtyZWFkeTogdHJ1ZX0pXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uVGFrZVBpY3R1cmU6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0YXVkaW8ucGxheSgpXG5cdFx0XHRcdFx0Y3RybC5zY29wZS5jYW1lcmEudGFrZVBpY3R1cmUoKS50aGVuKChibG9iKSA9PiB7XG5cdFx0XHRcdFx0XHRwYWdlci5wdXNoUGFnZSgnYnJlaXpib3Qudmlld2VyJywge1xuXHRcdFx0XHRcdFx0XHR0aXRsZTogJ1NuYXBzaG90JywgXG5cdFx0XHRcdFx0XHRcdHByb3BzOiB7dXJsOiBVUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IpLCB0eXBlOiAnaW1hZ2UnfSxcblx0XHRcdFx0XHRcdFx0YnV0dG9uczoge1xuXHRcdFx0XHRcdFx0XHRcdHNhdmU6IHtcblx0XHRcdFx0XHRcdFx0XHRcdHRpdGxlOiAnU2F2ZScsXG5cdFx0XHRcdFx0XHRcdFx0XHRpY29uOiAnZmEgZmEtc2F2ZScsXG5cdFx0XHRcdFx0XHRcdFx0XHRvbkNsaWNrOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0c2F2ZUltYWdlKGJsb2IpXG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9LFx0XG5cdFx0XHRcdFx0XHR9KVxuXHRcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkRldmljZUNoYW5nZTogZnVuY3Rpb24oZXYsIGRhdGEpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25EZXZpY2VDaGFuZ2UnLCAkKHRoaXMpLmdldFZhbHVlKCkpXG5cdFx0XHRcdFx0Y29uc3QgY29uc3RyYWludHMgPSB7XG5cdFx0XHRcdFx0XHR2aWRlbzoge1xuXHRcdFx0XHRcdFx0XHRkZXZpY2VJZDoge1xuXHRcdFx0XHRcdFx0XHRcdGV4YWN0OiAkKHRoaXMpLmdldFZhbHVlKClcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRjdHJsLnNldERhdGEoe2NvbnN0cmFpbnRzfSlcblxuXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0JCQudXRpbC5nZXRWaWRlb0RldmljZXMoKS50aGVuKCh2aWRlb0RldmljZXMpID0+IHtcblx0XHRcdGN0cmwuc2V0RGF0YSh7XG5cdFx0XHRcdHZpZGVvRGV2aWNlczogdmlkZW9EZXZpY2VzLm1hcCgoaSkgPT4ge1xuXHRcdFx0XHRcdHJldHVybiB7dmFsdWU6IGkuaWQsIGxhYmVsOiBpLmxhYmVsfVxuXHRcdFx0XHR9KVxuXHRcdFx0fSlcblxuXHRcdFx0aWYgKHZpZGVvRGV2aWNlcy5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdGN0cmwuc2NvcGUuY2FtZXJhLnN0YXJ0KClcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHRjdHJsLnNldERhdGEoe3Nob3dNZXNzYWdlOiB0cnVlfSlcblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0XG5cblx0fVxuXG5cbn0pO1xuXG5cblxuXG4iXX0=
