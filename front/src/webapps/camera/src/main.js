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

		let timer = null
		let startTime = 0

		const audio = new Audio(srvFiles.assetsUrl('camera_shutter.mp3'))

		async function saveVideo(blob) {
			const fileName = 'VIDEO' + Date.now() + '.webm'
			//console.log('fileName', fileName)
			await srvFiles.saveFile(blob, fileName)
		}

		async function saveImage(blob) {
			const fileName = 'SNAP' + Date.now() + '.png'
			//console.log('fileName', fileName)
			await srvFiles.saveFile(blob, fileName)
			
		}

		
		const ctrl = $$.viewController(elt, {
			data: {
				ready: false,
				recording: false,
				barcodeDetectionAvailable: false,
				recordingTime: '',
				videoDevices: [],
				constraints: { video: true, audio: true },
				showMessage: false,
				barcodeDetectionStarted: false,
				show1: function () {
					return this.videoDevices.length > 1
				},
				canRecord: function () {
					return this.ready && !this.recording && !this.barcodeDetectionStarted
				},
				canStop: function () {
					return this.recording || this.barcodeDetectionStarted
				},
				canTakePicture: function() {
					return true
				},
				showBarcodeDetection: function() {
					return this.ready && this.barcodeDetectionAvailable && !this.recording && !this.barcodeDetectionStarted
				},
				hasZoom: false
			},
			events: {
				/**
				 * 
				 * @param {Brainjs.Controls.Camera.EventData.BarCode} data 
				 */
				 onBarcode: function (ev, data) {
					console.log('onBarcode', data)
					const { format, rawValue } = data
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
						ctrl.setData({barcodeDetectionStarted: false})
					})
				},				
				onStartBarcodeDetection: function() {
					ctrl.setData({barcodeDetectionStarted: true})
					camera.startBarcodeDetection()
				},
				onTakePicture: async function (ev) {
					audio.play()
					const blob = await camera.takePicture()
					const url = URL.createObjectURL(blob)
					pager.pushPage('breizbot.viewer', {
						title: 'Snapshot',
						/**@type {Breizbot.Controls.Viewer.Props} */
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
				onStartRecord: function (ev) {
					camera.startRecord()
					ctrl.setData({ recording: true, recordingTime: '00:00' })
					startTime = Date.now()
					timer = setInterval(() => {
						const diffMs = Date.now() - startTime
						let seconds = Math.floor((diffMs / 1000) % 60)
						let minutes = Math.floor((diffMs / (1000 * 60)) % 60)
						minutes = (minutes < 10) ? "0" + minutes : minutes
						seconds = (seconds < 10) ? "0" + seconds : seconds

						ctrl.setData({ recordingTime: `${minutes}:${seconds}` })

					}, 1000)
				},
				onStopRecord: function (ev) {
					if (ctrl.model.recording) {
						camera.stopRecord()
						clearInterval(timer)
						timer = null
						ctrl.setData({ recording: false })
	
					}
					else if (ctrl.model.barcodeDetectionStarted) {
						camera.stopBarcodeDetection()
						ctrl.setData({ barcodeDetectionStarted: false })
					}
				},
				/**
				 * 
				 * @param {Brainjs.Controls.Camera.EventData.VideoRcord} data 
				 */
				onVideoRecord: function (ev, data) {
					console.log('onVideoRecord', data)
					const { blob } = data

					const url = URL.createObjectURL(blob)

					pager.pushPage('breizbot.viewer', {
						title: 'Recorded Video',
						props: { url, type: 'video' },
						buttons: {
							save: {
								title: 'Save',
								icon: 'fa fa-save',
								onClick: function () {
									saveVideo(blob)
								}
							}
						},
						onBack: function () {
							URL.revokeObjectURL(url)
						}
					})

				},
				onCameraReady: async function () {
					//console.log('onCameraReady')
					const capabilities = await camera.getCapabilities()
					//console.log('capabilities', capabilities)

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
				onDeviceChange: function (ev, data) {
					console.log('onDeviceChange', $(this).getValue())
					const constraints = {
						audio: true,
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
		ctrl.setData({barcodeDetectionAvailable: camera.isBarcodeDetectionAvailable()})

		async function getVideoDevices() {
			const videoDevices = await $$.media.getVideoDevices()
			ctrl.setData({
				videoDevices: videoDevices.map((i) => {
					return { value: i.id, label: i.label }
				})
			})

			if (videoDevices.length > 0) {
				ctrl.scope.camera.start()
			}
			else {
				ctrl.setData({ showMessage: true })
			}
		}

		getVideoDevices()


	}


});




