$$.control.registerControl('rootPage', {

	deps: ['breizbot.broker'],

	template: "<div class=\"scrollPanel\">\n    <table class=\"w3-table-all w3-centered\">\n        <thead>\n            <tr class=\"w3-green\">\n                <th>Alias</th>\n                <th>Type</th>\n                <th>State</th>\n                <th>Actions</th>\n            </tr>\n        </thead>\n        <tbody bn-each=\"devices\" bn-event=\"click.action: onAction\">\n            <tr bn-data=\"{deviceId: $i.deviceId}\">\n                <td bn-text=\"$i.alias\"></td>\n                <td bn-text=\"$i.type\"></td>\n                <td bn-text=\"$i.state\"></td>\n                <td bn-each=\"$i.actions\" bn-iter=\"a\"> \n                    <button class=\"action w3-btn w3-blue w3-margin-right\" bn-data=\"{cmd: a.cmd}\" bn-text=\"a.label\"></button>\n                </td>\n            </tr>       \n\n        </tbody>\n    </table>\n</div>",

	init: function(elt, broker) {

		const ctrl = $$.viewController(elt, {
			data: {
				devices: []
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
	}
});





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImFwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdyb290UGFnZScsIHtcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LmJyb2tlciddLFxuXG5cdHRlbXBsYXRlOiBcIjxkaXYgY2xhc3M9XFxcInNjcm9sbFBhbmVsXFxcIj5cXG4gICAgPHRhYmxlIGNsYXNzPVxcXCJ3My10YWJsZS1hbGwgdzMtY2VudGVyZWRcXFwiPlxcbiAgICAgICAgPHRoZWFkPlxcbiAgICAgICAgICAgIDx0ciBjbGFzcz1cXFwidzMtZ3JlZW5cXFwiPlxcbiAgICAgICAgICAgICAgICA8dGg+QWxpYXM8L3RoPlxcbiAgICAgICAgICAgICAgICA8dGg+VHlwZTwvdGg+XFxuICAgICAgICAgICAgICAgIDx0aD5TdGF0ZTwvdGg+XFxuICAgICAgICAgICAgICAgIDx0aD5BY3Rpb25zPC90aD5cXG4gICAgICAgICAgICA8L3RyPlxcbiAgICAgICAgPC90aGVhZD5cXG4gICAgICAgIDx0Ym9keSBibi1lYWNoPVxcXCJkZXZpY2VzXFxcIiBibi1ldmVudD1cXFwiY2xpY2suYWN0aW9uOiBvbkFjdGlvblxcXCI+XFxuICAgICAgICAgICAgPHRyIGJuLWRhdGE9XFxcIntkZXZpY2VJZDogJGkuZGV2aWNlSWR9XFxcIj5cXG4gICAgICAgICAgICAgICAgPHRkIGJuLXRleHQ9XFxcIiRpLmFsaWFzXFxcIj48L3RkPlxcbiAgICAgICAgICAgICAgICA8dGQgYm4tdGV4dD1cXFwiJGkudHlwZVxcXCI+PC90ZD5cXG4gICAgICAgICAgICAgICAgPHRkIGJuLXRleHQ9XFxcIiRpLnN0YXRlXFxcIj48L3RkPlxcbiAgICAgICAgICAgICAgICA8dGQgYm4tZWFjaD1cXFwiJGkuYWN0aW9uc1xcXCIgYm4taXRlcj1cXFwiYVxcXCI+IFxcbiAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwiYWN0aW9uIHczLWJ0biB3My1ibHVlIHczLW1hcmdpbi1yaWdodFxcXCIgYm4tZGF0YT1cXFwie2NtZDogYS5jbWR9XFxcIiBibi10ZXh0PVxcXCJhLmxhYmVsXFxcIj48L2J1dHRvbj5cXG4gICAgICAgICAgICAgICAgPC90ZD5cXG4gICAgICAgICAgICA8L3RyPiAgICAgICBcXG5cXG4gICAgICAgIDwvdGJvZHk+XFxuICAgIDwvdGFibGU+XFxuPC9kaXY+XCIsXG5cblx0aW5pdDogZnVuY3Rpb24oZWx0LCBicm9rZXIpIHtcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0ZGV2aWNlczogW11cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25BY3Rpb246IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGNvbnN0IGNtZCA9ICQodGhpcykuZGF0YSgnY21kJylcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdjbWQnLCBjbWQpXG5cdFx0XHRcdFx0Y29uc3QgZGV2aWNlSWQgPSAkKHRoaXMpLmNsb3Nlc3QoJ3RyJykuZGF0YSgnZGV2aWNlSWQnKVxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ2RldmljZUlkJywgZGV2aWNlSWQpXG5cdFx0XHRcdFx0YnJva2VyLmVtaXRUb3BpYygnaG9tZWJveC50cGxpbmsuY21kJywge2NtZCwgZGV2aWNlSWR9KVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdGJyb2tlci5yZWdpc3RlcignaG9tZWJveC50cGxpbmsuc3RhdHVzJywgKG1zZykgPT4ge1xuXHRcdFx0dmFyIGRldmljZXMgPSBtc2cuZGF0YSB8fCBbXVxuXG5cdFx0XHRjb25zb2xlLmxvZygnZGV2aWNlcycsIGRldmljZXMpXG5cdFx0XHRjdHJsLnNldERhdGEoe2RldmljZXN9KVxuXHRcdH0pXG5cdH1cbn0pO1xuXG5cblxuXG4iXX0=
