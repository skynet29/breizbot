$$.control.registerControl('firstPage', {

	deps: ['breizbot.files'],

	template: "<div class=\"main\">\n	<div bn-control=\"brainjs.camera\" bn-iface=\"camera\" bn-data=\"{format}\"></div>	\n\n	<button title=\"Take picture\" \n	bn-event=\"click: onTakePicture\" class=\"w3-btn w3-blue\"><i class=\"fa fa-camera\"></i></button>	\n</div>\n",

	props: {
		$pager: null
	},

	init: function(elt, srvFiles) {

		const audio = new Audio('/webapps/camera/assets/camera_shutter.mp3')

		const {$pager} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				format: getFormat(),
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

		function getFormat() {
			return window.innerWidth < 700 ? 'vga' : 'hd'
		}

		ctrl.scope.camera.start()
	}
});





$$.control.registerControl('breizbot.main', {

	template: "<div bn-control=\"brainjs.pager\" data-root-page=\"firstPage\"></div>\n",

	init: function(elt) {

		const ctrl = $$.viewController(elt)
	}

});





$$.control.registerControl('snapPage', {

	deps: ['breizbot.files'],

	template: "<img bn-attr=\"{src: url}\">",

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





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpcnN0LmpzIiwibWFpbi5qcyIsInNuYXAuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2ZpcnN0UGFnZScsIHtcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LmZpbGVzJ10sXG5cblx0dGVtcGxhdGU6IFwiPGRpdiBjbGFzcz1cXFwibWFpblxcXCI+XFxuXHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuY2FtZXJhXFxcIiBibi1pZmFjZT1cXFwiY2FtZXJhXFxcIiBibi1kYXRhPVxcXCJ7Zm9ybWF0fVxcXCI+PC9kaXY+XHRcXG5cXG5cdDxidXR0b24gdGl0bGU9XFxcIlRha2UgcGljdHVyZVxcXCIgXFxuXHRibi1ldmVudD1cXFwiY2xpY2s6IG9uVGFrZVBpY3R1cmVcXFwiIGNsYXNzPVxcXCJ3My1idG4gdzMtYmx1ZVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLWNhbWVyYVxcXCI+PC9pPjwvYnV0dG9uPlx0XFxuPC9kaXY+XFxuXCIsXG5cblx0cHJvcHM6IHtcblx0XHQkcGFnZXI6IG51bGxcblx0fSxcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIHNydkZpbGVzKSB7XG5cblx0XHRjb25zdCBhdWRpbyA9IG5ldyBBdWRpbygnL3dlYmFwcHMvY2FtZXJhL2Fzc2V0cy9jYW1lcmFfc2h1dHRlci5tcDMnKVxuXG5cdFx0Y29uc3QgeyRwYWdlcn0gPSB0aGlzLnByb3BzXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGZvcm1hdDogZ2V0Rm9ybWF0KCksXG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uVGFrZVBpY3R1cmU6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0YXVkaW8ucGxheSgpXG5cdFx0XHRcdFx0Y29uc3QgdXJsID0gY3RybC5zY29wZS5jYW1lcmEudGFrZVBpY3R1cmUoKVxuXHRcdFx0XHRcdCRwYWdlci5wdXNoUGFnZSgnc25hcFBhZ2UnLCB7XG5cdFx0XHRcdFx0XHR0aXRsZTogJ1NuYXBzaG90JywgXG5cdFx0XHRcdFx0XHRwcm9wczoge3VybH0sXG5cdFx0XHRcdFx0XHRidXR0b25zOiBbXG5cdFx0XHRcdFx0XHRcdHtsYWJlbDogJ1NhdmUnLCBuYW1lOiAnc2F2ZSd9XG5cdFx0XHRcdFx0XHRdXG5cdFx0XHRcdFx0fSlcdFx0XHRcdFx0XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0ZnVuY3Rpb24gZ2V0Rm9ybWF0KCkge1xuXHRcdFx0cmV0dXJuIHdpbmRvdy5pbm5lcldpZHRoIDwgNzAwID8gJ3ZnYScgOiAnaGQnXG5cdFx0fVxuXG5cdFx0Y3RybC5zY29wZS5jYW1lcmEuc3RhcnQoKVxuXHR9XG59KTtcblxuXG5cblxuIiwiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JyZWl6Ym90Lm1haW4nLCB7XG5cblx0dGVtcGxhdGU6IFwiPGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLnBhZ2VyXFxcIiBkYXRhLXJvb3QtcGFnZT1cXFwiZmlyc3RQYWdlXFxcIj48L2Rpdj5cXG5cIixcblxuXHRpbml0OiBmdW5jdGlvbihlbHQpIHtcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQpXG5cdH1cblxufSk7XG5cblxuXG5cbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdzbmFwUGFnZScsIHtcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LmZpbGVzJ10sXG5cblx0dGVtcGxhdGU6IFwiPGltZyBibi1hdHRyPVxcXCJ7c3JjOiB1cmx9XFxcIj5cIixcblxuXHRwcm9wczoge1xuXHRcdCRwYWdlcjogbnVsbCxcblx0XHR1cmw6IG51bGxcblx0fSxcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIGZpbGVzKSB7XG5cblx0XHRjb25zdCB7dXJsLCAkcGFnZXJ9ID0gdGhpcy5wcm9wc1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHR1cmxcblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0dGhpcy5vbkFjdGlvbiA9IGZ1bmN0aW9uKGFjdGlvbikge1xuXHRcdFx0Y29uc29sZS5sb2coJ29uQWN0aW9uJywgYWN0aW9uKVxuXHRcdFx0Y29uc3QgZmlsZU5hbWUgPSAnU05BUCcgKyBEYXRlLm5vdygpICsgJy5wbmcnXG5cdFx0XHRjb25zb2xlLmxvZygnZmlsZU5hbWUnLCBmaWxlTmFtZSlcblxuXHRcdFx0ZmlsZXMudXBsb2FkRmlsZSh1cmwsIGZpbGVOYW1lLCAnL2ltYWdlcy9jYW1lcmEnKS50aGVuKGZ1bmN0aW9uKHJlc3ApIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKVxuXHRcdFx0XHQkcGFnZXIucG9wUGFnZSgpXG5cdFx0XHR9KVx0XG5cdFx0XHQuY2F0Y2goZnVuY3Rpb24ocmVzcCkge1xuXHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe1xuXHRcdFx0XHRcdHRpdGxlOiAnRXJyb3InLFxuXHRcdFx0XHRcdGNvbnRlbnQ6IHJlc3AucmVzcG9uc2VUZXh0XG5cdFx0XHRcdH0pXG5cdFx0XHR9KVx0XHRcdFxuXHRcdH1cblxuXHR9XG59KTtcblxuXG5cblxuIl19
