$$.control.registerControl('rootPage', {

	deps: ['breizbot.users', 'breizbot.broker'],

	template: "<div class=\"scrollPanel\">\n	<ul class=\"w3-ul w3-border w3-white\" \n		bn-each=\"notifs\" bn-iter=\"n\"\n		bn-event=\"click.delete: onDelete, click.accept: onAccept, click.decline: onDecline, click.reply: onReply\"\n		>\n		<li class=\"w3-bar\" bn-data=\"{item: n}\" bn-show=\"typeof n.notif.text === \'string\'\">\n			<span class=\"w3-button w3-right w3-blue delete\" title=\"Delete\"><i class=\"fa fa-times\"></i></span>\n			<span class=\"w3-button w3-right w3-blue reply\" title=\"Reply\" bn-show=\"n.notif.reply === true\"><i class=\"fa fa-reply\"></i></span>\n\n			<div class=\"w3-bar-item\">\n				From: <span bn-text=\"n.from\"></span><br>\n				Date: <span bn-text=\"new Date(n.date).toLocaleDateString()\"></span>\n				at <span bn-text=\"new Date(n.date).toLocaleTimeString()\"></span>\n				<br>\n				Message: <span bn-html=\"n.notif.text\"></span>\n			</div>\n		</li>\n\n		<li class=\"w3-bar\" bn-data=\"{item: n}\" bn-show=\"n.notif.type === \'invit\'\">\n			<span class=\"w3-button w3-right w3-green accept\"><i class=\"fa fa-user-check\"></i></span>\n			<span class=\"w3-button w3-right w3-red decline\"><i class=\"fa fa-user-slash\"></i></span>\n\n			<div class=\"w3-bar-item\">\n				From: <span bn-text=\"n.from\"></span><br>\n				Date: <span bn-text=\"new Date(n.date).toLocaleDateString()\"></span>\n				at <span bn-text=\"new Date(n.date).toLocaleTimeString()\"></span>\n				<br>\n				Message: <strong>I want to be your friend</strong>\n			</div>\n		</li>			\n	</ul>	\n</div>",

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
							return users.sendNotif(friendUserName, {text: 'User has accepted your invitation'})
						})
					})
				},
				onDecline: function() {
					const item = $(this).closest('li').data('item')
					console.log('onDecline', item)
					const friendUserName = item.from

					users.removeNotif(item._id).then(() => {
						return users.sendNotif(friendUserName, {text: `User has declined your invitation`})
					})				
				},
				onReply: function(ev) {
					const item = $(this).closest('li').data('item')
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





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ3Jvb3RQYWdlJywge1xuXG5cdGRlcHM6IFsnYnJlaXpib3QudXNlcnMnLCAnYnJlaXpib3QuYnJva2VyJ10sXG5cblx0dGVtcGxhdGU6IFwiPGRpdiBjbGFzcz1cXFwic2Nyb2xsUGFuZWxcXFwiPlxcblx0PHVsIGNsYXNzPVxcXCJ3My11bCB3My1ib3JkZXIgdzMtd2hpdGVcXFwiIFxcblx0XHRibi1lYWNoPVxcXCJub3RpZnNcXFwiIGJuLWl0ZXI9XFxcIm5cXFwiXFxuXHRcdGJuLWV2ZW50PVxcXCJjbGljay5kZWxldGU6IG9uRGVsZXRlLCBjbGljay5hY2NlcHQ6IG9uQWNjZXB0LCBjbGljay5kZWNsaW5lOiBvbkRlY2xpbmUsIGNsaWNrLnJlcGx5OiBvblJlcGx5XFxcIlxcblx0XHQ+XFxuXHRcdDxsaSBjbGFzcz1cXFwidzMtYmFyXFxcIiBibi1kYXRhPVxcXCJ7aXRlbTogbn1cXFwiIGJuLXNob3c9XFxcInR5cGVvZiBuLm5vdGlmLnRleHQgPT09IFxcJ3N0cmluZ1xcJ1xcXCI+XFxuXHRcdFx0PHNwYW4gY2xhc3M9XFxcInczLWJ1dHRvbiB3My1yaWdodCB3My1ibHVlIGRlbGV0ZVxcXCIgdGl0bGU9XFxcIkRlbGV0ZVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXRpbWVzXFxcIj48L2k+PC9zcGFuPlxcblx0XHRcdDxzcGFuIGNsYXNzPVxcXCJ3My1idXR0b24gdzMtcmlnaHQgdzMtYmx1ZSByZXBseVxcXCIgdGl0bGU9XFxcIlJlcGx5XFxcIiBibi1zaG93PVxcXCJuLm5vdGlmLnJlcGx5ID09PSB0cnVlXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtcmVwbHlcXFwiPjwvaT48L3NwYW4+XFxuXFxuXHRcdFx0PGRpdiBjbGFzcz1cXFwidzMtYmFyLWl0ZW1cXFwiPlxcblx0XHRcdFx0RnJvbTogPHNwYW4gYm4tdGV4dD1cXFwibi5mcm9tXFxcIj48L3NwYW4+PGJyPlxcblx0XHRcdFx0RGF0ZTogPHNwYW4gYm4tdGV4dD1cXFwibmV3IERhdGUobi5kYXRlKS50b0xvY2FsZURhdGVTdHJpbmcoKVxcXCI+PC9zcGFuPlxcblx0XHRcdFx0YXQgPHNwYW4gYm4tdGV4dD1cXFwibmV3IERhdGUobi5kYXRlKS50b0xvY2FsZVRpbWVTdHJpbmcoKVxcXCI+PC9zcGFuPlxcblx0XHRcdFx0PGJyPlxcblx0XHRcdFx0TWVzc2FnZTogPHNwYW4gYm4taHRtbD1cXFwibi5ub3RpZi50ZXh0XFxcIj48L3NwYW4+XFxuXHRcdFx0PC9kaXY+XFxuXHRcdDwvbGk+XFxuXFxuXHRcdDxsaSBjbGFzcz1cXFwidzMtYmFyXFxcIiBibi1kYXRhPVxcXCJ7aXRlbTogbn1cXFwiIGJuLXNob3c9XFxcIm4ubm90aWYudHlwZSA9PT0gXFwnaW52aXRcXCdcXFwiPlxcblx0XHRcdDxzcGFuIGNsYXNzPVxcXCJ3My1idXR0b24gdzMtcmlnaHQgdzMtZ3JlZW4gYWNjZXB0XFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtdXNlci1jaGVja1xcXCI+PC9pPjwvc3Bhbj5cXG5cdFx0XHQ8c3BhbiBjbGFzcz1cXFwidzMtYnV0dG9uIHczLXJpZ2h0IHczLXJlZCBkZWNsaW5lXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtdXNlci1zbGFzaFxcXCI+PC9pPjwvc3Bhbj5cXG5cXG5cdFx0XHQ8ZGl2IGNsYXNzPVxcXCJ3My1iYXItaXRlbVxcXCI+XFxuXHRcdFx0XHRGcm9tOiA8c3BhbiBibi10ZXh0PVxcXCJuLmZyb21cXFwiPjwvc3Bhbj48YnI+XFxuXHRcdFx0XHREYXRlOiA8c3BhbiBibi10ZXh0PVxcXCJuZXcgRGF0ZShuLmRhdGUpLnRvTG9jYWxlRGF0ZVN0cmluZygpXFxcIj48L3NwYW4+XFxuXHRcdFx0XHRhdCA8c3BhbiBibi10ZXh0PVxcXCJuZXcgRGF0ZShuLmRhdGUpLnRvTG9jYWxlVGltZVN0cmluZygpXFxcIj48L3NwYW4+XFxuXHRcdFx0XHQ8YnI+XFxuXHRcdFx0XHRNZXNzYWdlOiA8c3Ryb25nPkkgd2FudCB0byBiZSB5b3VyIGZyaWVuZDwvc3Ryb25nPlxcblx0XHRcdDwvZGl2Plxcblx0XHQ8L2xpPlx0XHRcdFxcblx0PC91bD5cdFxcbjwvZGl2PlwiLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgdXNlcnMsIGJyb2tlcikge1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge25vdGlmczogW119LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uRGVsZXRlOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRjb25zdCBpdGVtID0gJCh0aGlzKS5jbG9zZXN0KCdsaScpLmRhdGEoJ2l0ZW0nKVxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbkRlbGV0ZScsIGl0ZW0pXG5cdFx0XHRcdFx0dXNlcnMucmVtb3ZlTm90aWYoaXRlbS5faWQpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uQWNjZXB0OiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRjb25zdCBpdGVtID0gJCh0aGlzKS5jbG9zZXN0KCdsaScpLmRhdGEoJ2l0ZW0nKVxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbkFjY2VwdCcsIGl0ZW0pXG5cblx0XHRcdFx0XHRjb25zdCBmcmllbmRVc2VyTmFtZSA9IGl0ZW0uZnJvbVxuXHRcdFx0XHRcdHVzZXJzLmFkZEZyaWVuZChmcmllbmRVc2VyTmFtZSkudGhlbigoKSA9PiB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gdXNlcnMucmVtb3ZlTm90aWYoaXRlbS5faWQpLnRoZW4oKCkgPT4ge1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gdXNlcnMuc2VuZE5vdGlmKGZyaWVuZFVzZXJOYW1lLCB7dGV4dDogJ1VzZXIgaGFzIGFjY2VwdGVkIHlvdXIgaW52aXRhdGlvbid9KVxuXHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkRlY2xpbmU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGNvbnN0IGl0ZW0gPSAkKHRoaXMpLmNsb3Nlc3QoJ2xpJykuZGF0YSgnaXRlbScpXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uRGVjbGluZScsIGl0ZW0pXG5cdFx0XHRcdFx0Y29uc3QgZnJpZW5kVXNlck5hbWUgPSBpdGVtLmZyb21cblxuXHRcdFx0XHRcdHVzZXJzLnJlbW92ZU5vdGlmKGl0ZW0uX2lkKS50aGVuKCgpID0+IHtcblx0XHRcdFx0XHRcdHJldHVybiB1c2Vycy5zZW5kTm90aWYoZnJpZW5kVXNlck5hbWUsIHt0ZXh0OiBgVXNlciBoYXMgZGVjbGluZWQgeW91ciBpbnZpdGF0aW9uYH0pXG5cdFx0XHRcdFx0fSlcdFx0XHRcdFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvblJlcGx5OiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGNvbnN0IGl0ZW0gPSAkKHRoaXMpLmNsb3Nlc3QoJ2xpJykuZGF0YSgnaXRlbScpXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uUmVwbHknLCBpdGVtKVxuXHRcdFx0XHRcdGNvbnN0IGZyaWVuZFVzZXJOYW1lID0gaXRlbS5mcm9tXHRcblx0XHRcdFx0XHQkJC51aS5zaG93UHJvbXB0KHt0aXRsZTogJ1JlcGx5JywgbGFiZWw6ICdNZXNzYWdlOid9LCBmdW5jdGlvbih0ZXh0KSB7XG5cdFx0XHRcdFx0XHR1c2Vycy5yZW1vdmVOb3RpZihpdGVtLl9pZCkudGhlbigoKSA9PiB7XG5cdFx0XHRcdFx0XHRcdHJldHVybiB1c2Vycy5zZW5kTm90aWYoZnJpZW5kVXNlck5hbWUsIHt0ZXh0LCByZXBseTp0cnVlfSlcblx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0fSlcdFx0XHRcdFxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcdFxuXG5cdFx0ZnVuY3Rpb24gdXBkYXRlTm90aWZzKCkge1xuXHRcdFx0dXNlcnMuZ2V0Tm90aWZzKCkudGhlbigobm90aWZzKSA9PiB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdub3RpZnMnLCBub3RpZnMpXG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7bm90aWZzfSlcblx0XHRcdH0pXHRcdFx0XHRcblx0XHR9XG5cblx0XHRicm9rZXIucmVnaXN0ZXIoJ2JyZWl6Ym90Lm5vdGlmQ291bnQnLCBmdW5jdGlvbihtc2cpIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ21zZycsIG1zZylcblx0XHRcdHVwZGF0ZU5vdGlmcygpXG5cdFx0fSlcblxuXHRcdHVwZGF0ZU5vdGlmcygpXG5cblx0fVxufSk7XG5cblxuXG5cbiJdfQ==
