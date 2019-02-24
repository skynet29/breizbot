$$.control.registerControl('breizbot.apps', {

	props: {
		apps: []
	},

	template: {gulp_inject: './apps.html'},

	init: function(elt) {

		const ctrl = $$.viewController(elt, {
			data: {
				apps: this.props.apps,
				getClass: function() {
					const classes = ['tile', 'w3-btn']
					classes.push(this.app.props.colorCls)
					return classes.join(' ')
				},
				hasIcon: function() {
					return typeof this.app.props.iconCls == 'string'
				}
			},
			events: {
				onTileClick: function(ev) {
					//console.log('onTileClick', $(this).data('item'))
					elt.trigger('appclick', $(this).data('item'))
				}
			}
		})

		this.setApps = function(apps) {
			ctrl.setData({apps})
		}
	}
});

