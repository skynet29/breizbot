$$.control.registerControl('breizbot.apps', {

	props: {
		apps: [],
		showActivated: false,
		items: null
	},

	template: { gulp_inject: './apps.html' },

	init: function (elt) {

		const { apps, showActivated, items } = this.props
		console.log('apps', apps)

		const ctrl = $$.viewController(elt, {
			data: {
				getItems: function (scope) {
					//console.log('getItems', scope.app)
					return (typeof items == 'function') ? items(scope.app) : items
				},
				apps,
				showActivated,
				show1: function (scope) {
					return this.showActivated && scope.app.activated
				},
				class1: function (scope) {
					const {title, colorCls} = scope.app.props
					const ret = {
						title,
						class: 'tile w3-btn'

					}
					if (colorCls.startsWith('#')) {
						ret.style = `background-color: ${colorCls}`
					}
					else {
						ret.class += ' ' + colorCls
					}
					return ret
				},
				show2: function (scope) {
					return typeof scope.app.props.iconCls == 'string'
				},
				show3: function (scope) {
					return typeof scope.app.props.iconUrl == 'string'
				},
				getIconUrl(scope) {
					const { appName, props } = scope.app
					return `/webapps/${appName}/assets/${props.iconUrl}`
				}
			},
			events: {
				onTileClick: function (ev) {
					//console.log('onTileClick', $(this).data('item'))
					const idx = $(this).index()
					elt.trigger('appclick', ctrl.model.apps[idx])
				},
				onTileContextMenu: function (ev, data) {
					const idx = $(this).index()
					//console.log('onTileContextMenu', data)
					const { cmd } = data
					const info = $.extend({ cmd }, ctrl.model.apps[idx])
					elt.trigger('appcontextmenu', info)
				}
			}
		})


		this.setData = function (data) {
			console.log('data', data)
			ctrl.setData({
				apps: data.apps.filter((a) => a.props.visible != false && a.appName != 'template')
			})
		}

	}

});

