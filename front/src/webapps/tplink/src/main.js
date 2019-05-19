$$.control.registerControl('rootPage', {

	deps: ['breizbot.broker'],

	template: {gulp_inject: './main.html'},

	init: function(elt, broker) {

		const ctrl = $$.viewController(elt, {
			data: {
				devices: [],
				homeboxConnected: false
			},
			events: {
				onAction: function() {
					const cmd = $(this).data('cmd')
					//console.log('cmd', cmd)
					const deviceId = $(this).closest('tr').data('deviceId')
					//console.log('deviceId', deviceId)
					broker.emitTopic('homebox.tplink.cmd', {cmd, deviceId})
				}
			}
		})

		broker.register('homebox.tplink.status', (msg) => {
			var devices = msg.data || []

			console.log('devices', devices)
			ctrl.setData({devices})
		})

		broker.register('breizbot.homebox.status', (msg) => {
			ctrl.setData({homeboxConnected: msg.data.connected})
		})		
	}
});




