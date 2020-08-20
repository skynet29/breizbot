$$.control.registerControl('videoPage', {

	template: { gulp_inject: './video.html' },

	props: {
		url: ''
	},


	init: function (elt) {

		const { url } = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				url
			}
		})

		this.dispose = function () {
			//console.log('[media] dispose')
			ctrl.scope.video.get(0).pause()
			ctrl.scope.video.removeAttr('src')
		}

	}
});




