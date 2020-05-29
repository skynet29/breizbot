$$.control.registerControl('rootPage', {

	deps: ['breizbot.broker'],

	template: {gulp_inject: './main.html'},

	init: function(elt, broker) {

		const ctrl = $$.viewController(elt, {
			data: {
				agents: [],
				homeboxConnected: false,
				isRunning: function(scope) {
					return scope.$i.pid != 0
				}
			},
			events: {
				onActionStart: function() {
					const agent = $(this).closest('td').data('agent')
					console.log('actionStart', agent)
					broker.emitTopic('homebox.launcher.startAgent', agent)				
				},
				onActionStop: function() {
					const agent = $(this).closest('td').data('agent')
					console.log('actionStop', agent)
					broker.emitTopic('homebox.launcher.stopAgent', agent)				
				},
				onActionStopForce: function() {
					const agent = $(this).closest('td').data('agent')
					console.log('actionStopForce', agent)
					broker.emitTopic('homebox.launcher.stopAgent', {agent: agent, force: true})				
				}
			}
		})

		function dispTable(agents) {
			const data = []

			for(var agent in agents) {
				var info = agents[agent]
				data.push({
					pid: info.pid,
					agent,
					state: info.state
				})
			}

			ctrl.setData({agents: data})
		}


		broker.register('homebox.launcher.status', (msg) => {
			//console.log('homebox.launcher.status', msg)
			dispTable(msg.data)
		})

		broker.register('breizbot.homebox.status', (msg) => {
			ctrl.setData({homeboxConnected: msg.data.connected})
		})
	}
});




