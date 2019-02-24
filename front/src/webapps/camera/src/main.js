$$.control.registerControl('breizbot.main', {

	deps: ['breizbot.files'],

	template: {gulp_inject: './main.html'},

	init: function(elt, srvFiles) {

		const ctrl = $$.viewController(elt, {
			data: {
			},
			events: {
				onTakePicture: function(ev) {
					const url = ctrl.scope.camera.takePicture()
					$$.ui.showConfirm({
						okText: 'Save',
						cancelText: 'Close',
						content: `<img src="${url}" width="400">`
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




