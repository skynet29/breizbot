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


		async function saveVideo(blob) {
			const fileName = 'VIDEO' + Date.now() + '.webm'
			//console.log('fileName', fileName)
			await srvFiles.saveFile(blob, fileName)
		}

		const ctrl = $$.viewController(elt, {
			data: {
				ready: false,
				recording: false,
				recordingTime: '',
				videoDevices: [],
				constraints: { video: true, audio: true },
				showMessage: false,
				show1: function () {
					return this.videoDevices.length > 1
				},
				canRecord: function () {
					return this.ready && !this.recording
				},
				canStop: function () {
					return this.ready && this.recording
				},
				hasZoom: false
			},
			events: {
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
					camera.stopRecord()
					clearInterval(timer)
					timer = null
					ctrl.setData({ recording: false })
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




