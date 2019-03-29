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
					$pager.pushPage('snap', 'Snapshot', {url})					
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

	template: "<div bn-control=\"brainjs.pager\" bn-data=\"{pages}\"></div>\n",

	init: function(elt) {

		const ctrl = $$.viewController(elt, {
			data: {
				pages: [

					{name: 'first', control: 'firstPage'},
					{name: 'snap', control: 'snapPage', title: 'Picture', buttons: [
						{label: 'Save', name: 'save'}
					]}
				]
			}
		})
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





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpcnN0LmpzIiwibWFpbi5qcyIsInNuYXAuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2ZpcnN0UGFnZScsIHtcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LmZpbGVzJ10sXG5cblx0dGVtcGxhdGU6IFwiPGRpdiBjbGFzcz1cXFwibWFpblxcXCI+XFxuXHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuY2FtZXJhXFxcIiBibi1pZmFjZT1cXFwiY2FtZXJhXFxcIiBibi1kYXRhPVxcXCJ7Zm9ybWF0fVxcXCI+PC9kaXY+XHRcXG5cXG5cdDxidXR0b24gdGl0bGU9XFxcIlRha2UgcGljdHVyZVxcXCIgXFxuXHRibi1ldmVudD1cXFwiY2xpY2s6IG9uVGFrZVBpY3R1cmVcXFwiIGNsYXNzPVxcXCJ3My1idG4gdzMtYmx1ZVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLWNhbWVyYVxcXCI+PC9pPjwvYnV0dG9uPlx0XFxuPC9kaXY+XFxuXCIsXG5cblx0cHJvcHM6IHtcblx0XHQkcGFnZXI6IG51bGxcblx0fSxcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIHNydkZpbGVzKSB7XG5cblx0XHRjb25zdCBhdWRpbyA9IG5ldyBBdWRpbygnL3dlYmFwcHMvY2FtZXJhL2Fzc2V0cy9jYW1lcmFfc2h1dHRlci5tcDMnKVxuXG5cdFx0Y29uc3QgeyRwYWdlcn0gPSB0aGlzLnByb3BzXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGZvcm1hdDogZ2V0Rm9ybWF0KCksXG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uVGFrZVBpY3R1cmU6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0YXVkaW8ucGxheSgpXG5cdFx0XHRcdFx0Y29uc3QgdXJsID0gY3RybC5zY29wZS5jYW1lcmEudGFrZVBpY3R1cmUoKVxuXHRcdFx0XHRcdCRwYWdlci5wdXNoUGFnZSgnc25hcCcsICdTbmFwc2hvdCcsIHt1cmx9KVx0XHRcdFx0XHRcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHRmdW5jdGlvbiBnZXRGb3JtYXQoKSB7XG5cdFx0XHRyZXR1cm4gd2luZG93LmlubmVyV2lkdGggPCA3MDAgPyAndmdhJyA6ICdoZCdcblx0XHR9XG5cblx0XHRjdHJsLnNjb3BlLmNhbWVyYS5zdGFydCgpXG5cdH1cbn0pO1xuXG5cblxuXG4iLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3QubWFpbicsIHtcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMucGFnZXJcXFwiIGJuLWRhdGE9XFxcIntwYWdlc31cXFwiPjwvZGl2PlxcblwiLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCkge1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRwYWdlczogW1xuXG5cdFx0XHRcdFx0e25hbWU6ICdmaXJzdCcsIGNvbnRyb2w6ICdmaXJzdFBhZ2UnfSxcblx0XHRcdFx0XHR7bmFtZTogJ3NuYXAnLCBjb250cm9sOiAnc25hcFBhZ2UnLCB0aXRsZTogJ1BpY3R1cmUnLCBidXR0b25zOiBbXG5cdFx0XHRcdFx0XHR7bGFiZWw6ICdTYXZlJywgbmFtZTogJ3NhdmUnfVxuXHRcdFx0XHRcdF19XG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHR9KVxuXHR9XG5cbn0pO1xuXG5cblxuXG4iLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnc25hcFBhZ2UnLCB7XG5cblx0ZGVwczogWydicmVpemJvdC5maWxlcyddLFxuXG5cdHRlbXBsYXRlOiBcIjxpbWcgYm4tYXR0cj1cXFwie3NyYzogdXJsfVxcXCI+XCIsXG5cblx0cHJvcHM6IHtcblx0XHQkcGFnZXI6IG51bGwsXG5cdFx0dXJsOiBudWxsXG5cdH0sXG5cblx0aW5pdDogZnVuY3Rpb24oZWx0LCBmaWxlcykge1xuXG5cdFx0Y29uc3Qge3VybCwgJHBhZ2VyfSA9IHRoaXMucHJvcHNcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0dXJsXG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdHRoaXMub25BY3Rpb24gPSBmdW5jdGlvbihhY3Rpb24pIHtcblx0XHRcdGNvbnNvbGUubG9nKCdvbkFjdGlvbicsIGFjdGlvbilcblx0XHRcdGNvbnN0IGZpbGVOYW1lID0gJ1NOQVAnICsgRGF0ZS5ub3coKSArICcucG5nJ1xuXHRcdFx0Y29uc29sZS5sb2coJ2ZpbGVOYW1lJywgZmlsZU5hbWUpXG5cblx0XHRcdGZpbGVzLnVwbG9hZEZpbGUodXJsLCBmaWxlTmFtZSwgJy9pbWFnZXMvY2FtZXJhJykudGhlbihmdW5jdGlvbihyZXNwKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcClcblx0XHRcdFx0JHBhZ2VyLnBvcFBhZ2UoKVxuXHRcdFx0fSlcdFxuXHRcdFx0LmNhdGNoKGZ1bmN0aW9uKHJlc3ApIHtcblx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHtcblx0XHRcdFx0XHR0aXRsZTogJ0Vycm9yJyxcblx0XHRcdFx0XHRjb250ZW50OiByZXNwLnJlc3BvbnNlVGV4dFxuXHRcdFx0XHR9KVxuXHRcdFx0fSlcdFx0XHRcblx0XHR9XG5cblx0fVxufSk7XG5cblxuXG5cbiJdfQ==
