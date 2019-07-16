$$.control.registerControl('rootPage', {

	deps: ['breizbot.files'],

	template: {gulp_inject: './main.html'},

	props: {
		$pager: null
	},

	init: function(elt, srvFiles) {

		const audio = new Audio('/webapps/camera/assets/camera_shutter.mp3')

		const {$pager} = this.props


		const ctrl = $$.viewController(elt, {
			data: {
				ready: false,
				videoDevices: [],
				constraints: {video: true}
			},
			events: {
				onCameraReady: function() {
					console.log('onCameraReady')
					ctrl.setData({ready: true})
				},
				onTakePicture: function(ev) {
					audio.play()
					const url = ctrl.scope.camera.takePicture()
					$pager.pushPage('snapPage', {
						title: 'Snapshot', 
						props: {url}
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
		})

		ctrl.scope.camera.start()

	}


});




