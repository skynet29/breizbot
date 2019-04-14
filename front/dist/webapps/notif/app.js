$$.control.registerControl('rootPage', {

	deps: ['breizbot.users', 'breizbot.broker'],

	template: "<ul class=\"w3-ul w3-border w3-white\" \n	bn-each=\"notifs\" bn-iter=\"n\"\n	bn-event=\"click.delete: onDelete, click.accept: onAccept, click.decline: onDecline\"\n	>\n	<li class=\"w3-bar\" bn-data=\"{item: n}\" bn-show=\"typeof n.notif === \'string\'\">\n		<span class=\"w3-button w3-right delete\" title=\"Delete\"><i class=\"fa fa-times\"></i></span>\n\n		<div class=\"w3-bar-item\" bn-text=\"n.notif\" ></div>\n	</li>\n\n	<li class=\"w3-bar\" bn-data=\"{item: n}\" bn-show=\"n.notif.type === \'invit\'\">\n		<span class=\"w3-button w3-right w3-green accept\">Accept</i></span>\n		<span class=\"w3-button w3-right w3-red decline\">Decline</i></span>\n\n		<div class=\"w3-bar-item\">\n			<strong bn-text=\"n.notif.from\"></strong>&nbsp;want to be your friend\n		</div>\n	</li>			\n</ul>	",

	init: function(elt, users, broker) {

		const ctrl = $$.viewController(elt, {
			data: {notifs: []},
			events: {
				onDelete: function() {
					const item = $(this).closest('li').data('item')
					console.log('onDelete', item)
					users.removeNotif(item._id)
				},
				onAccept: function() {
					const item = $(this).closest('li').data('item')
					console.log('onAccept', item)

					const friendUserName = item.notif.from
					users.addFriend(friendUserName).then(() => {
						return users.removeNotif(item._id)
					})
				},
				onDecline: function() {
					const item = $(this).closest('li').data('item')
					console.log('onDecline', item)
					users.removeNotif(item._id)				}
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





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJhcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgncm9vdFBhZ2UnLCB7XG5cblx0ZGVwczogWydicmVpemJvdC51c2VycycsICdicmVpemJvdC5icm9rZXInXSxcblxuXHR0ZW1wbGF0ZTogXCI8dWwgY2xhc3M9XFxcInczLXVsIHczLWJvcmRlciB3My13aGl0ZVxcXCIgXFxuXHRibi1lYWNoPVxcXCJub3RpZnNcXFwiIGJuLWl0ZXI9XFxcIm5cXFwiXFxuXHRibi1ldmVudD1cXFwiY2xpY2suZGVsZXRlOiBvbkRlbGV0ZSwgY2xpY2suYWNjZXB0OiBvbkFjY2VwdCwgY2xpY2suZGVjbGluZTogb25EZWNsaW5lXFxcIlxcblx0Plxcblx0PGxpIGNsYXNzPVxcXCJ3My1iYXJcXFwiIGJuLWRhdGE9XFxcIntpdGVtOiBufVxcXCIgYm4tc2hvdz1cXFwidHlwZW9mIG4ubm90aWYgPT09IFxcJ3N0cmluZ1xcJ1xcXCI+XFxuXHRcdDxzcGFuIGNsYXNzPVxcXCJ3My1idXR0b24gdzMtcmlnaHQgZGVsZXRlXFxcIiB0aXRsZT1cXFwiRGVsZXRlXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtdGltZXNcXFwiPjwvaT48L3NwYW4+XFxuXFxuXHRcdDxkaXYgY2xhc3M9XFxcInczLWJhci1pdGVtXFxcIiBibi10ZXh0PVxcXCJuLm5vdGlmXFxcIiA+PC9kaXY+XFxuXHQ8L2xpPlxcblxcblx0PGxpIGNsYXNzPVxcXCJ3My1iYXJcXFwiIGJuLWRhdGE9XFxcIntpdGVtOiBufVxcXCIgYm4tc2hvdz1cXFwibi5ub3RpZi50eXBlID09PSBcXCdpbnZpdFxcJ1xcXCI+XFxuXHRcdDxzcGFuIGNsYXNzPVxcXCJ3My1idXR0b24gdzMtcmlnaHQgdzMtZ3JlZW4gYWNjZXB0XFxcIj5BY2NlcHQ8L2k+PC9zcGFuPlxcblx0XHQ8c3BhbiBjbGFzcz1cXFwidzMtYnV0dG9uIHczLXJpZ2h0IHczLXJlZCBkZWNsaW5lXFxcIj5EZWNsaW5lPC9pPjwvc3Bhbj5cXG5cXG5cdFx0PGRpdiBjbGFzcz1cXFwidzMtYmFyLWl0ZW1cXFwiPlxcblx0XHRcdDxzdHJvbmcgYm4tdGV4dD1cXFwibi5ub3RpZi5mcm9tXFxcIj48L3N0cm9uZz4mbmJzcDt3YW50IHRvIGJlIHlvdXIgZnJpZW5kXFxuXHRcdDwvZGl2Plxcblx0PC9saT5cdFx0XHRcXG48L3VsPlx0XCIsXG5cblx0aW5pdDogZnVuY3Rpb24oZWx0LCB1c2VycywgYnJva2VyKSB7XG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7bm90aWZzOiBbXX0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25EZWxldGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGNvbnN0IGl0ZW0gPSAkKHRoaXMpLmNsb3Nlc3QoJ2xpJykuZGF0YSgnaXRlbScpXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uRGVsZXRlJywgaXRlbSlcblx0XHRcdFx0XHR1c2Vycy5yZW1vdmVOb3RpZihpdGVtLl9pZClcblx0XHRcdFx0fSxcblx0XHRcdFx0b25BY2NlcHQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGNvbnN0IGl0ZW0gPSAkKHRoaXMpLmNsb3Nlc3QoJ2xpJykuZGF0YSgnaXRlbScpXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uQWNjZXB0JywgaXRlbSlcblxuXHRcdFx0XHRcdGNvbnN0IGZyaWVuZFVzZXJOYW1lID0gaXRlbS5ub3RpZi5mcm9tXG5cdFx0XHRcdFx0dXNlcnMuYWRkRnJpZW5kKGZyaWVuZFVzZXJOYW1lKS50aGVuKCgpID0+IHtcblx0XHRcdFx0XHRcdHJldHVybiB1c2Vycy5yZW1vdmVOb3RpZihpdGVtLl9pZClcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkRlY2xpbmU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGNvbnN0IGl0ZW0gPSAkKHRoaXMpLmNsb3Nlc3QoJ2xpJykuZGF0YSgnaXRlbScpXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uRGVjbGluZScsIGl0ZW0pXG5cdFx0XHRcdFx0dXNlcnMucmVtb3ZlTm90aWYoaXRlbS5faWQpXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcdFxuXG5cdFx0ZnVuY3Rpb24gdXBkYXRlTm90aWZzKCkge1xuXHRcdFx0dXNlcnMuZ2V0Tm90aWZzKCkudGhlbigobm90aWZzKSA9PiB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdub3RpZnMnLCBub3RpZnMpXG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7bm90aWZzfSlcblx0XHRcdH0pXHRcdFx0XHRcblx0XHR9XG5cblx0XHRicm9rZXIucmVnaXN0ZXIoJ2JyZWl6Ym90Lm5vdGlmQ291bnQnLCBmdW5jdGlvbihtc2cpIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ21zZycsIG1zZylcblx0XHRcdHVwZGF0ZU5vdGlmcygpXG5cdFx0fSlcblxuXHRcdHVwZGF0ZU5vdGlmcygpXG5cblx0fVxufSk7XG5cblxuXG5cbiJdfQ==
