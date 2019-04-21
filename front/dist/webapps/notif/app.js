$$.control.registerControl('rootPage', {

	deps: ['breizbot.users', 'breizbot.broker'],

	template: "<div class=\"scrollPanel\">\n	<ul class=\"w3-ul w3-border w3-white\" \n		bn-each=\"notifs\" bn-iter=\"n\"\n		bn-event=\"click.delete: onDelete, click.accept: onAccept, click.decline: onDecline\"\n		>\n		<li class=\"w3-bar\" bn-data=\"{item: n}\" bn-show=\"typeof n.notif === \'string\'\">\n			<span class=\"w3-button w3-right delete\" title=\"Delete\"><i class=\"fa fa-times\"></i></span>\n\n			<div class=\"w3-bar-item\">\n				From: <span bn-text=\"n.from\"></span><br>\n				Date: <span bn-text=\"new Date(n.date).toLocaleDateString()\"></span>\n				at <span bn-text=\"new Date(n.date).toLocaleTimeString()\"></span>\n				<br>\n				Message: <span bn-html=\"n.notif\"></span>\n			</div>\n		</li>\n\n		<li class=\"w3-bar\" bn-data=\"{item: n}\" bn-show=\"n.notif.type === \'invit\'\">\n			<span class=\"w3-button w3-right w3-green accept\"><i class=\"fa fa-user-check\"></i></span>\n			<span class=\"w3-button w3-right w3-red decline\"><i class=\"fa fa-user-slash\"></i></span>\n\n			<div class=\"w3-bar-item\">\n				From: <span bn-text=\"n.from\"></span><br>\n				Date: <span bn-text=\"new Date(n.date).toLocaleDateString()\"></span>\n				at <span bn-text=\"new Date(n.date).toLocaleTimeString()\"></span>\n				<br>\n				Message: <strong>I want to be your friend</strong>\n			</div>\n		</li>			\n	</ul>	\n</div>",

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

					const friendUserName = item.from
					users.addFriend(friendUserName).then(() => {
						return users.removeNotif(item._id).then(() => {
							return users.sendNotif(friendUserName, `User has accepted your invitation`)
						})
					})
				},
				onDecline: function() {
					const item = $(this).closest('li').data('item')
					console.log('onDecline', item)
					const friendUserName = item.from

					users.removeNotif(item._id).then(() => {
						return users.sendNotif(friendUserName, `User has declined your invitation`)
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





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImFwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdyb290UGFnZScsIHtcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LnVzZXJzJywgJ2JyZWl6Ym90LmJyb2tlciddLFxuXG5cdHRlbXBsYXRlOiBcIjxkaXYgY2xhc3M9XFxcInNjcm9sbFBhbmVsXFxcIj5cXG5cdDx1bCBjbGFzcz1cXFwidzMtdWwgdzMtYm9yZGVyIHczLXdoaXRlXFxcIiBcXG5cdFx0Ym4tZWFjaD1cXFwibm90aWZzXFxcIiBibi1pdGVyPVxcXCJuXFxcIlxcblx0XHRibi1ldmVudD1cXFwiY2xpY2suZGVsZXRlOiBvbkRlbGV0ZSwgY2xpY2suYWNjZXB0OiBvbkFjY2VwdCwgY2xpY2suZGVjbGluZTogb25EZWNsaW5lXFxcIlxcblx0XHQ+XFxuXHRcdDxsaSBjbGFzcz1cXFwidzMtYmFyXFxcIiBibi1kYXRhPVxcXCJ7aXRlbTogbn1cXFwiIGJuLXNob3c9XFxcInR5cGVvZiBuLm5vdGlmID09PSBcXCdzdHJpbmdcXCdcXFwiPlxcblx0XHRcdDxzcGFuIGNsYXNzPVxcXCJ3My1idXR0b24gdzMtcmlnaHQgZGVsZXRlXFxcIiB0aXRsZT1cXFwiRGVsZXRlXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtdGltZXNcXFwiPjwvaT48L3NwYW4+XFxuXFxuXHRcdFx0PGRpdiBjbGFzcz1cXFwidzMtYmFyLWl0ZW1cXFwiPlxcblx0XHRcdFx0RnJvbTogPHNwYW4gYm4tdGV4dD1cXFwibi5mcm9tXFxcIj48L3NwYW4+PGJyPlxcblx0XHRcdFx0RGF0ZTogPHNwYW4gYm4tdGV4dD1cXFwibmV3IERhdGUobi5kYXRlKS50b0xvY2FsZURhdGVTdHJpbmcoKVxcXCI+PC9zcGFuPlxcblx0XHRcdFx0YXQgPHNwYW4gYm4tdGV4dD1cXFwibmV3IERhdGUobi5kYXRlKS50b0xvY2FsZVRpbWVTdHJpbmcoKVxcXCI+PC9zcGFuPlxcblx0XHRcdFx0PGJyPlxcblx0XHRcdFx0TWVzc2FnZTogPHNwYW4gYm4taHRtbD1cXFwibi5ub3RpZlxcXCI+PC9zcGFuPlxcblx0XHRcdDwvZGl2Plxcblx0XHQ8L2xpPlxcblxcblx0XHQ8bGkgY2xhc3M9XFxcInczLWJhclxcXCIgYm4tZGF0YT1cXFwie2l0ZW06IG59XFxcIiBibi1zaG93PVxcXCJuLm5vdGlmLnR5cGUgPT09IFxcJ2ludml0XFwnXFxcIj5cXG5cdFx0XHQ8c3BhbiBjbGFzcz1cXFwidzMtYnV0dG9uIHczLXJpZ2h0IHczLWdyZWVuIGFjY2VwdFxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXVzZXItY2hlY2tcXFwiPjwvaT48L3NwYW4+XFxuXHRcdFx0PHNwYW4gY2xhc3M9XFxcInczLWJ1dHRvbiB3My1yaWdodCB3My1yZWQgZGVjbGluZVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXVzZXItc2xhc2hcXFwiPjwvaT48L3NwYW4+XFxuXFxuXHRcdFx0PGRpdiBjbGFzcz1cXFwidzMtYmFyLWl0ZW1cXFwiPlxcblx0XHRcdFx0RnJvbTogPHNwYW4gYm4tdGV4dD1cXFwibi5mcm9tXFxcIj48L3NwYW4+PGJyPlxcblx0XHRcdFx0RGF0ZTogPHNwYW4gYm4tdGV4dD1cXFwibmV3IERhdGUobi5kYXRlKS50b0xvY2FsZURhdGVTdHJpbmcoKVxcXCI+PC9zcGFuPlxcblx0XHRcdFx0YXQgPHNwYW4gYm4tdGV4dD1cXFwibmV3IERhdGUobi5kYXRlKS50b0xvY2FsZVRpbWVTdHJpbmcoKVxcXCI+PC9zcGFuPlxcblx0XHRcdFx0PGJyPlxcblx0XHRcdFx0TWVzc2FnZTogPHN0cm9uZz5JIHdhbnQgdG8gYmUgeW91ciBmcmllbmQ8L3N0cm9uZz5cXG5cdFx0XHQ8L2Rpdj5cXG5cdFx0PC9saT5cdFx0XHRcXG5cdDwvdWw+XHRcXG48L2Rpdj5cIixcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIHVzZXJzLCBicm9rZXIpIHtcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtub3RpZnM6IFtdfSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvbkRlbGV0ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Y29uc3QgaXRlbSA9ICQodGhpcykuY2xvc2VzdCgnbGknKS5kYXRhKCdpdGVtJylcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25EZWxldGUnLCBpdGVtKVxuXHRcdFx0XHRcdHVzZXJzLnJlbW92ZU5vdGlmKGl0ZW0uX2lkKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkFjY2VwdDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Y29uc3QgaXRlbSA9ICQodGhpcykuY2xvc2VzdCgnbGknKS5kYXRhKCdpdGVtJylcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25BY2NlcHQnLCBpdGVtKVxuXG5cdFx0XHRcdFx0Y29uc3QgZnJpZW5kVXNlck5hbWUgPSBpdGVtLmZyb21cblx0XHRcdFx0XHR1c2Vycy5hZGRGcmllbmQoZnJpZW5kVXNlck5hbWUpLnRoZW4oKCkgPT4ge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHVzZXJzLnJlbW92ZU5vdGlmKGl0ZW0uX2lkKS50aGVuKCgpID0+IHtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIHVzZXJzLnNlbmROb3RpZihmcmllbmRVc2VyTmFtZSwgYFVzZXIgaGFzIGFjY2VwdGVkIHlvdXIgaW52aXRhdGlvbmApXG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uRGVjbGluZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Y29uc3QgaXRlbSA9ICQodGhpcykuY2xvc2VzdCgnbGknKS5kYXRhKCdpdGVtJylcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25EZWNsaW5lJywgaXRlbSlcblx0XHRcdFx0XHRjb25zdCBmcmllbmRVc2VyTmFtZSA9IGl0ZW0uZnJvbVxuXG5cdFx0XHRcdFx0dXNlcnMucmVtb3ZlTm90aWYoaXRlbS5faWQpLnRoZW4oKCkgPT4ge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHVzZXJzLnNlbmROb3RpZihmcmllbmRVc2VyTmFtZSwgYFVzZXIgaGFzIGRlY2xpbmVkIHlvdXIgaW52aXRhdGlvbmApXG5cdFx0XHRcdFx0fSlcdFx0XHRcdFxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcdFxuXG5cdFx0ZnVuY3Rpb24gdXBkYXRlTm90aWZzKCkge1xuXHRcdFx0dXNlcnMuZ2V0Tm90aWZzKCkudGhlbigobm90aWZzKSA9PiB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdub3RpZnMnLCBub3RpZnMpXG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7bm90aWZzfSlcblx0XHRcdH0pXHRcdFx0XHRcblx0XHR9XG5cblx0XHRicm9rZXIucmVnaXN0ZXIoJ2JyZWl6Ym90Lm5vdGlmQ291bnQnLCBmdW5jdGlvbihtc2cpIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ21zZycsIG1zZylcblx0XHRcdHVwZGF0ZU5vdGlmcygpXG5cdFx0fSlcblxuXHRcdHVwZGF0ZU5vdGlmcygpXG5cblx0fVxufSk7XG5cblxuXG5cbiJdfQ==
