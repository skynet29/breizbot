$$.control.registerControl('rootPage', {

	deps: ['breizbot.users', 'breizbot.broker', 'breizbot.params'],

	template: "<ul class=\"w3-ul w3-border w3-white\" \n	bn-each=\"notifs\" bn-iter=\"n\"\n	bn-event=\"click.delete: onDelete, click.accept: onAccept, click.decline: onDecline\"\n	>\n	<li class=\"w3-bar\" bn-data=\"{item: n}\" bn-show=\"typeof n.notif === \'string\'\">\n		<span class=\"w3-button w3-right delete\" title=\"Delete\"><i class=\"fa fa-times\"></i></span>\n\n		<div class=\"w3-bar-item\" bn-html=\"n.notif\" ></div>\n	</li>\n\n	<li class=\"w3-bar\" bn-data=\"{item: n}\" bn-show=\"n.notif.type === \'invit\'\">\n		<span class=\"w3-button w3-right w3-green accept\"><i class=\"fa fa-user-check\"></i></span>\n		<span class=\"w3-button w3-right w3-red decline\"><i class=\"fa fa-user-slash\"></i></span>\n\n		<div class=\"w3-bar-item\">\n			User&nbsp;<strong bn-text=\"n.from\"></strong>&nbsp;want to be your friend\n		</div>\n	</li>			\n</ul>	",

	init: function(elt, users, broker, params) {

		console.log('params', params)

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

					const friendUserName = item.from
					users.addFriend(friendUserName).then(() => {
						return users.removeNotif(item._id).then(() => {
							return users.sendNotif(friendUserName, `User <strong>${params.$userName}</strong> has accepted your invitation`)
						})
					})
				},
				onDecline: function() {
					const item = $(this).closest('li').data('item')
					console.log('onDecline', item)
					const friendUserName = item.from

					users.removeNotif(item._id).then(() => {
						return users.sendNotif(friendUserName, `User <strong>${params.$userName}</strong> has declined your invitation`)
					})				
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





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJhcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgncm9vdFBhZ2UnLCB7XG5cblx0ZGVwczogWydicmVpemJvdC51c2VycycsICdicmVpemJvdC5icm9rZXInLCAnYnJlaXpib3QucGFyYW1zJ10sXG5cblx0dGVtcGxhdGU6IFwiPHVsIGNsYXNzPVxcXCJ3My11bCB3My1ib3JkZXIgdzMtd2hpdGVcXFwiIFxcblx0Ym4tZWFjaD1cXFwibm90aWZzXFxcIiBibi1pdGVyPVxcXCJuXFxcIlxcblx0Ym4tZXZlbnQ9XFxcImNsaWNrLmRlbGV0ZTogb25EZWxldGUsIGNsaWNrLmFjY2VwdDogb25BY2NlcHQsIGNsaWNrLmRlY2xpbmU6IG9uRGVjbGluZVxcXCJcXG5cdD5cXG5cdDxsaSBjbGFzcz1cXFwidzMtYmFyXFxcIiBibi1kYXRhPVxcXCJ7aXRlbTogbn1cXFwiIGJuLXNob3c9XFxcInR5cGVvZiBuLm5vdGlmID09PSBcXCdzdHJpbmdcXCdcXFwiPlxcblx0XHQ8c3BhbiBjbGFzcz1cXFwidzMtYnV0dG9uIHczLXJpZ2h0IGRlbGV0ZVxcXCIgdGl0bGU9XFxcIkRlbGV0ZVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXRpbWVzXFxcIj48L2k+PC9zcGFuPlxcblxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJ3My1iYXItaXRlbVxcXCIgYm4taHRtbD1cXFwibi5ub3RpZlxcXCIgPjwvZGl2Plxcblx0PC9saT5cXG5cXG5cdDxsaSBjbGFzcz1cXFwidzMtYmFyXFxcIiBibi1kYXRhPVxcXCJ7aXRlbTogbn1cXFwiIGJuLXNob3c9XFxcIm4ubm90aWYudHlwZSA9PT0gXFwnaW52aXRcXCdcXFwiPlxcblx0XHQ8c3BhbiBjbGFzcz1cXFwidzMtYnV0dG9uIHczLXJpZ2h0IHczLWdyZWVuIGFjY2VwdFxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXVzZXItY2hlY2tcXFwiPjwvaT48L3NwYW4+XFxuXHRcdDxzcGFuIGNsYXNzPVxcXCJ3My1idXR0b24gdzMtcmlnaHQgdzMtcmVkIGRlY2xpbmVcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS11c2VyLXNsYXNoXFxcIj48L2k+PC9zcGFuPlxcblxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJ3My1iYXItaXRlbVxcXCI+XFxuXHRcdFx0VXNlciZuYnNwOzxzdHJvbmcgYm4tdGV4dD1cXFwibi5mcm9tXFxcIj48L3N0cm9uZz4mbmJzcDt3YW50IHRvIGJlIHlvdXIgZnJpZW5kXFxuXHRcdDwvZGl2Plxcblx0PC9saT5cdFx0XHRcXG48L3VsPlx0XCIsXG5cblx0aW5pdDogZnVuY3Rpb24oZWx0LCB1c2VycywgYnJva2VyLCBwYXJhbXMpIHtcblxuXHRcdGNvbnNvbGUubG9nKCdwYXJhbXMnLCBwYXJhbXMpXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7bm90aWZzOiBbXX0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25EZWxldGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGNvbnN0IGl0ZW0gPSAkKHRoaXMpLmNsb3Nlc3QoJ2xpJykuZGF0YSgnaXRlbScpXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uRGVsZXRlJywgaXRlbSlcblx0XHRcdFx0XHR1c2Vycy5yZW1vdmVOb3RpZihpdGVtLl9pZClcblx0XHRcdFx0fSxcblx0XHRcdFx0b25BY2NlcHQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGNvbnN0IGl0ZW0gPSAkKHRoaXMpLmNsb3Nlc3QoJ2xpJykuZGF0YSgnaXRlbScpXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uQWNjZXB0JywgaXRlbSlcblxuXHRcdFx0XHRcdGNvbnN0IGZyaWVuZFVzZXJOYW1lID0gaXRlbS5mcm9tXG5cdFx0XHRcdFx0dXNlcnMuYWRkRnJpZW5kKGZyaWVuZFVzZXJOYW1lKS50aGVuKCgpID0+IHtcblx0XHRcdFx0XHRcdHJldHVybiB1c2Vycy5yZW1vdmVOb3RpZihpdGVtLl9pZCkudGhlbigoKSA9PiB7XG5cdFx0XHRcdFx0XHRcdHJldHVybiB1c2Vycy5zZW5kTm90aWYoZnJpZW5kVXNlck5hbWUsIGBVc2VyIDxzdHJvbmc+JHtwYXJhbXMuJHVzZXJOYW1lfTwvc3Ryb25nPiBoYXMgYWNjZXB0ZWQgeW91ciBpbnZpdGF0aW9uYClcblx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fSxcblx0XHRcdFx0b25EZWNsaW5lOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRjb25zdCBpdGVtID0gJCh0aGlzKS5jbG9zZXN0KCdsaScpLmRhdGEoJ2l0ZW0nKVxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbkRlY2xpbmUnLCBpdGVtKVxuXHRcdFx0XHRcdGNvbnN0IGZyaWVuZFVzZXJOYW1lID0gaXRlbS5mcm9tXG5cblx0XHRcdFx0XHR1c2Vycy5yZW1vdmVOb3RpZihpdGVtLl9pZCkudGhlbigoKSA9PiB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gdXNlcnMuc2VuZE5vdGlmKGZyaWVuZFVzZXJOYW1lLCBgVXNlciA8c3Ryb25nPiR7cGFyYW1zLiR1c2VyTmFtZX08L3N0cm9uZz4gaGFzIGRlY2xpbmVkIHlvdXIgaW52aXRhdGlvbmApXG5cdFx0XHRcdFx0fSlcdFx0XHRcdFxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcdFxuXG5cdFx0ZnVuY3Rpb24gdXBkYXRlTm90aWZzKCkge1xuXHRcdFx0dXNlcnMuZ2V0Tm90aWZzKCkudGhlbigobm90aWZzKSA9PiB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdub3RpZnMnLCBub3RpZnMpXG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7bm90aWZzfSlcblx0XHRcdH0pXHRcdFx0XHRcblx0XHR9XG5cblx0XHRicm9rZXIucmVnaXN0ZXIoJ2JyZWl6Ym90Lm5vdGlmQ291bnQnLCBmdW5jdGlvbihtc2cpIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ21zZycsIG1zZylcblx0XHRcdHVwZGF0ZU5vdGlmcygpXG5cdFx0fSlcblxuXHRcdHVwZGF0ZU5vdGlmcygpXG5cblx0fVxufSk7XG5cblxuXG5cbiJdfQ==
