$$.control.registerControl('breizbot.rtc', {

	deps: ['breizbot.rtc'],

	props: {
		appName: '',
		iconCls: '',
		title: 'Select a friend'
	},

	//template: {gulp_inject: './rtc.html'},

	init: function(elt, rtc) {

		const $pager = elt.closest('.brainjs-pager').iface()
		const {appName, iconCls, title} = this.props

		const $children = elt.children().remove()
		elt.append({gulp_inject: './rtc.html'})

		rtc.on('status', (data) => {
			//console.log('status', data)
			ctrl.setData(data)
		})		

		const ctrl = $$.viewController(elt, {
			data: {
				status: 'ready',
				distant: '',
				hasChildren: $children.length > 0
			},
			events: {
				onCall: function(ev) {
					console.log('onCall')

					$pager.pushPage('breizbot.friendsPage', {
						title,
						onReturn: function(userName) {
							rtc.call(userName, appName, iconCls)					
						}						
					})

				},
				onCancel: function(ev) {
					rtc.cancel()
				},
				onHangup: function(ev) {
					rtc.bye()
					elt.trigger('rtchangup')
				}

			}
		})

		ctrl.scope.panel.append($children)		
	}

});