$$.control.registerControl('breizbot.main', {

	deps: ['breizbot.files'],

	template: "<div>\n	<button title=\"Take picture\" \n	bn-event=\"click: onTakePicture\" class=\"w3-btn w3-blue\"><i class=\"fa fa-camera\"></i></button>	\n</div>\n<div bn-control=\"brainjs.camera\" bn-iface=\"camera\"></div>	\n",

	init: function(elt, srvFiles) {

		const audio = new Audio('/webapps/camera/assets/camera_shutter.mp3')

		const ctrl = $$.viewController(elt, {
			data: {
			},
			events: {
				onTakePicture: function(ev) {
					audio.play()
					const url = ctrl.scope.camera.takePicture()
					$$.ui.showConfirm({
						okText: 'Save',
						cancelText: 'Close',
						content: `<img src="${url}" width="400">`,
						width: 'auto', 
						title: 'Picture',
						position: { my: 'left top', at: 'left top', of: $('.breizbot-main') }
					}, function() {
						const fileName = 'SNAP' + Date.now() + '.png'
						console.log('fileName', fileName)

						srvFiles.uploadFile(url, fileName, '/images/camera').then(function(resp) {
							console.log('resp', resp)
						})	
						.catch(function(resp) {
							$$.ui.showAlert({
								title: 'Error',
								content: resp.responseText
							})
						})
					})					
				}
			}
		})

		ctrl.scope.camera.start()
	}
});





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJhcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3QubWFpbicsIHtcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LmZpbGVzJ10sXG5cblx0dGVtcGxhdGU6IFwiPGRpdj5cXG5cdDxidXR0b24gdGl0bGU9XFxcIlRha2UgcGljdHVyZVxcXCIgXFxuXHRibi1ldmVudD1cXFwiY2xpY2s6IG9uVGFrZVBpY3R1cmVcXFwiIGNsYXNzPVxcXCJ3My1idG4gdzMtYmx1ZVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLWNhbWVyYVxcXCI+PC9pPjwvYnV0dG9uPlx0XFxuPC9kaXY+XFxuPGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmNhbWVyYVxcXCIgYm4taWZhY2U9XFxcImNhbWVyYVxcXCI+PC9kaXY+XHRcXG5cIixcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIHNydkZpbGVzKSB7XG5cblx0XHRjb25zdCBhdWRpbyA9IG5ldyBBdWRpbygnL3dlYmFwcHMvY2FtZXJhL2Fzc2V0cy9jYW1lcmFfc2h1dHRlci5tcDMnKVxuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvblRha2VQaWN0dXJlOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGF1ZGlvLnBsYXkoKVxuXHRcdFx0XHRcdGNvbnN0IHVybCA9IGN0cmwuc2NvcGUuY2FtZXJhLnRha2VQaWN0dXJlKClcblx0XHRcdFx0XHQkJC51aS5zaG93Q29uZmlybSh7XG5cdFx0XHRcdFx0XHRva1RleHQ6ICdTYXZlJyxcblx0XHRcdFx0XHRcdGNhbmNlbFRleHQ6ICdDbG9zZScsXG5cdFx0XHRcdFx0XHRjb250ZW50OiBgPGltZyBzcmM9XCIke3VybH1cIiB3aWR0aD1cIjQwMFwiPmAsXG5cdFx0XHRcdFx0XHR3aWR0aDogJ2F1dG8nLCBcblx0XHRcdFx0XHRcdHRpdGxlOiAnUGljdHVyZScsXG5cdFx0XHRcdFx0XHRwb3NpdGlvbjogeyBteTogJ2xlZnQgdG9wJywgYXQ6ICdsZWZ0IHRvcCcsIG9mOiAkKCcuYnJlaXpib3QtbWFpbicpIH1cblx0XHRcdFx0XHR9LCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdGNvbnN0IGZpbGVOYW1lID0gJ1NOQVAnICsgRGF0ZS5ub3coKSArICcucG5nJ1xuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ2ZpbGVOYW1lJywgZmlsZU5hbWUpXG5cblx0XHRcdFx0XHRcdHNydkZpbGVzLnVwbG9hZEZpbGUodXJsLCBmaWxlTmFtZSwgJy9pbWFnZXMvY2FtZXJhJykudGhlbihmdW5jdGlvbihyZXNwKSB7XG5cdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcClcblx0XHRcdFx0XHRcdH0pXHRcblx0XHRcdFx0XHRcdC5jYXRjaChmdW5jdGlvbihyZXNwKSB7XG5cdFx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7XG5cdFx0XHRcdFx0XHRcdFx0dGl0bGU6ICdFcnJvcicsXG5cdFx0XHRcdFx0XHRcdFx0Y29udGVudDogcmVzcC5yZXNwb25zZVRleHRcblx0XHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0fSlcdFx0XHRcdFx0XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0Y3RybC5zY29wZS5jYW1lcmEuc3RhcnQoKVxuXHR9XG59KTtcblxuXG5cblxuIl19
