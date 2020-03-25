$$.control.registerControl('rootPage', {

	deps: ['breizbot.files', 'breizbot.pager'],

	template: {gulp_inject: './main.html'},


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




