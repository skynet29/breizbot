$$.control.registerControl('breizbot.main', {

	deps: ['breizbot.broker'],

	template: {gulp_inject: './main.html'},

	init: function(elt, broker) {

		const ctrl = $$.viewController(elt, {
			data: {
				devices: []				
			},
			events: {
				onAction: function() {
					const action = $(this).data('action')
					console.log('action', action)
					const {deviceId, type} = $(this).closest('tr').data('item')
					const actionsDesc = typesDesc[type].actions
					const {args, label} = actionsDesc[action]
					console.log('args', args)					
					console.log('deviceId', deviceId)
					if (args != undefined) {
						$$.ui.showForm({
							fields: args,
							title: label
						}, function(data) {
							//console.log('data', data)
							broker.emitTopic('homebox.arduino.cmd', {deviceId, cmd: action, args: data})
						})
					}
					else {
						broker.emitTopic('homebox.arduino.cmd', {deviceId, cmd: action})
					}

				}
			}
		})

		let typesDesc = {}

		broker.register('homebox.arduino.types', function(msg) {
			console.log('msg', msg)
			typesDesc = msg.data
		})

		broker.register('homebox.arduino.status', function(msg) {
			console.log('msg', msg)

			const devices = msg.data.map((device) => {
				const {properties, alias, deviceId, type} = device

				const typeDesc = typesDesc[type]

				//console.log('typeDesc', typeDesc)

				const props = []

				for(let propName in properties) {
					const value = properties[propName]
					//console.log('value', value)



					const label = typeDesc.properties[propName].label
					//console.log('label', label)

					props.push({value, label, propName})

				}

				const actions = []
				const actionsDesc = typeDesc.actions
				for(let cmd in actionsDesc) {
					const {label} = actionsDesc[cmd]
					actions.push({label, cmd})
				}

				return {actions, props, actions, alias, deviceId, type}
			})

			console.log('devices', devices)

			ctrl.setData({devices})
		})		
	}
});





