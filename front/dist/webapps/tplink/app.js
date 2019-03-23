$$.control.registerControl('breizbot.main', {

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





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImFwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5tYWluJywge1xuXG5cdGRlcHM6IFsnYnJlaXpib3QuYnJva2VyJ10sXG5cblx0dGVtcGxhdGU6IFwiPGRpdiBjbGFzcz1cXFwic2Nyb2xsUGFuZWxcXFwiPlxcbiAgICA8dGFibGUgY2xhc3M9XFxcInczLXRhYmxlLWFsbCB3My1jZW50ZXJlZFxcXCI+XFxuICAgICAgICA8dGhlYWQ+XFxuICAgICAgICAgICAgPHRyIGNsYXNzPVxcXCJ3My1ncmVlblxcXCI+XFxuICAgICAgICAgICAgICAgIDx0aD5BbGlhczwvdGg+XFxuICAgICAgICAgICAgICAgIDx0aD5UeXBlPC90aD5cXG4gICAgICAgICAgICAgICAgPHRoPlN0YXRlPC90aD5cXG4gICAgICAgICAgICAgICAgPHRoPkFjdGlvbnM8L3RoPlxcbiAgICAgICAgICAgIDwvdHI+XFxuICAgICAgICA8L3RoZWFkPlxcbiAgICAgICAgPHRib2R5IGJuLWVhY2g9XFxcImRldmljZXNcXFwiIGJuLWV2ZW50PVxcXCJjbGljay5hY3Rpb246IG9uQWN0aW9uXFxcIj5cXG4gICAgICAgICAgICA8dHIgYm4tZGF0YT1cXFwie2RldmljZUlkOiAkaS5kZXZpY2VJZH1cXFwiPlxcbiAgICAgICAgICAgICAgICA8dGQgYm4tdGV4dD1cXFwiJGkuYWxpYXNcXFwiPjwvdGQ+XFxuICAgICAgICAgICAgICAgIDx0ZCBibi10ZXh0PVxcXCIkaS50eXBlXFxcIj48L3RkPlxcbiAgICAgICAgICAgICAgICA8dGQgYm4tdGV4dD1cXFwiJGkuc3RhdGVcXFwiPjwvdGQ+XFxuICAgICAgICAgICAgICAgIDx0ZCBibi1lYWNoPVxcXCIkaS5hY3Rpb25zXFxcIiBibi1pdGVyPVxcXCJhXFxcIj4gXFxuICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVxcXCJhY3Rpb24gdzMtYnRuIHczLWJsdWUgdzMtbWFyZ2luLXJpZ2h0XFxcIiBibi1kYXRhPVxcXCJ7Y21kOiBhLmNtZH1cXFwiIGJuLXRleHQ9XFxcImEubGFiZWxcXFwiPjwvYnV0dG9uPlxcbiAgICAgICAgICAgICAgICA8L3RkPlxcbiAgICAgICAgICAgIDwvdHI+ICAgICAgIFxcblxcbiAgICAgICAgPC90Ym9keT5cXG4gICAgPC90YWJsZT5cXG48L2Rpdj5cIixcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIGJyb2tlcikge1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRkZXZpY2VzOiBbXVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvbkFjdGlvbjogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Y29uc3QgY21kID0gJCh0aGlzKS5kYXRhKCdjbWQnKVxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ2NtZCcsIGNtZClcblx0XHRcdFx0XHRjb25zdCBkZXZpY2VJZCA9ICQodGhpcykuY2xvc2VzdCgndHInKS5kYXRhKCdkZXZpY2VJZCcpXG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnZGV2aWNlSWQnLCBkZXZpY2VJZClcblx0XHRcdFx0XHRicm9rZXIuZW1pdFRvcGljKCdob21lYm94LnRwbGluay5jbWQnLCB7Y21kLCBkZXZpY2VJZH0pXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0YnJva2VyLnJlZ2lzdGVyKCdob21lYm94LnRwbGluay5zdGF0dXMnLCAobXNnKSA9PiB7XG5cdFx0XHR2YXIgZGV2aWNlcyA9IG1zZy5kYXRhIHx8IFtdXG5cblx0XHRcdGNvbnNvbGUubG9nKCdkZXZpY2VzJywgZGV2aWNlcylcblx0XHRcdGN0cmwuc2V0RGF0YSh7ZGV2aWNlc30pXG5cdFx0fSlcblx0fVxufSk7XG5cblxuXG5cbiJdfQ==
