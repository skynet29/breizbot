$$.control.registerControl('firstPage', {

	deps: ['breizbot.files'],

	template: {gulp_inject: './first.html'},

	props: {
		$pager: null
	},

	init: function(elt, srvFiles) {

		const audio = new Audio('/webapps/camera/assets/camera_shutter.mp3')

		const {$pager} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				format: getFormat(),
			},
			events: {
				onTakePicture: function(ev) {
					audio.play()
					const url = ctrl.scope.camera.takePicture()
					$pager.pushPage('snapPage', {
						title: 'Snapshot', 
						props: {url},
						buttons: [
							{label: 'Save', name: 'save'}
						]
					})					
				}
			}
		})

		function getFormat() {
			return window.innerWidth < 700 ? 'vga' : 'hd'
		}

		ctrl.scope.camera.start()
	}
});




