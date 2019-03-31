$$.control.registerControl('rootPage', {

	deps: ['breizbot.files'],

	template: "<div class=\"main\">\n	<div bn-control=\"brainjs.camera\" bn-iface=\"camera\" bn-data=\"{constraints}\"></div>	\n\n	<button title=\"Take picture\" \n	bn-event=\"click: onTakePicture\" class=\"w3-btn w3-blue\"><i class=\"fa fa-camera\"></i></button>	\n</div>\n",

	props: {
		$pager: null
	},

	init: function(elt, srvFiles) {

		const audio = new Audio('/webapps/camera/assets/camera_shutter.mp3')

		const {$pager} = this.props

		console.log('width', elt.width(), 'height', elt.height())


		const ctrl = $$.viewController(elt, {
			data: {
				constraints: {
					width: {max: elt.width()},
					height: {max: elt.height()}
				}
			},
			events: {
				onTakePicture: function(ev) {
					audio.play()
					const url = ctrl.scope.camera.takePicture()
					$pager.pushPage('snapPage', {
						title: 'Snapshot', 
						props: {url},
						buttons: [
							{label: 'Save', name: 'save'}
						]
					})					
				}
			}
		})


		ctrl.scope.camera.start()

		window.addEventListener('resize', function() {
			console.log('onresize')
			ctrl.setData({
				constraints: {
					width: {max: elt.width()},
					height: {max: elt.height()}
				}
			})
		})		
	}


});





$$.control.registerControl('snapPage', {

	deps: ['breizbot.files'],

	template: "<div style=\"text-align: center;\">\n	<img bn-attr=\"{src: url}\">	\n</div>\n",

	props: {
		$pager: null,
		url: null
	},

	init: function(elt, files) {

		const {url, $pager} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				url
			}
		})

		this.onAction = function(action) {
			console.log('onAction', action)
			const fileName = 'SNAP' + Date.now() + '.png'
			console.log('fileName', fileName)

			files.uploadFile(url, fileName, '/images/camera').then(function(resp) {
				console.log('resp', resp)
				$pager.popPage()
			})	
			.catch(function(resp) {
				$$.ui.showAlert({
					title: 'Error',
					content: resp.responseText
				})
			})			
		}

	}
});





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiLCJzbmFwLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM3REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImFwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdyb290UGFnZScsIHtcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LmZpbGVzJ10sXG5cblx0dGVtcGxhdGU6IFwiPGRpdiBjbGFzcz1cXFwibWFpblxcXCI+XFxuXHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuY2FtZXJhXFxcIiBibi1pZmFjZT1cXFwiY2FtZXJhXFxcIiBibi1kYXRhPVxcXCJ7Y29uc3RyYWludHN9XFxcIj48L2Rpdj5cdFxcblxcblx0PGJ1dHRvbiB0aXRsZT1cXFwiVGFrZSBwaWN0dXJlXFxcIiBcXG5cdGJuLWV2ZW50PVxcXCJjbGljazogb25UYWtlUGljdHVyZVxcXCIgY2xhc3M9XFxcInczLWJ0biB3My1ibHVlXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtY2FtZXJhXFxcIj48L2k+PC9idXR0b24+XHRcXG48L2Rpdj5cXG5cIixcblxuXHRwcm9wczoge1xuXHRcdCRwYWdlcjogbnVsbFxuXHR9LFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgc3J2RmlsZXMpIHtcblxuXHRcdGNvbnN0IGF1ZGlvID0gbmV3IEF1ZGlvKCcvd2ViYXBwcy9jYW1lcmEvYXNzZXRzL2NhbWVyYV9zaHV0dGVyLm1wMycpXG5cblx0XHRjb25zdCB7JHBhZ2VyfSA9IHRoaXMucHJvcHNcblxuXHRcdGNvbnNvbGUubG9nKCd3aWR0aCcsIGVsdC53aWR0aCgpLCAnaGVpZ2h0JywgZWx0LmhlaWdodCgpKVxuXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGNvbnN0cmFpbnRzOiB7XG5cdFx0XHRcdFx0d2lkdGg6IHttYXg6IGVsdC53aWR0aCgpfSxcblx0XHRcdFx0XHRoZWlnaHQ6IHttYXg6IGVsdC5oZWlnaHQoKX1cblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvblRha2VQaWN0dXJlOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGF1ZGlvLnBsYXkoKVxuXHRcdFx0XHRcdGNvbnN0IHVybCA9IGN0cmwuc2NvcGUuY2FtZXJhLnRha2VQaWN0dXJlKClcblx0XHRcdFx0XHQkcGFnZXIucHVzaFBhZ2UoJ3NuYXBQYWdlJywge1xuXHRcdFx0XHRcdFx0dGl0bGU6ICdTbmFwc2hvdCcsIFxuXHRcdFx0XHRcdFx0cHJvcHM6IHt1cmx9LFxuXHRcdFx0XHRcdFx0YnV0dG9uczogW1xuXHRcdFx0XHRcdFx0XHR7bGFiZWw6ICdTYXZlJywgbmFtZTogJ3NhdmUnfVxuXHRcdFx0XHRcdFx0XVxuXHRcdFx0XHRcdH0pXHRcdFx0XHRcdFxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcblxuXG5cdFx0Y3RybC5zY29wZS5jYW1lcmEuc3RhcnQoKVxuXG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIGZ1bmN0aW9uKCkge1xuXHRcdFx0Y29uc29sZS5sb2coJ29ucmVzaXplJylcblx0XHRcdGN0cmwuc2V0RGF0YSh7XG5cdFx0XHRcdGNvbnN0cmFpbnRzOiB7XG5cdFx0XHRcdFx0d2lkdGg6IHttYXg6IGVsdC53aWR0aCgpfSxcblx0XHRcdFx0XHRoZWlnaHQ6IHttYXg6IGVsdC5oZWlnaHQoKX1cblx0XHRcdFx0fVxuXHRcdFx0fSlcblx0XHR9KVx0XHRcblx0fVxuXG5cbn0pO1xuXG5cblxuXG4iLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnc25hcFBhZ2UnLCB7XG5cblx0ZGVwczogWydicmVpemJvdC5maWxlcyddLFxuXG5cdHRlbXBsYXRlOiBcIjxkaXYgc3R5bGU9XFxcInRleHQtYWxpZ246IGNlbnRlcjtcXFwiPlxcblx0PGltZyBibi1hdHRyPVxcXCJ7c3JjOiB1cmx9XFxcIj5cdFxcbjwvZGl2PlxcblwiLFxuXG5cdHByb3BzOiB7XG5cdFx0JHBhZ2VyOiBudWxsLFxuXHRcdHVybDogbnVsbFxuXHR9LFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgZmlsZXMpIHtcblxuXHRcdGNvbnN0IHt1cmwsICRwYWdlcn0gPSB0aGlzLnByb3BzXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdHVybFxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHR0aGlzLm9uQWN0aW9uID0gZnVuY3Rpb24oYWN0aW9uKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnb25BY3Rpb24nLCBhY3Rpb24pXG5cdFx0XHRjb25zdCBmaWxlTmFtZSA9ICdTTkFQJyArIERhdGUubm93KCkgKyAnLnBuZydcblx0XHRcdGNvbnNvbGUubG9nKCdmaWxlTmFtZScsIGZpbGVOYW1lKVxuXG5cdFx0XHRmaWxlcy51cGxvYWRGaWxlKHVybCwgZmlsZU5hbWUsICcvaW1hZ2VzL2NhbWVyYScpLnRoZW4oZnVuY3Rpb24ocmVzcCkge1xuXHRcdFx0XHRjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdCRwYWdlci5wb3BQYWdlKClcblx0XHRcdH0pXHRcblx0XHRcdC5jYXRjaChmdW5jdGlvbihyZXNwKSB7XG5cdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7XG5cdFx0XHRcdFx0dGl0bGU6ICdFcnJvcicsXG5cdFx0XHRcdFx0Y29udGVudDogcmVzcC5yZXNwb25zZVRleHRcblx0XHRcdFx0fSlcblx0XHRcdH0pXHRcdFx0XG5cdFx0fVxuXG5cdH1cbn0pO1xuXG5cblxuXG4iXX0=
