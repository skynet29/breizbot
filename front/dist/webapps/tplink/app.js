$$.control.registerControl('rootPage', {

	deps: ['breizbot.broker'],

	template: "<div class=\"message w3-text-red\" bn-show=\"!homeboxConnected\">Homebox not connected</div>\n<div class=\"scrollPanel\" bn-show=\"homeboxConnected\">\n    <table class=\"w3-table-all w3-centered\">\n        <thead>\n            <tr class=\"w3-green\">\n                <th>Alias</th>\n                <th>Type</th>\n                <th>State</th>\n                <th>Actions</th>\n            </tr>\n        </thead>\n        <tbody bn-each=\"devices\" bn-event=\"click.action: onAction\">\n            <tr bn-data=\"{deviceId: $scope.$i.deviceId}\">\n                <td bn-text=\"$scope.$i.alias\"></td>\n                <td bn-text=\"$scope.$i.type\"></td>\n                <td bn-text=\"$scope.$i.state\"></td>\n                <td bn-each=\"$scope.$i.actions\" bn-iter=\"a\"> \n                    <button class=\"action w3-btn w3-blue w3-margin-right\" bn-data=\"{cmd: a.cmd}\" bn-text=\"a.label\"></button>\n                </td>\n            </tr>       \n\n        </tbody>\n    </table>\n</div>",

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





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJhcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgncm9vdFBhZ2UnLCB7XG5cblx0ZGVwczogWydicmVpemJvdC5icm9rZXInXSxcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGNsYXNzPVxcXCJtZXNzYWdlIHczLXRleHQtcmVkXFxcIiBibi1zaG93PVxcXCIhaG9tZWJveENvbm5lY3RlZFxcXCI+SG9tZWJveCBub3QgY29ubmVjdGVkPC9kaXY+XFxuPGRpdiBjbGFzcz1cXFwic2Nyb2xsUGFuZWxcXFwiIGJuLXNob3c9XFxcImhvbWVib3hDb25uZWN0ZWRcXFwiPlxcbiAgICA8dGFibGUgY2xhc3M9XFxcInczLXRhYmxlLWFsbCB3My1jZW50ZXJlZFxcXCI+XFxuICAgICAgICA8dGhlYWQ+XFxuICAgICAgICAgICAgPHRyIGNsYXNzPVxcXCJ3My1ncmVlblxcXCI+XFxuICAgICAgICAgICAgICAgIDx0aD5BbGlhczwvdGg+XFxuICAgICAgICAgICAgICAgIDx0aD5UeXBlPC90aD5cXG4gICAgICAgICAgICAgICAgPHRoPlN0YXRlPC90aD5cXG4gICAgICAgICAgICAgICAgPHRoPkFjdGlvbnM8L3RoPlxcbiAgICAgICAgICAgIDwvdHI+XFxuICAgICAgICA8L3RoZWFkPlxcbiAgICAgICAgPHRib2R5IGJuLWVhY2g9XFxcImRldmljZXNcXFwiIGJuLWV2ZW50PVxcXCJjbGljay5hY3Rpb246IG9uQWN0aW9uXFxcIj5cXG4gICAgICAgICAgICA8dHIgYm4tZGF0YT1cXFwie2RldmljZUlkOiAkc2NvcGUuJGkuZGV2aWNlSWR9XFxcIj5cXG4gICAgICAgICAgICAgICAgPHRkIGJuLXRleHQ9XFxcIiRzY29wZS4kaS5hbGlhc1xcXCI+PC90ZD5cXG4gICAgICAgICAgICAgICAgPHRkIGJuLXRleHQ9XFxcIiRzY29wZS4kaS50eXBlXFxcIj48L3RkPlxcbiAgICAgICAgICAgICAgICA8dGQgYm4tdGV4dD1cXFwiJHNjb3BlLiRpLnN0YXRlXFxcIj48L3RkPlxcbiAgICAgICAgICAgICAgICA8dGQgYm4tZWFjaD1cXFwiJHNjb3BlLiRpLmFjdGlvbnNcXFwiIGJuLWl0ZXI9XFxcImFcXFwiPiBcXG4gICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XFxcImFjdGlvbiB3My1idG4gdzMtYmx1ZSB3My1tYXJnaW4tcmlnaHRcXFwiIGJuLWRhdGE9XFxcIntjbWQ6IGEuY21kfVxcXCIgYm4tdGV4dD1cXFwiYS5sYWJlbFxcXCI+PC9idXR0b24+XFxuICAgICAgICAgICAgICAgIDwvdGQ+XFxuICAgICAgICAgICAgPC90cj4gICAgICAgXFxuXFxuICAgICAgICA8L3Rib2R5PlxcbiAgICA8L3RhYmxlPlxcbjwvZGl2PlwiLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgYnJva2VyKSB7XG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGRldmljZXM6IFtdLFxuXHRcdFx0XHRob21lYm94Q29ubmVjdGVkOiBmYWxzZVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvbkFjdGlvbjogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Y29uc3QgY21kID0gJCh0aGlzKS5kYXRhKCdjbWQnKVxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ2NtZCcsIGNtZClcblx0XHRcdFx0XHRjb25zdCBkZXZpY2VJZCA9ICQodGhpcykuY2xvc2VzdCgndHInKS5kYXRhKCdkZXZpY2VJZCcpXG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnZGV2aWNlSWQnLCBkZXZpY2VJZClcblx0XHRcdFx0XHRicm9rZXIuZW1pdFRvcGljKCdob21lYm94LnRwbGluay5jbWQnLCB7Y21kLCBkZXZpY2VJZH0pXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0YnJva2VyLnJlZ2lzdGVyKCdob21lYm94LnRwbGluay5zdGF0dXMnLCAobXNnKSA9PiB7XG5cdFx0XHR2YXIgZGV2aWNlcyA9IG1zZy5kYXRhIHx8IFtdXG5cblx0XHRcdGNvbnNvbGUubG9nKCdkZXZpY2VzJywgZGV2aWNlcylcblx0XHRcdGN0cmwuc2V0RGF0YSh7ZGV2aWNlc30pXG5cdFx0fSlcblxuXHRcdGJyb2tlci5yZWdpc3RlcignYnJlaXpib3QuaG9tZWJveC5zdGF0dXMnLCAobXNnKSA9PiB7XG5cdFx0XHRjdHJsLnNldERhdGEoe2hvbWVib3hDb25uZWN0ZWQ6IG1zZy5kYXRhLmNvbm5lY3RlZH0pXG5cdFx0fSlcdFx0XG5cdH1cbn0pO1xuXG5cblxuXG4iXX0=
