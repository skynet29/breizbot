$$.control.registerControl('rootPage', {

	deps: ['breizbot.files'],

	template: {gulp_inject: './main.html'},

	props: {
		$pager: null
	},

	init: function(elt, srvFiles) {

		const audio = new Audio('/webapps/camera/assets/camera_shutter.mp3')

		const {$pager} = this.props

		console.log('width', elt.width(), 'height', elt.height())


		const ctrl = $$.viewController(elt, {
			data: {
				ready: false
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
				}
			}
		})


		ctrl.scope.camera.start()

		window.addEventListener('resize', function() {
			console.log('onresize')
			ctrl.setData({
				constraints: {
					width: {max: elt.width()},
					height: {max: elt.height()}
				}
			})
		})		
	}


});




