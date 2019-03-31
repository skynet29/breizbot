$$.control.registerControl('rootPage', {

	deps: ['breizbot.broker'],

	template: "<div class=\"scrollPanel\">\n    <table class=\"w3-table-all w3-centered\">\n        <thead>\n            <tr class=\"w3-green\">\n                <th>Alias</th>\n                <th>Type</th>\n                <th>Properties</th>\n                <th>Actions</th>\n            </tr>\n        </thead>\n        <tbody bn-each=\"devices\" bn-iter=\"dev\" bn-event=\"click.action: onAction\">\n            <tr bn-data=\"{item: dev}\">\n                <td bn-text=\"dev.alias\"></td>\n                <td bn-text=\"dev.type\"></td>\n                <td bn-each=\"dev.props\" bn-iter=\"prop\">\n                    <div>\n                        <span bn-text=\"prop.label\"></span>:\n                        <span bn-text=\"prop.value\"></span>\n                    </div>\n                </td>\n                <td bn-each=\"dev.actions\" bn-iter=\"a\">\n                    <button class=\"action w3-btn w3-blue w3-margin-right\" \n                        bn-data=\"{action: a.cmd}\" \n                        bn-text=\"a.label\"></button>\n                </td>\n            </tr>       \n\n        </tbody>\n    </table>\n</div>",

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

				return {actions, props, alias, deviceId, type}
			})

			console.log('devices', devices)

			ctrl.setData({devices})
		})		
	}
});






//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJhcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgncm9vdFBhZ2UnLCB7XG5cblx0ZGVwczogWydicmVpemJvdC5icm9rZXInXSxcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGNsYXNzPVxcXCJzY3JvbGxQYW5lbFxcXCI+XFxuICAgIDx0YWJsZSBjbGFzcz1cXFwidzMtdGFibGUtYWxsIHczLWNlbnRlcmVkXFxcIj5cXG4gICAgICAgIDx0aGVhZD5cXG4gICAgICAgICAgICA8dHIgY2xhc3M9XFxcInczLWdyZWVuXFxcIj5cXG4gICAgICAgICAgICAgICAgPHRoPkFsaWFzPC90aD5cXG4gICAgICAgICAgICAgICAgPHRoPlR5cGU8L3RoPlxcbiAgICAgICAgICAgICAgICA8dGg+UHJvcGVydGllczwvdGg+XFxuICAgICAgICAgICAgICAgIDx0aD5BY3Rpb25zPC90aD5cXG4gICAgICAgICAgICA8L3RyPlxcbiAgICAgICAgPC90aGVhZD5cXG4gICAgICAgIDx0Ym9keSBibi1lYWNoPVxcXCJkZXZpY2VzXFxcIiBibi1pdGVyPVxcXCJkZXZcXFwiIGJuLWV2ZW50PVxcXCJjbGljay5hY3Rpb246IG9uQWN0aW9uXFxcIj5cXG4gICAgICAgICAgICA8dHIgYm4tZGF0YT1cXFwie2l0ZW06IGRldn1cXFwiPlxcbiAgICAgICAgICAgICAgICA8dGQgYm4tdGV4dD1cXFwiZGV2LmFsaWFzXFxcIj48L3RkPlxcbiAgICAgICAgICAgICAgICA8dGQgYm4tdGV4dD1cXFwiZGV2LnR5cGVcXFwiPjwvdGQ+XFxuICAgICAgICAgICAgICAgIDx0ZCBibi1lYWNoPVxcXCJkZXYucHJvcHNcXFwiIGJuLWl0ZXI9XFxcInByb3BcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGRpdj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBibi10ZXh0PVxcXCJwcm9wLmxhYmVsXFxcIj48L3NwYW4+OlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGJuLXRleHQ9XFxcInByb3AudmFsdWVcXFwiPjwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgICA8L3RkPlxcbiAgICAgICAgICAgICAgICA8dGQgYm4tZWFjaD1cXFwiZGV2LmFjdGlvbnNcXFwiIGJuLWl0ZXI9XFxcImFcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwiYWN0aW9uIHczLWJ0biB3My1ibHVlIHczLW1hcmdpbi1yaWdodFxcXCIgXFxuICAgICAgICAgICAgICAgICAgICAgICAgYm4tZGF0YT1cXFwie2FjdGlvbjogYS5jbWR9XFxcIiBcXG4gICAgICAgICAgICAgICAgICAgICAgICBibi10ZXh0PVxcXCJhLmxhYmVsXFxcIj48L2J1dHRvbj5cXG4gICAgICAgICAgICAgICAgPC90ZD5cXG4gICAgICAgICAgICA8L3RyPiAgICAgICBcXG5cXG4gICAgICAgIDwvdGJvZHk+XFxuICAgIDwvdGFibGU+XFxuPC9kaXY+XCIsXG5cblx0aW5pdDogZnVuY3Rpb24oZWx0LCBicm9rZXIpIHtcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0ZGV2aWNlczogW11cdFx0XHRcdFxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvbkFjdGlvbjogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Y29uc3QgYWN0aW9uID0gJCh0aGlzKS5kYXRhKCdhY3Rpb24nKVxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdhY3Rpb24nLCBhY3Rpb24pXG5cdFx0XHRcdFx0Y29uc3Qge2RldmljZUlkLCB0eXBlfSA9ICQodGhpcykuY2xvc2VzdCgndHInKS5kYXRhKCdpdGVtJylcblx0XHRcdFx0XHRjb25zdCBhY3Rpb25zRGVzYyA9IHR5cGVzRGVzY1t0eXBlXS5hY3Rpb25zXG5cdFx0XHRcdFx0Y29uc3Qge2FyZ3MsIGxhYmVsfSA9IGFjdGlvbnNEZXNjW2FjdGlvbl1cblx0XHRcdFx0XHRjb25zb2xlLmxvZygnYXJncycsIGFyZ3MpXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdkZXZpY2VJZCcsIGRldmljZUlkKVxuXHRcdFx0XHRcdGlmIChhcmdzICE9IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdFx0JCQudWkuc2hvd0Zvcm0oe1xuXHRcdFx0XHRcdFx0XHRmaWVsZHM6IGFyZ3MsXG5cdFx0XHRcdFx0XHRcdHRpdGxlOiBsYWJlbFxuXHRcdFx0XHRcdFx0fSwgZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdkYXRhJywgZGF0YSlcblx0XHRcdFx0XHRcdFx0YnJva2VyLmVtaXRUb3BpYygnaG9tZWJveC5hcmR1aW5vLmNtZCcsIHtkZXZpY2VJZCwgY21kOiBhY3Rpb24sIGFyZ3M6IGRhdGF9KVxuXHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRicm9rZXIuZW1pdFRvcGljKCdob21lYm94LmFyZHVpbm8uY21kJywge2RldmljZUlkLCBjbWQ6IGFjdGlvbn0pXG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0bGV0IHR5cGVzRGVzYyA9IHt9XG5cblx0XHRicm9rZXIucmVnaXN0ZXIoJ2hvbWVib3guYXJkdWluby50eXBlcycsIGZ1bmN0aW9uKG1zZykge1xuXHRcdFx0Y29uc29sZS5sb2coJ21zZycsIG1zZylcblx0XHRcdHR5cGVzRGVzYyA9IG1zZy5kYXRhXG5cdFx0fSlcblxuXHRcdGJyb2tlci5yZWdpc3RlcignaG9tZWJveC5hcmR1aW5vLnN0YXR1cycsIGZ1bmN0aW9uKG1zZykge1xuXHRcdFx0Y29uc29sZS5sb2coJ21zZycsIG1zZylcblxuXHRcdFx0Y29uc3QgZGV2aWNlcyA9IG1zZy5kYXRhLm1hcCgoZGV2aWNlKSA9PiB7XG5cdFx0XHRcdGNvbnN0IHtwcm9wZXJ0aWVzLCBhbGlhcywgZGV2aWNlSWQsIHR5cGV9ID0gZGV2aWNlXG5cblx0XHRcdFx0Y29uc3QgdHlwZURlc2MgPSB0eXBlc0Rlc2NbdHlwZV1cblxuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCd0eXBlRGVzYycsIHR5cGVEZXNjKVxuXG5cdFx0XHRcdGNvbnN0IHByb3BzID0gW11cblxuXHRcdFx0XHRmb3IobGV0IHByb3BOYW1lIGluIHByb3BlcnRpZXMpIHtcblx0XHRcdFx0XHRjb25zdCB2YWx1ZSA9IHByb3BlcnRpZXNbcHJvcE5hbWVdXG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygndmFsdWUnLCB2YWx1ZSlcblxuXG5cblx0XHRcdFx0XHRjb25zdCBsYWJlbCA9IHR5cGVEZXNjLnByb3BlcnRpZXNbcHJvcE5hbWVdLmxhYmVsXG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnbGFiZWwnLCBsYWJlbClcblxuXHRcdFx0XHRcdHByb3BzLnB1c2goe3ZhbHVlLCBsYWJlbCwgcHJvcE5hbWV9KVxuXG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjb25zdCBhY3Rpb25zID0gW11cblx0XHRcdFx0Y29uc3QgYWN0aW9uc0Rlc2MgPSB0eXBlRGVzYy5hY3Rpb25zXG5cdFx0XHRcdGZvcihsZXQgY21kIGluIGFjdGlvbnNEZXNjKSB7XG5cdFx0XHRcdFx0Y29uc3Qge2xhYmVsfSA9IGFjdGlvbnNEZXNjW2NtZF1cblx0XHRcdFx0XHRhY3Rpb25zLnB1c2goe2xhYmVsLCBjbWR9KVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0cmV0dXJuIHthY3Rpb25zLCBwcm9wcywgYWxpYXMsIGRldmljZUlkLCB0eXBlfVxuXHRcdFx0fSlcblxuXHRcdFx0Y29uc29sZS5sb2coJ2RldmljZXMnLCBkZXZpY2VzKVxuXG5cdFx0XHRjdHJsLnNldERhdGEoe2RldmljZXN9KVxuXHRcdH0pXHRcdFxuXHR9XG59KTtcblxuXG5cblxuXG4iXX0=
