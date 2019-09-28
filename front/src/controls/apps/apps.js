$$.control.registerControl('breizbot.apps', {

	props: {
		apps: [],
		showActivated: false
	},

	$iface: 'setData(data)',

	template: {gulp_inject: './apps.html'},

	init: function(elt) {

		const {apps, showActivated} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				apps,
				showActivated,
				show1: function() {
					return this.showActivated && this.app.activated
				},
				class1: function() {
					return {class: `tile w3-btn ${this.app.props.colorCls}`}
				},
				show2: function() {
					return typeof this.app.props.iconCls == 'string'
				}
			},
			events: {
				onTileClick: function(ev) {
					//console.log('onTileClick', $(this).data('item'))
					const idx = $(this).index()
					elt.trigger('appclick', ctrl.model.apps[idx])
				}
			}
		})


		this.setData = function(data) {
			//console.log('data', data)
			ctrl.setData({
				apps: data.apps.filter((a) => a.props.visible != false && a.appName != 'template')
			})
		}

	},

	$iface: `setData(data)`,
	$events: 'appclick'
});

