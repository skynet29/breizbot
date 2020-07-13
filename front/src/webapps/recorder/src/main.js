$$.control.registerControl('rootPage', {

	deps: ['breizbot.files', 'breizbot.pager'],

	template: { gulp_inject: './main.html' },


	init: function (elt, srvFiles, pager) {

		const savingDlg = $$.ui.progressDialog()

		let timer = null
		let startTime = 0


		async function saveVideo(blob) {
			const fileName = 'VIDEO' + Date.now() + '.webm'
			console.log('fileName', fileName)
			try {
				savingDlg.show()
				const resp = await srvFiles.saveFile(blob, fileName, (percentage) => {
					savingDlg.setPercentage(percentage)
				})
				await $$.util.wait(1000)
				savingDlg.hide()
				console.log('resp', resp)
				//pager.popPage()
			}
			catch (resp) {
				savingDlg.hide()
				$$.ui.showAlert({
					title: 'Error',
					content: resp.responseText
				})

			}
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
					ctrl.scope.camera.startRecord()
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
					ctrl.scope.camera.stopRecord()
					clearInterval(timer)
					timer = null
					ctrl.setData({ recording: false })
				},
				onVideoRecord: function (ev, blob) {
					console.log('onVideoRecord', blob)

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
					console.log('onCameraReady')
					const iface = $(this).iface()
					const capabilities = await iface.getCapabilities()
					console.log('capabilities', capabilities)

					if (capabilities.zoom) {
						const settings = iface.getSettings()
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
					ctrl.scope.camera.setZoom(value)
				}
			}
		})

		async function getVideoDevices() {
			const videoDevices = await $$.util.getVideoDevices()
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




