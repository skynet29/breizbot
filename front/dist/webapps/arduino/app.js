$$.control.registerControl('breizbot.main', {

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

				return {actions, props, actions, alias, deviceId, type}
			})

			console.log('devices', devices)

			ctrl.setData({devices})
		})		
	}
});






//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJhcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3QubWFpbicsIHtcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LmJyb2tlciddLFxuXG5cdHRlbXBsYXRlOiBcIjxkaXYgY2xhc3M9XFxcInNjcm9sbFBhbmVsXFxcIj5cXG4gICAgPHRhYmxlIGNsYXNzPVxcXCJ3My10YWJsZS1hbGwgdzMtY2VudGVyZWRcXFwiPlxcbiAgICAgICAgPHRoZWFkPlxcbiAgICAgICAgICAgIDx0ciBjbGFzcz1cXFwidzMtZ3JlZW5cXFwiPlxcbiAgICAgICAgICAgICAgICA8dGg+QWxpYXM8L3RoPlxcbiAgICAgICAgICAgICAgICA8dGg+VHlwZTwvdGg+XFxuICAgICAgICAgICAgICAgIDx0aD5Qcm9wZXJ0aWVzPC90aD5cXG4gICAgICAgICAgICAgICAgPHRoPkFjdGlvbnM8L3RoPlxcbiAgICAgICAgICAgIDwvdHI+XFxuICAgICAgICA8L3RoZWFkPlxcbiAgICAgICAgPHRib2R5IGJuLWVhY2g9XFxcImRldmljZXNcXFwiIGJuLWl0ZXI9XFxcImRldlxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrLmFjdGlvbjogb25BY3Rpb25cXFwiPlxcbiAgICAgICAgICAgIDx0ciBibi1kYXRhPVxcXCJ7aXRlbTogZGV2fVxcXCI+XFxuICAgICAgICAgICAgICAgIDx0ZCBibi10ZXh0PVxcXCJkZXYuYWxpYXNcXFwiPjwvdGQ+XFxuICAgICAgICAgICAgICAgIDx0ZCBibi10ZXh0PVxcXCJkZXYudHlwZVxcXCI+PC90ZD5cXG4gICAgICAgICAgICAgICAgPHRkIGJuLWVhY2g9XFxcImRldi5wcm9wc1xcXCIgYm4taXRlcj1cXFwicHJvcFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZGl2PlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGJuLXRleHQ9XFxcInByb3AubGFiZWxcXFwiPjwvc3Bhbj46XFxuICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gYm4tdGV4dD1cXFwicHJvcC52YWx1ZVxcXCI+PC9zcGFuPlxcbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICAgIDwvdGQ+XFxuICAgICAgICAgICAgICAgIDx0ZCBibi1lYWNoPVxcXCJkZXYuYWN0aW9uc1xcXCIgYm4taXRlcj1cXFwiYVxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVxcXCJhY3Rpb24gdzMtYnRuIHczLWJsdWUgdzMtbWFyZ2luLXJpZ2h0XFxcIiBcXG4gICAgICAgICAgICAgICAgICAgICAgICBibi1kYXRhPVxcXCJ7YWN0aW9uOiBhLmNtZH1cXFwiIFxcbiAgICAgICAgICAgICAgICAgICAgICAgIGJuLXRleHQ9XFxcImEubGFiZWxcXFwiPjwvYnV0dG9uPlxcbiAgICAgICAgICAgICAgICA8L3RkPlxcbiAgICAgICAgICAgIDwvdHI+ICAgICAgIFxcblxcbiAgICAgICAgPC90Ym9keT5cXG4gICAgPC90YWJsZT5cXG48L2Rpdj5cIixcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIGJyb2tlcikge1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRkZXZpY2VzOiBbXVx0XHRcdFx0XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uQWN0aW9uOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRjb25zdCBhY3Rpb24gPSAkKHRoaXMpLmRhdGEoJ2FjdGlvbicpXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ2FjdGlvbicsIGFjdGlvbilcblx0XHRcdFx0XHRjb25zdCB7ZGV2aWNlSWQsIHR5cGV9ID0gJCh0aGlzKS5jbG9zZXN0KCd0cicpLmRhdGEoJ2l0ZW0nKVxuXHRcdFx0XHRcdGNvbnN0IGFjdGlvbnNEZXNjID0gdHlwZXNEZXNjW3R5cGVdLmFjdGlvbnNcblx0XHRcdFx0XHRjb25zdCB7YXJncywgbGFiZWx9ID0gYWN0aW9uc0Rlc2NbYWN0aW9uXVxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdhcmdzJywgYXJncylcdFx0XHRcdFx0XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ2RldmljZUlkJywgZGV2aWNlSWQpXG5cdFx0XHRcdFx0aWYgKGFyZ3MgIT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0XHQkJC51aS5zaG93Rm9ybSh7XG5cdFx0XHRcdFx0XHRcdGZpZWxkczogYXJncyxcblx0XHRcdFx0XHRcdFx0dGl0bGU6IGxhYmVsXG5cdFx0XHRcdFx0XHR9LCBmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ2RhdGEnLCBkYXRhKVxuXHRcdFx0XHRcdFx0XHRicm9rZXIuZW1pdFRvcGljKCdob21lYm94LmFyZHVpbm8uY21kJywge2RldmljZUlkLCBjbWQ6IGFjdGlvbiwgYXJnczogZGF0YX0pXG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRcdGJyb2tlci5lbWl0VG9waWMoJ2hvbWVib3guYXJkdWluby5jbWQnLCB7ZGV2aWNlSWQsIGNtZDogYWN0aW9ufSlcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHRsZXQgdHlwZXNEZXNjID0ge31cblxuXHRcdGJyb2tlci5yZWdpc3RlcignaG9tZWJveC5hcmR1aW5vLnR5cGVzJywgZnVuY3Rpb24obXNnKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnbXNnJywgbXNnKVxuXHRcdFx0dHlwZXNEZXNjID0gbXNnLmRhdGFcblx0XHR9KVxuXG5cdFx0YnJva2VyLnJlZ2lzdGVyKCdob21lYm94LmFyZHVpbm8uc3RhdHVzJywgZnVuY3Rpb24obXNnKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnbXNnJywgbXNnKVxuXG5cdFx0XHRjb25zdCBkZXZpY2VzID0gbXNnLmRhdGEubWFwKChkZXZpY2UpID0+IHtcblx0XHRcdFx0Y29uc3Qge3Byb3BlcnRpZXMsIGFsaWFzLCBkZXZpY2VJZCwgdHlwZX0gPSBkZXZpY2VcblxuXHRcdFx0XHRjb25zdCB0eXBlRGVzYyA9IHR5cGVzRGVzY1t0eXBlXVxuXG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ3R5cGVEZXNjJywgdHlwZURlc2MpXG5cblx0XHRcdFx0Y29uc3QgcHJvcHMgPSBbXVxuXG5cdFx0XHRcdGZvcihsZXQgcHJvcE5hbWUgaW4gcHJvcGVydGllcykge1xuXHRcdFx0XHRcdGNvbnN0IHZhbHVlID0gcHJvcGVydGllc1twcm9wTmFtZV1cblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCd2YWx1ZScsIHZhbHVlKVxuXG5cblxuXHRcdFx0XHRcdGNvbnN0IGxhYmVsID0gdHlwZURlc2MucHJvcGVydGllc1twcm9wTmFtZV0ubGFiZWxcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdsYWJlbCcsIGxhYmVsKVxuXG5cdFx0XHRcdFx0cHJvcHMucHVzaCh7dmFsdWUsIGxhYmVsLCBwcm9wTmFtZX0pXG5cblx0XHRcdFx0fVxuXG5cdFx0XHRcdGNvbnN0IGFjdGlvbnMgPSBbXVxuXHRcdFx0XHRjb25zdCBhY3Rpb25zRGVzYyA9IHR5cGVEZXNjLmFjdGlvbnNcblx0XHRcdFx0Zm9yKGxldCBjbWQgaW4gYWN0aW9uc0Rlc2MpIHtcblx0XHRcdFx0XHRjb25zdCB7bGFiZWx9ID0gYWN0aW9uc0Rlc2NbY21kXVxuXHRcdFx0XHRcdGFjdGlvbnMucHVzaCh7bGFiZWwsIGNtZH0pXG5cdFx0XHRcdH1cblxuXHRcdFx0XHRyZXR1cm4ge2FjdGlvbnMsIHByb3BzLCBhY3Rpb25zLCBhbGlhcywgZGV2aWNlSWQsIHR5cGV9XG5cdFx0XHR9KVxuXG5cdFx0XHRjb25zb2xlLmxvZygnZGV2aWNlcycsIGRldmljZXMpXG5cblx0XHRcdGN0cmwuc2V0RGF0YSh7ZGV2aWNlc30pXG5cdFx0fSlcdFx0XG5cdH1cbn0pO1xuXG5cblxuXG5cbiJdfQ==
