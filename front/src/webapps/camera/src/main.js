//@ts-check
$$.control.registerControl('rootPage', {

	deps: ['breizbot.files', 'breizbot.pager'],

	template: { gulp_inject: './main.html' },

	/**
	 * 
	 * @param {Breizbot.Services.Files.Interface} srvFiles 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 */
	init: function (elt, srvFiles, pager) {

		const audio = new Audio('/webapps/camera/assets/camera_shutter.mp3')

		async function saveImage(blob) {
			const fileName = 'SNAP' + Date.now() + '.png'
			//console.log('fileName', fileName)
			await srvFiles.saveFile(blob, fileName)
		}

		const ctrl = $$.viewController(elt, {
			data: {
				ready: false,
				videoDevices: [],
				constraints: { video: true },
				showMessage: false,
				show1: function () {
					return this.videoDevices.length > 1
				},
				hasZoom: false
			},
			events: {
				onCameraReady: async function () {
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


					ctrl.setData({ ready: true })
				},
				onTakePicture: async function (ev) {
					audio.play()
					const blob = await camera.takePicture()
					const url = URL.createObjectURL(blob)
					pager.pushPage('breizbot.viewer', {
						title: 'Snapshot',
						props: { url, type: 'image' },
						buttons: {
							save: {
								title: 'Save',
								icon: 'fa fa-save',
								onClick: function () {
									saveImage(blob)
								}
							}
						},
						onBack: function () {
							URL.revokeObjectURL(url)
						}
					})
				},
				onDeviceChange: function (ev, data) {
					console.log('onDeviceChange', $(this).getValue())
					const constraints = {
						video: {
							deviceId: {
								exact: $(this).getValue()
							}
						}
					}
					ctrl.setData({ constraints })


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

		async function getVideoDevices() {
			const videoDevices = await $$.util.getVideoDevices()
			ctrl.setData({
				videoDevices: videoDevices.map((i) => {
					return { value: i.id, label: i.label }
				})
			})

			if (videoDevices.length > 0) {
				camera.start()
			}
			else {
				ctrl.setData({ showMessage: true })
			}
		}

		getVideoDevices()


	}


});




