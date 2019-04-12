$$.control.registerControl('breizbot.apps', {

	props: {
		apps: []
	},

	$iface: 'setData(data)',

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

		this.setData = function(data) {
			ctrl.setData(data)
		}
	}
});

