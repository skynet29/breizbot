$$.control.registerControl('soundPage', {

	template: { gulp_inject: './sound.html' },

	props: {
		url: '',
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
			ctrl.scope.audio.get(0).pause()
			ctrl.scope.audio.removeAttr('src')
		}

	}
});




