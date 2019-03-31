$$.control.registerControl('rootPage', {

	deps: ['breizbot.broker'],

	template: "<div class=\"scrollPanel\">\n    <table class=\"w3-table-all w3-small\">\n        <thead>\n            <tr class=\"w3-green\">\n                <th>Agent Name</th>\n                <th>State</th>\n                <th>Pid</th>\n                <th>Action</th>\n            </tr>\n        </thead>\n        <tbody bn-each=\"agents\" bn-event=\"click.actionStart: onActionStart, click.actionStop: onActionStop, click.actionStopForce: onActionStopForce\">\n  			<tr>\n				<td bn-text=\"$i.agent\"></td>\n				<td bn-text=\"$i.state\"></td>\n				<td bn-text=\"$i.pid\"></td>\n				<td bn-data=\"{agent: $i.agent}\">\n					<button class=\"actionStart w3-btn w3-blue\" bn-show=\"$i.pid == 0\">Start</button>\n					<button class=\"actionStop w3-btn w3-blue\"  bn-show=\"$i.pid != 0\">Stop</button>\n					<button class=\"actionStopForce w3-btn w3-red\" bn-show=\"$i.pid != 0\">Kill</button>\n				</td>\n			</tr>      	\n\n        </tbody>\n    </table>\n</div>",

	init: function(elt, broker) {

		const ctrl = $$.viewController(elt, {
			data: {
				agents: []
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
			dispTable(msg.data)
		})



	}
});





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImFwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdyb290UGFnZScsIHtcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LmJyb2tlciddLFxuXG5cdHRlbXBsYXRlOiBcIjxkaXYgY2xhc3M9XFxcInNjcm9sbFBhbmVsXFxcIj5cXG4gICAgPHRhYmxlIGNsYXNzPVxcXCJ3My10YWJsZS1hbGwgdzMtc21hbGxcXFwiPlxcbiAgICAgICAgPHRoZWFkPlxcbiAgICAgICAgICAgIDx0ciBjbGFzcz1cXFwidzMtZ3JlZW5cXFwiPlxcbiAgICAgICAgICAgICAgICA8dGg+QWdlbnQgTmFtZTwvdGg+XFxuICAgICAgICAgICAgICAgIDx0aD5TdGF0ZTwvdGg+XFxuICAgICAgICAgICAgICAgIDx0aD5QaWQ8L3RoPlxcbiAgICAgICAgICAgICAgICA8dGg+QWN0aW9uPC90aD5cXG4gICAgICAgICAgICA8L3RyPlxcbiAgICAgICAgPC90aGVhZD5cXG4gICAgICAgIDx0Ym9keSBibi1lYWNoPVxcXCJhZ2VudHNcXFwiIGJuLWV2ZW50PVxcXCJjbGljay5hY3Rpb25TdGFydDogb25BY3Rpb25TdGFydCwgY2xpY2suYWN0aW9uU3RvcDogb25BY3Rpb25TdG9wLCBjbGljay5hY3Rpb25TdG9wRm9yY2U6IG9uQWN0aW9uU3RvcEZvcmNlXFxcIj5cXG4gIFx0XHRcdDx0cj5cXG5cdFx0XHRcdDx0ZCBibi10ZXh0PVxcXCIkaS5hZ2VudFxcXCI+PC90ZD5cXG5cdFx0XHRcdDx0ZCBibi10ZXh0PVxcXCIkaS5zdGF0ZVxcXCI+PC90ZD5cXG5cdFx0XHRcdDx0ZCBibi10ZXh0PVxcXCIkaS5waWRcXFwiPjwvdGQ+XFxuXHRcdFx0XHQ8dGQgYm4tZGF0YT1cXFwie2FnZW50OiAkaS5hZ2VudH1cXFwiPlxcblx0XHRcdFx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJhY3Rpb25TdGFydCB3My1idG4gdzMtYmx1ZVxcXCIgYm4tc2hvdz1cXFwiJGkucGlkID09IDBcXFwiPlN0YXJ0PC9idXR0b24+XFxuXHRcdFx0XHRcdDxidXR0b24gY2xhc3M9XFxcImFjdGlvblN0b3AgdzMtYnRuIHczLWJsdWVcXFwiICBibi1zaG93PVxcXCIkaS5waWQgIT0gMFxcXCI+U3RvcDwvYnV0dG9uPlxcblx0XHRcdFx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJhY3Rpb25TdG9wRm9yY2UgdzMtYnRuIHczLXJlZFxcXCIgYm4tc2hvdz1cXFwiJGkucGlkICE9IDBcXFwiPktpbGw8L2J1dHRvbj5cXG5cdFx0XHRcdDwvdGQ+XFxuXHRcdFx0PC90cj4gICAgICBcdFxcblxcbiAgICAgICAgPC90Ym9keT5cXG4gICAgPC90YWJsZT5cXG48L2Rpdj5cIixcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIGJyb2tlcikge1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRhZ2VudHM6IFtdXG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uQWN0aW9uU3RhcnQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGNvbnN0IGFnZW50ID0gJCh0aGlzKS5jbG9zZXN0KCd0ZCcpLmRhdGEoJ2FnZW50Jylcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnYWN0aW9uU3RhcnQnLCBhZ2VudClcblx0XHRcdFx0XHRicm9rZXIuZW1pdFRvcGljKCdob21lYm94LmxhdW5jaGVyLnN0YXJ0QWdlbnQnLCBhZ2VudClcdFx0XHRcdFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkFjdGlvblN0b3A6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGNvbnN0IGFnZW50ID0gJCh0aGlzKS5jbG9zZXN0KCd0ZCcpLmRhdGEoJ2FnZW50Jylcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnYWN0aW9uU3RvcCcsIGFnZW50KVxuXHRcdFx0XHRcdGJyb2tlci5lbWl0VG9waWMoJ2hvbWVib3gubGF1bmNoZXIuc3RvcEFnZW50JywgYWdlbnQpXHRcdFx0XHRcblx0XHRcdFx0fSxcblx0XHRcdFx0b25BY3Rpb25TdG9wRm9yY2U6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGNvbnN0IGFnZW50ID0gJCh0aGlzKS5jbG9zZXN0KCd0ZCcpLmRhdGEoJ2FnZW50Jylcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnYWN0aW9uU3RvcEZvcmNlJywgYWdlbnQpXG5cdFx0XHRcdFx0YnJva2VyLmVtaXRUb3BpYygnaG9tZWJveC5sYXVuY2hlci5zdG9wQWdlbnQnLCB7YWdlbnQ6IGFnZW50LCBmb3JjZTogdHJ1ZX0pXHRcdFx0XHRcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHRmdW5jdGlvbiBkaXNwVGFibGUoYWdlbnRzKSB7XG5cdFx0XHRjb25zdCBkYXRhID0gW11cblxuXHRcdFx0Zm9yKHZhciBhZ2VudCBpbiBhZ2VudHMpIHtcblx0XHRcdFx0dmFyIGluZm8gPSBhZ2VudHNbYWdlbnRdXG5cdFx0XHRcdGRhdGEucHVzaCh7XG5cdFx0XHRcdFx0cGlkOiBpbmZvLnBpZCxcblx0XHRcdFx0XHRhZ2VudCxcblx0XHRcdFx0XHRzdGF0ZTogaW5mby5zdGF0ZVxuXHRcdFx0XHR9KVxuXHRcdFx0fVxuXG5cdFx0XHRjdHJsLnNldERhdGEoe2FnZW50czogZGF0YX0pXG5cdFx0fVxuXG5cblx0XHRicm9rZXIucmVnaXN0ZXIoJ2hvbWVib3gubGF1bmNoZXIuc3RhdHVzJywgKG1zZykgPT4ge1xuXHRcdFx0ZGlzcFRhYmxlKG1zZy5kYXRhKVxuXHRcdH0pXG5cblxuXG5cdH1cbn0pO1xuXG5cblxuXG4iXX0=
