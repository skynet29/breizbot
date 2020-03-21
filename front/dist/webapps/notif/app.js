$$.control.registerControl('rootPage', {

	deps: ['breizbot.users', 'breizbot.broker'],

	template: "<div class=\"scrollPanel\">\n	<ul class=\"w3-ul w3-border w3-white\" \n		bn-each=\"notifs\" bn-iter=\"n\"\n		bn-event=\"click.delete: onDelete, click.accept: onAccept, click.decline: onDecline, click.reply: onReply\"\n		>\n		<li class=\"w3-bar\" bn-show=\"show1\">\n			<span class=\"w3-button w3-right w3-blue delete\" title=\"Delete\"><i class=\"fa fa-times\"></i></span>\n			<span class=\"w3-button w3-right w3-blue reply\" title=\"Reply\" bn-show=\"show2\"><i class=\"fa fa-reply\"></i></span>\n\n			<div class=\"w3-bar-item\">\n				From: <span bn-text=\"$scope.n.from\"></span><br>\n				Date: <span bn-text=\"text1\"></span>\n				at <span bn-text=\"text2\"></span>\n				<br>\n				Message: <span bn-html=\"$scope.n.notif.text\"></span>\n			</div>\n		</li>\n\n		<li class=\"w3-bar\" bn-show=\"isInvit\">\n			<span class=\"w3-button w3-right w3-green accept\"><i class=\"fa fa-user-check\"></i></span>\n			<span class=\"w3-button w3-right w3-red decline\"><i class=\"fa fa-user-slash\"></i></span>\n\n			<div class=\"w3-bar-item\">\n				From: <span bn-text=\"$scope.n.from\"></span><br>\n				Date: <span bn-text=\"text1\"></span>\n				at <span bn-text=\"text2\"></span>\n				<br>\n				Message: <strong>I want to be your friend</strong>\n			</div>\n		</li>			\n	</ul>	\n</div>",

	init: function(elt, users, broker) {

		const ctrl = $$.viewController(elt, {
			data: {
				notifs: [],
				show1: function(scope) {return typeof scope.n.notif.text === 'string'},
				show2: function(scope) {return scope.n.notif.reply === true},
				text1: function(scope) {return new Date(scope.n.date).toLocaleDateString()},
				text2: function(scope) {return new Date(scope.n.date).toLocaleTimeString()},
				isInvit: function(scope) {return scope.n.notif.type === 'invit'}
			},
			events: {
				onDelete: function() {
					const idx = $(this).closest('li').index()
					const item = ctrl.model.notifs[idx]
					console.log('onDelete', item)
					users.removeNotif(item._id)
				},
				onAccept: function() {
					const idx = $(this).closest('li').index()
					const item = ctrl.model.notifs[idx]
					console.log('onAccept', item)

					const friendUserName = item.from
					users.addFriend(friendUserName).then(() => {
						return users.removeNotif(item._id).then(() => {
							return users.sendNotif(friendUserName, {text: 'User has accepted your invitation'})
						})
					})
				},
				onDecline: function() {
					const idx = $(this).closest('li').index()
					const item = ctrl.model.notifs[idx]
					console.log('onDecline', item)
					const friendUserName = item.from

					users.removeNotif(item._id).then(() => {
						return users.sendNotif(friendUserName, {text: `User has declined your invitation`})
					})				
				},
				onReply: function(ev) {
					const idx = $(this).closest('li').index()
					const item = ctrl.model.notifs[idx]
					console.log('onReply', item)
					const friendUserName = item.from	
					$$.ui.showPrompt({title: 'Reply', label: 'Message:'}, function(text) {
						users.removeNotif(item._id).then(() => {
							return users.sendNotif(friendUserName, {text, reply:true})
						})
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





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImFwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdyb290UGFnZScsIHtcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LnVzZXJzJywgJ2JyZWl6Ym90LmJyb2tlciddLFxuXG5cdHRlbXBsYXRlOiBcIjxkaXYgY2xhc3M9XFxcInNjcm9sbFBhbmVsXFxcIj5cXG5cdDx1bCBjbGFzcz1cXFwidzMtdWwgdzMtYm9yZGVyIHczLXdoaXRlXFxcIiBcXG5cdFx0Ym4tZWFjaD1cXFwibm90aWZzXFxcIiBibi1pdGVyPVxcXCJuXFxcIlxcblx0XHRibi1ldmVudD1cXFwiY2xpY2suZGVsZXRlOiBvbkRlbGV0ZSwgY2xpY2suYWNjZXB0OiBvbkFjY2VwdCwgY2xpY2suZGVjbGluZTogb25EZWNsaW5lLCBjbGljay5yZXBseTogb25SZXBseVxcXCJcXG5cdFx0Plxcblx0XHQ8bGkgY2xhc3M9XFxcInczLWJhclxcXCIgYm4tc2hvdz1cXFwic2hvdzFcXFwiPlxcblx0XHRcdDxzcGFuIGNsYXNzPVxcXCJ3My1idXR0b24gdzMtcmlnaHQgdzMtYmx1ZSBkZWxldGVcXFwiIHRpdGxlPVxcXCJEZWxldGVcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS10aW1lc1xcXCI+PC9pPjwvc3Bhbj5cXG5cdFx0XHQ8c3BhbiBjbGFzcz1cXFwidzMtYnV0dG9uIHczLXJpZ2h0IHczLWJsdWUgcmVwbHlcXFwiIHRpdGxlPVxcXCJSZXBseVxcXCIgYm4tc2hvdz1cXFwic2hvdzJcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1yZXBseVxcXCI+PC9pPjwvc3Bhbj5cXG5cXG5cdFx0XHQ8ZGl2IGNsYXNzPVxcXCJ3My1iYXItaXRlbVxcXCI+XFxuXHRcdFx0XHRGcm9tOiA8c3BhbiBibi10ZXh0PVxcXCIkc2NvcGUubi5mcm9tXFxcIj48L3NwYW4+PGJyPlxcblx0XHRcdFx0RGF0ZTogPHNwYW4gYm4tdGV4dD1cXFwidGV4dDFcXFwiPjwvc3Bhbj5cXG5cdFx0XHRcdGF0IDxzcGFuIGJuLXRleHQ9XFxcInRleHQyXFxcIj48L3NwYW4+XFxuXHRcdFx0XHQ8YnI+XFxuXHRcdFx0XHRNZXNzYWdlOiA8c3BhbiBibi1odG1sPVxcXCIkc2NvcGUubi5ub3RpZi50ZXh0XFxcIj48L3NwYW4+XFxuXHRcdFx0PC9kaXY+XFxuXHRcdDwvbGk+XFxuXFxuXHRcdDxsaSBjbGFzcz1cXFwidzMtYmFyXFxcIiBibi1zaG93PVxcXCJpc0ludml0XFxcIj5cXG5cdFx0XHQ8c3BhbiBjbGFzcz1cXFwidzMtYnV0dG9uIHczLXJpZ2h0IHczLWdyZWVuIGFjY2VwdFxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXVzZXItY2hlY2tcXFwiPjwvaT48L3NwYW4+XFxuXHRcdFx0PHNwYW4gY2xhc3M9XFxcInczLWJ1dHRvbiB3My1yaWdodCB3My1yZWQgZGVjbGluZVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXVzZXItc2xhc2hcXFwiPjwvaT48L3NwYW4+XFxuXFxuXHRcdFx0PGRpdiBjbGFzcz1cXFwidzMtYmFyLWl0ZW1cXFwiPlxcblx0XHRcdFx0RnJvbTogPHNwYW4gYm4tdGV4dD1cXFwiJHNjb3BlLm4uZnJvbVxcXCI+PC9zcGFuPjxicj5cXG5cdFx0XHRcdERhdGU6IDxzcGFuIGJuLXRleHQ9XFxcInRleHQxXFxcIj48L3NwYW4+XFxuXHRcdFx0XHRhdCA8c3BhbiBibi10ZXh0PVxcXCJ0ZXh0MlxcXCI+PC9zcGFuPlxcblx0XHRcdFx0PGJyPlxcblx0XHRcdFx0TWVzc2FnZTogPHN0cm9uZz5JIHdhbnQgdG8gYmUgeW91ciBmcmllbmQ8L3N0cm9uZz5cXG5cdFx0XHQ8L2Rpdj5cXG5cdFx0PC9saT5cdFx0XHRcXG5cdDwvdWw+XHRcXG48L2Rpdj5cIixcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIHVzZXJzLCBicm9rZXIpIHtcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0bm90aWZzOiBbXSxcblx0XHRcdFx0c2hvdzE6IGZ1bmN0aW9uKHNjb3BlKSB7cmV0dXJuIHR5cGVvZiBzY29wZS5uLm5vdGlmLnRleHQgPT09ICdzdHJpbmcnfSxcblx0XHRcdFx0c2hvdzI6IGZ1bmN0aW9uKHNjb3BlKSB7cmV0dXJuIHNjb3BlLm4ubm90aWYucmVwbHkgPT09IHRydWV9LFxuXHRcdFx0XHR0ZXh0MTogZnVuY3Rpb24oc2NvcGUpIHtyZXR1cm4gbmV3IERhdGUoc2NvcGUubi5kYXRlKS50b0xvY2FsZURhdGVTdHJpbmcoKX0sXG5cdFx0XHRcdHRleHQyOiBmdW5jdGlvbihzY29wZSkge3JldHVybiBuZXcgRGF0ZShzY29wZS5uLmRhdGUpLnRvTG9jYWxlVGltZVN0cmluZygpfSxcblx0XHRcdFx0aXNJbnZpdDogZnVuY3Rpb24oc2NvcGUpIHtyZXR1cm4gc2NvcGUubi5ub3RpZi50eXBlID09PSAnaW52aXQnfVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvbkRlbGV0ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Y29uc3QgaWR4ID0gJCh0aGlzKS5jbG9zZXN0KCdsaScpLmluZGV4KClcblx0XHRcdFx0XHRjb25zdCBpdGVtID0gY3RybC5tb2RlbC5ub3RpZnNbaWR4XVxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbkRlbGV0ZScsIGl0ZW0pXG5cdFx0XHRcdFx0dXNlcnMucmVtb3ZlTm90aWYoaXRlbS5faWQpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uQWNjZXB0OiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmNsb3Nlc3QoJ2xpJykuaW5kZXgoKVxuXHRcdFx0XHRcdGNvbnN0IGl0ZW0gPSBjdHJsLm1vZGVsLm5vdGlmc1tpZHhdXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uQWNjZXB0JywgaXRlbSlcblxuXHRcdFx0XHRcdGNvbnN0IGZyaWVuZFVzZXJOYW1lID0gaXRlbS5mcm9tXG5cdFx0XHRcdFx0dXNlcnMuYWRkRnJpZW5kKGZyaWVuZFVzZXJOYW1lKS50aGVuKCgpID0+IHtcblx0XHRcdFx0XHRcdHJldHVybiB1c2Vycy5yZW1vdmVOb3RpZihpdGVtLl9pZCkudGhlbigoKSA9PiB7XG5cdFx0XHRcdFx0XHRcdHJldHVybiB1c2Vycy5zZW5kTm90aWYoZnJpZW5kVXNlck5hbWUsIHt0ZXh0OiAnVXNlciBoYXMgYWNjZXB0ZWQgeW91ciBpbnZpdGF0aW9uJ30pXG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uRGVjbGluZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Y29uc3QgaWR4ID0gJCh0aGlzKS5jbG9zZXN0KCdsaScpLmluZGV4KClcblx0XHRcdFx0XHRjb25zdCBpdGVtID0gY3RybC5tb2RlbC5ub3RpZnNbaWR4XVxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbkRlY2xpbmUnLCBpdGVtKVxuXHRcdFx0XHRcdGNvbnN0IGZyaWVuZFVzZXJOYW1lID0gaXRlbS5mcm9tXG5cblx0XHRcdFx0XHR1c2Vycy5yZW1vdmVOb3RpZihpdGVtLl9pZCkudGhlbigoKSA9PiB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gdXNlcnMuc2VuZE5vdGlmKGZyaWVuZFVzZXJOYW1lLCB7dGV4dDogYFVzZXIgaGFzIGRlY2xpbmVkIHlvdXIgaW52aXRhdGlvbmB9KVxuXHRcdFx0XHRcdH0pXHRcdFx0XHRcblx0XHRcdFx0fSxcblx0XHRcdFx0b25SZXBseTogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmNsb3Nlc3QoJ2xpJykuaW5kZXgoKVxuXHRcdFx0XHRcdGNvbnN0IGl0ZW0gPSBjdHJsLm1vZGVsLm5vdGlmc1tpZHhdXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uUmVwbHknLCBpdGVtKVxuXHRcdFx0XHRcdGNvbnN0IGZyaWVuZFVzZXJOYW1lID0gaXRlbS5mcm9tXHRcblx0XHRcdFx0XHQkJC51aS5zaG93UHJvbXB0KHt0aXRsZTogJ1JlcGx5JywgbGFiZWw6ICdNZXNzYWdlOid9LCBmdW5jdGlvbih0ZXh0KSB7XG5cdFx0XHRcdFx0XHR1c2Vycy5yZW1vdmVOb3RpZihpdGVtLl9pZCkudGhlbigoKSA9PiB7XG5cdFx0XHRcdFx0XHRcdHJldHVybiB1c2Vycy5zZW5kTm90aWYoZnJpZW5kVXNlck5hbWUsIHt0ZXh0LCByZXBseTp0cnVlfSlcblx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0fSlcdFx0XHRcdFxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcdFxuXG5cdFx0ZnVuY3Rpb24gdXBkYXRlTm90aWZzKCkge1xuXHRcdFx0dXNlcnMuZ2V0Tm90aWZzKCkudGhlbigobm90aWZzKSA9PiB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdub3RpZnMnLCBub3RpZnMpXG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7bm90aWZzfSlcblx0XHRcdH0pXHRcdFx0XHRcblx0XHR9XG5cblx0XHRicm9rZXIucmVnaXN0ZXIoJ2JyZWl6Ym90Lm5vdGlmQ291bnQnLCBmdW5jdGlvbihtc2cpIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ21zZycsIG1zZylcblx0XHRcdHVwZGF0ZU5vdGlmcygpXG5cdFx0fSlcblxuXHRcdHVwZGF0ZU5vdGlmcygpXG5cblx0fVxufSk7XG5cblxuXG5cbiJdfQ==
