$$.control.registerControl('addFriend', {

	deps: ['breizbot.users', 'breizbot.params'],

	template: "<form class=\"searchPanel\" bn-event=\"submit: onSearch\">\n	<input type=\"text\" name=\"search\" autofocus=\"\" required=\"\" minlength=\"3\" placeholder=\"Search username\">\n	<button class=\"w3-btn w3-blue\" title=\"Search\" type=\"submit\"><i class=\"fa fa-search\"></i></button>\n</form>\n<ul class=\"w3-ul w3-border w3-white\" \n	bn-event=\"click.invit: onInvit\"\n	bn-each=\"friends\"\n	bn-show=\"friends.length > 0\"\n	>\n	<li class=\"w3-bar\">\n		<span class=\"w3-button w3-right invit\" title=\"Invit\" bn-data=\"{username: $i.username}\"><i class=\"fa fa-plus\"></i></span>\n\n		<div class=\"w3-bar-item\" bn-text=\"$i.username\" ></div>\n	</li>\n</ul>	",

	init: function(elt, users, params) {

		const ctrl = $$.viewController(elt, {
			data: {
				friends: []
			},
			events: {
				onSearch: function(ev) {
					console.log('onSearch')
					ev.preventDefault()
					const {search} = $(this).getFormData()
					$(this).resetForm()
					console.log('search', search)
					users.match(search).then((friends) => {
						ctrl.setData({friends})
					})
				},
				onInvit: function(ev) {
					const friendUserName = $(this).data('username')

					console.log('onInvit', friendUserName)
					users.sendNotif(friendUserName, {
						type: 'invit',
					})
				}
			}
		})	

	}
});





$$.control.registerControl('rootPage', {

	template: "<div class=\"addFriend\">\n	<button \n		class=\"w3-btn w3-blue\" \n		title=\"Add Friend\"\n		bn-event=\"click: onAddFriend\"\n\n	><i class=\"fa fa-user-plus\"></i></button>	\n</div>\n<div bn-control=\"breizbot.friends\"></div>",

	props: {
		$pager: null
	},

	init: function(elt) {

		const {$pager} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
			},
			events: {
				onAddFriend: function(ev) {
					console.log('onAddFriend')
					$pager.pushPage('addFriend', {
						title: 'Add Friend'
					})
				}
				// onDelete: function() {
				// 	var notifId = $(this).closest('li').data('notifId')
				// 	console.log('onDelete', notifId)
				// 	users.removeNotif(notifId)
				// }
			}
		})	

	}
});





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFkZEZyaWVuZC5qcyIsIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJhcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYWRkRnJpZW5kJywge1xuXG5cdGRlcHM6IFsnYnJlaXpib3QudXNlcnMnLCAnYnJlaXpib3QucGFyYW1zJ10sXG5cblx0dGVtcGxhdGU6IFwiPGZvcm0gY2xhc3M9XFxcInNlYXJjaFBhbmVsXFxcIiBibi1ldmVudD1cXFwic3VibWl0OiBvblNlYXJjaFxcXCI+XFxuXHQ8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgbmFtZT1cXFwic2VhcmNoXFxcIiBhdXRvZm9jdXM9XFxcIlxcXCIgcmVxdWlyZWQ9XFxcIlxcXCIgbWlubGVuZ3RoPVxcXCIzXFxcIiBwbGFjZWhvbGRlcj1cXFwiU2VhcmNoIHVzZXJuYW1lXFxcIj5cXG5cdDxidXR0b24gY2xhc3M9XFxcInczLWJ0biB3My1ibHVlXFxcIiB0aXRsZT1cXFwiU2VhcmNoXFxcIiB0eXBlPVxcXCJzdWJtaXRcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1zZWFyY2hcXFwiPjwvaT48L2J1dHRvbj5cXG48L2Zvcm0+XFxuPHVsIGNsYXNzPVxcXCJ3My11bCB3My1ib3JkZXIgdzMtd2hpdGVcXFwiIFxcblx0Ym4tZXZlbnQ9XFxcImNsaWNrLmludml0OiBvbkludml0XFxcIlxcblx0Ym4tZWFjaD1cXFwiZnJpZW5kc1xcXCJcXG5cdGJuLXNob3c9XFxcImZyaWVuZHMubGVuZ3RoID4gMFxcXCJcXG5cdD5cXG5cdDxsaSBjbGFzcz1cXFwidzMtYmFyXFxcIj5cXG5cdFx0PHNwYW4gY2xhc3M9XFxcInczLWJ1dHRvbiB3My1yaWdodCBpbnZpdFxcXCIgdGl0bGU9XFxcIkludml0XFxcIiBibi1kYXRhPVxcXCJ7dXNlcm5hbWU6ICRpLnVzZXJuYW1lfVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXBsdXNcXFwiPjwvaT48L3NwYW4+XFxuXFxuXHRcdDxkaXYgY2xhc3M9XFxcInczLWJhci1pdGVtXFxcIiBibi10ZXh0PVxcXCIkaS51c2VybmFtZVxcXCIgPjwvZGl2Plxcblx0PC9saT5cXG48L3VsPlx0XCIsXG5cblx0aW5pdDogZnVuY3Rpb24oZWx0LCB1c2VycywgcGFyYW1zKSB7XG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGZyaWVuZHM6IFtdXG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uU2VhcmNoOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvblNlYXJjaCcpXG5cdFx0XHRcdFx0ZXYucHJldmVudERlZmF1bHQoKVxuXHRcdFx0XHRcdGNvbnN0IHtzZWFyY2h9ID0gJCh0aGlzKS5nZXRGb3JtRGF0YSgpXG5cdFx0XHRcdFx0JCh0aGlzKS5yZXNldEZvcm0oKVxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdzZWFyY2gnLCBzZWFyY2gpXG5cdFx0XHRcdFx0dXNlcnMubWF0Y2goc2VhcmNoKS50aGVuKChmcmllbmRzKSA9PiB7XG5cdFx0XHRcdFx0XHRjdHJsLnNldERhdGEoe2ZyaWVuZHN9KVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uSW52aXQ6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Y29uc3QgZnJpZW5kVXNlck5hbWUgPSAkKHRoaXMpLmRhdGEoJ3VzZXJuYW1lJylcblxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbkludml0JywgZnJpZW5kVXNlck5hbWUpXG5cdFx0XHRcdFx0dXNlcnMuc2VuZE5vdGlmKGZyaWVuZFVzZXJOYW1lLCB7XG5cdFx0XHRcdFx0XHR0eXBlOiAnaW52aXQnLFxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVx0XG5cblx0fVxufSk7XG5cblxuXG5cbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdyb290UGFnZScsIHtcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGNsYXNzPVxcXCJhZGRGcmllbmRcXFwiPlxcblx0PGJ1dHRvbiBcXG5cdFx0Y2xhc3M9XFxcInczLWJ0biB3My1ibHVlXFxcIiBcXG5cdFx0dGl0bGU9XFxcIkFkZCBGcmllbmRcXFwiXFxuXHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25BZGRGcmllbmRcXFwiXFxuXFxuXHQ+PGkgY2xhc3M9XFxcImZhIGZhLXVzZXItcGx1c1xcXCI+PC9pPjwvYnV0dG9uPlx0XFxuPC9kaXY+XFxuPGRpdiBibi1jb250cm9sPVxcXCJicmVpemJvdC5mcmllbmRzXFxcIj48L2Rpdj5cIixcblxuXHRwcm9wczoge1xuXHRcdCRwYWdlcjogbnVsbFxuXHR9LFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCkge1xuXG5cdFx0Y29uc3QgeyRwYWdlcn0gPSB0aGlzLnByb3BzXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uQWRkRnJpZW5kOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbkFkZEZyaWVuZCcpXG5cdFx0XHRcdFx0JHBhZ2VyLnB1c2hQYWdlKCdhZGRGcmllbmQnLCB7XG5cdFx0XHRcdFx0XHR0aXRsZTogJ0FkZCBGcmllbmQnXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fVxuXHRcdFx0XHQvLyBvbkRlbGV0ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdC8vIFx0dmFyIG5vdGlmSWQgPSAkKHRoaXMpLmNsb3Nlc3QoJ2xpJykuZGF0YSgnbm90aWZJZCcpXG5cdFx0XHRcdC8vIFx0Y29uc29sZS5sb2coJ29uRGVsZXRlJywgbm90aWZJZClcblx0XHRcdFx0Ly8gXHR1c2Vycy5yZW1vdmVOb3RpZihub3RpZklkKVxuXHRcdFx0XHQvLyB9XG5cdFx0XHR9XG5cdFx0fSlcdFxuXG5cdH1cbn0pO1xuXG5cblxuXG4iXX0=
