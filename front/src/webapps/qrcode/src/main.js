$$.control.registerControl('rootPage', {

	template: {gulp_inject: './main.html'},


	init: function(elt) {

		const barcodeDetector = new BarcodeDetector()
		let imageCapture = null
		
		function detect() {
			imageCapture.grabFrame().then((bitmap) => {
				return barcodeDetector.detect(bitmap)
			})
			.then((barcodes) => {
				if (barcodes.length == 0) {
					setTimeout(detect, 1000)
				}
				else {
					console.log('barcodes', barcodes)
					const {format, rawValue} = barcodes[0]
					let content = null
					if (format == 'qr_code') {
						content = {
							link: `<a href="${rawValue}" target="_blank">${rawValue}</a>`
						}
					}
					else {
						content = {
							format,
							value: rawValue
						}
					}
					$$.ui.showAlert({title: 'BarCode Detected', content}, () => {
						detect()
					})
				}
			})
			.catch((e) => {
				console.error('BarcodeDetection failed: ', e)
				$$.ui.showAlert({title: 'Error', content: e.message})
			})
		}

		const ctrl = $$.viewController(elt, {
			data: {
				showMessage: false,
				hasZoom: false
			},
			events: {
				onCameraReady: function(ev) {
					console.log('onCameraReady')
					const iface = $(this).iface()
					imageCapture = iface.getImageCapture()

					setTimeout(() => {
						const capabilities = iface.getCapabilities()
						//console.log('capabilities', capabilities)

						if (capabilities.zoom) {
							const settings = iface.getSettings()
							//console.log('settings', settings)
							const {min, max, step} = capabilities.zoom
							ctrl.scope.slider.setData({min, max, step})
							ctrl.scope.slider.setValue(settings.zoom)
							ctrl.setData({hasZoom: true})
						}

						detect()

	
					}, 500)
					
				},
				onZoomChange: function(ev) {
					const value = $(this).getValue()
					console.log('onZoomChange', value)
					ctrl.scope.camera.setZoom(value)
				}
			}
		})

		$$.util.getVideoDevices().then((videoDevices) => {
			if (videoDevices.length > 0) {
				ctrl.scope.camera.start()
			}
			else {
				ctrl.setData({showMessage: true})
			}
		})

		

	}


});




