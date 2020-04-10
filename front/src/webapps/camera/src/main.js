$$.control.registerControl('rootPage', {

	deps: ['breizbot.files', 'breizbot.pager'],

	template: {gulp_inject: './main.html'},


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
				},
				hasZoom: false
			},
			events: {
				onCameraReady: function() {
					console.log('onCameraReady')
					const iface = $(this).iface()
					setTimeout(() => {
						const capabilities = iface.getCapabilities()
						console.log('capabilities', capabilities)

						if (capabilities.zoom) {
							const settings = iface.getSettings()
							console.log('settings', settings)
							const {min, max, step} = capabilities.zoom
							ctrl.scope.slider.setData({min, max, step})
							ctrl.scope.slider.setValue(settings.zoom)
							ctrl.setData({hasZoom: true})
						}
	
					}, 500)
					
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


				},
				onZoomChange: function(ev) {
					const value = $(this).getValue()
					console.log('onZoomChange', value)
					ctrl.scope.camera.setZoom(value)
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




