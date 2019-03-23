$$.control.registerControl('breizbot.main', {

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





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImFwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5tYWluJywge1xuXG5cdGRlcHM6IFsnYnJlaXpib3QuYnJva2VyJ10sXG5cblx0dGVtcGxhdGU6IFwiPGRpdiBjbGFzcz1cXFwic2Nyb2xsUGFuZWxcXFwiPlxcbiAgICA8dGFibGUgY2xhc3M9XFxcInczLXRhYmxlLWFsbCB3My1zbWFsbFxcXCI+XFxuICAgICAgICA8dGhlYWQ+XFxuICAgICAgICAgICAgPHRyIGNsYXNzPVxcXCJ3My1ncmVlblxcXCI+XFxuICAgICAgICAgICAgICAgIDx0aD5BZ2VudCBOYW1lPC90aD5cXG4gICAgICAgICAgICAgICAgPHRoPlN0YXRlPC90aD5cXG4gICAgICAgICAgICAgICAgPHRoPlBpZDwvdGg+XFxuICAgICAgICAgICAgICAgIDx0aD5BY3Rpb248L3RoPlxcbiAgICAgICAgICAgIDwvdHI+XFxuICAgICAgICA8L3RoZWFkPlxcbiAgICAgICAgPHRib2R5IGJuLWVhY2g9XFxcImFnZW50c1xcXCIgYm4tZXZlbnQ9XFxcImNsaWNrLmFjdGlvblN0YXJ0OiBvbkFjdGlvblN0YXJ0LCBjbGljay5hY3Rpb25TdG9wOiBvbkFjdGlvblN0b3AsIGNsaWNrLmFjdGlvblN0b3BGb3JjZTogb25BY3Rpb25TdG9wRm9yY2VcXFwiPlxcbiAgXHRcdFx0PHRyPlxcblx0XHRcdFx0PHRkIGJuLXRleHQ9XFxcIiRpLmFnZW50XFxcIj48L3RkPlxcblx0XHRcdFx0PHRkIGJuLXRleHQ9XFxcIiRpLnN0YXRlXFxcIj48L3RkPlxcblx0XHRcdFx0PHRkIGJuLXRleHQ9XFxcIiRpLnBpZFxcXCI+PC90ZD5cXG5cdFx0XHRcdDx0ZCBibi1kYXRhPVxcXCJ7YWdlbnQ6ICRpLmFnZW50fVxcXCI+XFxuXHRcdFx0XHRcdDxidXR0b24gY2xhc3M9XFxcImFjdGlvblN0YXJ0IHczLWJ0biB3My1ibHVlXFxcIiBibi1zaG93PVxcXCIkaS5waWQgPT0gMFxcXCI+U3RhcnQ8L2J1dHRvbj5cXG5cdFx0XHRcdFx0PGJ1dHRvbiBjbGFzcz1cXFwiYWN0aW9uU3RvcCB3My1idG4gdzMtYmx1ZVxcXCIgIGJuLXNob3c9XFxcIiRpLnBpZCAhPSAwXFxcIj5TdG9wPC9idXR0b24+XFxuXHRcdFx0XHRcdDxidXR0b24gY2xhc3M9XFxcImFjdGlvblN0b3BGb3JjZSB3My1idG4gdzMtcmVkXFxcIiBibi1zaG93PVxcXCIkaS5waWQgIT0gMFxcXCI+S2lsbDwvYnV0dG9uPlxcblx0XHRcdFx0PC90ZD5cXG5cdFx0XHQ8L3RyPiAgICAgIFx0XFxuXFxuICAgICAgICA8L3Rib2R5PlxcbiAgICA8L3RhYmxlPlxcbjwvZGl2PlwiLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgYnJva2VyKSB7XG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGFnZW50czogW11cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25BY3Rpb25TdGFydDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Y29uc3QgYWdlbnQgPSAkKHRoaXMpLmNsb3Nlc3QoJ3RkJykuZGF0YSgnYWdlbnQnKVxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdhY3Rpb25TdGFydCcsIGFnZW50KVxuXHRcdFx0XHRcdGJyb2tlci5lbWl0VG9waWMoJ2hvbWVib3gubGF1bmNoZXIuc3RhcnRBZ2VudCcsIGFnZW50KVx0XHRcdFx0XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uQWN0aW9uU3RvcDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Y29uc3QgYWdlbnQgPSAkKHRoaXMpLmNsb3Nlc3QoJ3RkJykuZGF0YSgnYWdlbnQnKVxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdhY3Rpb25TdG9wJywgYWdlbnQpXG5cdFx0XHRcdFx0YnJva2VyLmVtaXRUb3BpYygnaG9tZWJveC5sYXVuY2hlci5zdG9wQWdlbnQnLCBhZ2VudClcdFx0XHRcdFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkFjdGlvblN0b3BGb3JjZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Y29uc3QgYWdlbnQgPSAkKHRoaXMpLmNsb3Nlc3QoJ3RkJykuZGF0YSgnYWdlbnQnKVxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdhY3Rpb25TdG9wRm9yY2UnLCBhZ2VudClcblx0XHRcdFx0XHRicm9rZXIuZW1pdFRvcGljKCdob21lYm94LmxhdW5jaGVyLnN0b3BBZ2VudCcsIHthZ2VudDogYWdlbnQsIGZvcmNlOiB0cnVlfSlcdFx0XHRcdFxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdGZ1bmN0aW9uIGRpc3BUYWJsZShhZ2VudHMpIHtcblx0XHRcdGNvbnN0IGRhdGEgPSBbXVxuXG5cdFx0XHRmb3IodmFyIGFnZW50IGluIGFnZW50cykge1xuXHRcdFx0XHR2YXIgaW5mbyA9IGFnZW50c1thZ2VudF1cblx0XHRcdFx0ZGF0YS5wdXNoKHtcblx0XHRcdFx0XHRwaWQ6IGluZm8ucGlkLFxuXHRcdFx0XHRcdGFnZW50LFxuXHRcdFx0XHRcdHN0YXRlOiBpbmZvLnN0YXRlXG5cdFx0XHRcdH0pXG5cdFx0XHR9XG5cblx0XHRcdGN0cmwuc2V0RGF0YSh7YWdlbnRzOiBkYXRhfSlcblx0XHR9XG5cblxuXHRcdGJyb2tlci5yZWdpc3RlcignaG9tZWJveC5sYXVuY2hlci5zdGF0dXMnLCAobXNnKSA9PiB7XG5cdFx0XHRkaXNwVGFibGUobXNnLmRhdGEpXG5cdFx0fSlcblxuXG5cblx0fVxufSk7XG5cblxuXG5cbiJdfQ==
