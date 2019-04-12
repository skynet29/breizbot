$$.control.registerControl('rootPage', {

	deps: ['breizbot.users', 'breizbot.broker'],

	template: "<ul class=\"w3-ul w3-border w3-white\" \n	bn-each=\"notifs\" bn-iter=\"n\"\n	bn-event=\"click.delete: onDelete\">\n	<li class=\"w3-bar\" bn-data=\"{notifId: n._id}\">\n		<span class=\"w3-button w3-right delete\" title=\"Delete\"><i class=\"fa fa-times\"></i></span>\n\n		<div class=\"w3-bar-item\" bn-html=\"n.notif\" ></div>\n	</li>\n</ul>	",

	init: function(elt, users, broker) {

		const ctrl = $$.viewController(elt, {
			data: {notifs: []},
			events: {
				onDelete: function() {
					var notifId = $(this).closest('li').data('notifId')
					console.log('onDelete', notifId)
					users.removeNotif(notifId)
				}
			}
		})	

		function updateNotifs() {
			users.getNotifs().then((notifs) => {
				console.log('notifs', notifs)
				ctrl.setData({notifs})
			})				
		}

		broker.register('breizbot.notifCount', function(msg) {
			//console.log('msg', msg)
			updateNotifs()
		})

		updateNotifs()

	}
});





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ3Jvb3RQYWdlJywge1xuXG5cdGRlcHM6IFsnYnJlaXpib3QudXNlcnMnLCAnYnJlaXpib3QuYnJva2VyJ10sXG5cblx0dGVtcGxhdGU6IFwiPHVsIGNsYXNzPVxcXCJ3My11bCB3My1ib3JkZXIgdzMtd2hpdGVcXFwiIFxcblx0Ym4tZWFjaD1cXFwibm90aWZzXFxcIiBibi1pdGVyPVxcXCJuXFxcIlxcblx0Ym4tZXZlbnQ9XFxcImNsaWNrLmRlbGV0ZTogb25EZWxldGVcXFwiPlxcblx0PGxpIGNsYXNzPVxcXCJ3My1iYXJcXFwiIGJuLWRhdGE9XFxcIntub3RpZklkOiBuLl9pZH1cXFwiPlxcblx0XHQ8c3BhbiBjbGFzcz1cXFwidzMtYnV0dG9uIHczLXJpZ2h0IGRlbGV0ZVxcXCIgdGl0bGU9XFxcIkRlbGV0ZVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXRpbWVzXFxcIj48L2k+PC9zcGFuPlxcblxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJ3My1iYXItaXRlbVxcXCIgYm4taHRtbD1cXFwibi5ub3RpZlxcXCIgPjwvZGl2Plxcblx0PC9saT5cXG48L3VsPlx0XCIsXG5cblx0aW5pdDogZnVuY3Rpb24oZWx0LCB1c2VycywgYnJva2VyKSB7XG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7bm90aWZzOiBbXX0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25EZWxldGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHZhciBub3RpZklkID0gJCh0aGlzKS5jbG9zZXN0KCdsaScpLmRhdGEoJ25vdGlmSWQnKVxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbkRlbGV0ZScsIG5vdGlmSWQpXG5cdFx0XHRcdFx0dXNlcnMucmVtb3ZlTm90aWYobm90aWZJZClcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXHRcblxuXHRcdGZ1bmN0aW9uIHVwZGF0ZU5vdGlmcygpIHtcblx0XHRcdHVzZXJzLmdldE5vdGlmcygpLnRoZW4oKG5vdGlmcykgPT4ge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnbm90aWZzJywgbm90aWZzKVxuXHRcdFx0XHRjdHJsLnNldERhdGEoe25vdGlmc30pXG5cdFx0XHR9KVx0XHRcdFx0XG5cdFx0fVxuXG5cdFx0YnJva2VyLnJlZ2lzdGVyKCdicmVpemJvdC5ub3RpZkNvdW50JywgZnVuY3Rpb24obXNnKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdtc2cnLCBtc2cpXG5cdFx0XHR1cGRhdGVOb3RpZnMoKVxuXHRcdH0pXG5cblx0XHR1cGRhdGVOb3RpZnMoKVxuXG5cdH1cbn0pO1xuXG5cblxuXG4iXX0=
