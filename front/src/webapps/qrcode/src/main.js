//@ts-check
$$.control.registerControl('rootPage', {
	

	template: { gulp_inject: './main.html' },


	init: function (elt) {

		const ctrl = $$.viewController(elt, {
			data: {
				showMessage: false,
				hasZoom: false
			},
			events: {
				onBarcode: function (ev, barcode) {
					console.log('onBarcode', barcode)
					const { format, rawValue } = barcode
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
					$$.ui.showAlert({ title: 'BarCode Detected', content }, () => {
						camera.startBarcodeDetection()
					})
				},
				onCameraReady: async function (ev) {
					console.log('onCameraReady')
					const capabilities = await camera.getCapabilities()
					console.log('capabilities', capabilities)

					if (capabilities.zoom) {
						const settings = camera.getSettings()
						//console.log('settings', settings)
						const { min, max, step } = capabilities.zoom
						ctrl.scope.slider.setData({ min, max, step })
						ctrl.scope.slider.setValue(settings.zoom)
						ctrl.setData({ hasZoom: true })
					}

					camera.startBarcodeDetection()

				},
				onZoomChange: function (ev) {
					const value = $(this).getValue()
					console.log('onZoomChange', value)
					camera.setZoom(value)
				}
			}
		})

		/**@type {Brainjs.Controls.Camera.Interface} */
		const camera = ctrl.scope.camera

		$$.util.getVideoDevices().then((videoDevices) => {
			if (videoDevices.length > 0) {
				camera.start()
			}
			else {
				ctrl.setData({ showMessage: true })
			}
		})



	}


});




