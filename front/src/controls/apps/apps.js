$$.control.registerControl('breizbot.apps', {

	props: {
		apps: []
	},

	template: {gulp_inject: './apps.html'},

	init: function(elt) {

		const ctrl = $$.viewController(elt, {
			data: {
				apps: this.props.apps

			},
			events: {
				onTileClick: function(ev) {
					//console.log('onTileClick', $(this).data('item'))
					elt.trigger('appclick', $(this).data('item'))
				}
			}
		})

		this.update = function(data) {
			ctrl.setData(data)
		}
	}
});

