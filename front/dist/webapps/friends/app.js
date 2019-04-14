$$.control.registerControl('addFriend', {

	deps: ['breizbot.users', 'breizbot.params'],

	template: "<form class=\"searchPanel\" bn-event=\"submit: onSearch\">\n	<input type=\"text\" name=\"search\" autofocus=\"\" required=\"\" minlength=\"3\" placeholder=\"Search username\">\n	<button class=\"w3-btn w3-blue\" title=\"Search\" type=\"submit\"><i class=\"fa fa-search\"></i></button>\n</form>\n<ul class=\"w3-ul w3-border w3-white\" \n	bn-event=\"click.invit: onInvit\"\n	bn-each=\"friends\">\n	<li class=\"w3-bar\">\n		<span class=\"w3-button w3-right invit\" title=\"Invit\" bn-data=\"{username: $i.username}\"><i class=\"fa fa-plus\"></i></span>\n\n		<div class=\"w3-bar-item\" bn-text=\"$i.username\" ></div>\n	</li>\n</ul>	",

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

	deps: ['breizbot.users'],

	template: "<div class=\"addFriend\">\n	<button \n		class=\"w3-btn w3-blue\" \n		title=\"Add Friend\"\n		bn-event=\"click: onAddFriend\"\n\n	><i class=\"fa fa-user-plus\"></i></button>	\n</div>\n<ul class=\"w3-ul w3-border w3-white w3-hoverable\" \n	bn-each=\"friends\">\n	<li class=\"w3-bar\">\n<!-- 		<span class=\"w3-button w3-right delete\" title=\"Delete\"><i class=\"fa fa-times\"></i></span>\n -->\n		<div class=\"w3-bar-item\" bn-text=\"$i\" ></div>\n	</li>\n</ul>	",

	props: {
		$pager: null
	},

	init: function(elt, users) {

		const {$pager} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				friends: []
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

		function updateFriends() {
			users.getFriends().then((friends) => {
				console.log('friends', friends)
				ctrl.setData({friends})
			})				
		}


		updateFriends()

	}
});





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFkZEZyaWVuZC5qcyIsIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImFwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdhZGRGcmllbmQnLCB7XG5cblx0ZGVwczogWydicmVpemJvdC51c2VycycsICdicmVpemJvdC5wYXJhbXMnXSxcblxuXHR0ZW1wbGF0ZTogXCI8Zm9ybSBjbGFzcz1cXFwic2VhcmNoUGFuZWxcXFwiIGJuLWV2ZW50PVxcXCJzdWJtaXQ6IG9uU2VhcmNoXFxcIj5cXG5cdDxpbnB1dCB0eXBlPVxcXCJ0ZXh0XFxcIiBuYW1lPVxcXCJzZWFyY2hcXFwiIGF1dG9mb2N1cz1cXFwiXFxcIiByZXF1aXJlZD1cXFwiXFxcIiBtaW5sZW5ndGg9XFxcIjNcXFwiIHBsYWNlaG9sZGVyPVxcXCJTZWFyY2ggdXNlcm5hbWVcXFwiPlxcblx0PGJ1dHRvbiBjbGFzcz1cXFwidzMtYnRuIHczLWJsdWVcXFwiIHRpdGxlPVxcXCJTZWFyY2hcXFwiIHR5cGU9XFxcInN1Ym1pdFxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXNlYXJjaFxcXCI+PC9pPjwvYnV0dG9uPlxcbjwvZm9ybT5cXG48dWwgY2xhc3M9XFxcInczLXVsIHczLWJvcmRlciB3My13aGl0ZVxcXCIgXFxuXHRibi1ldmVudD1cXFwiY2xpY2suaW52aXQ6IG9uSW52aXRcXFwiXFxuXHRibi1lYWNoPVxcXCJmcmllbmRzXFxcIj5cXG5cdDxsaSBjbGFzcz1cXFwidzMtYmFyXFxcIj5cXG5cdFx0PHNwYW4gY2xhc3M9XFxcInczLWJ1dHRvbiB3My1yaWdodCBpbnZpdFxcXCIgdGl0bGU9XFxcIkludml0XFxcIiBibi1kYXRhPVxcXCJ7dXNlcm5hbWU6ICRpLnVzZXJuYW1lfVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXBsdXNcXFwiPjwvaT48L3NwYW4+XFxuXFxuXHRcdDxkaXYgY2xhc3M9XFxcInczLWJhci1pdGVtXFxcIiBibi10ZXh0PVxcXCIkaS51c2VybmFtZVxcXCIgPjwvZGl2Plxcblx0PC9saT5cXG48L3VsPlx0XCIsXG5cblx0aW5pdDogZnVuY3Rpb24oZWx0LCB1c2VycywgcGFyYW1zKSB7XG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGZyaWVuZHM6IFtdXG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uU2VhcmNoOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvblNlYXJjaCcpXG5cdFx0XHRcdFx0ZXYucHJldmVudERlZmF1bHQoKVxuXHRcdFx0XHRcdGNvbnN0IHtzZWFyY2h9ID0gJCh0aGlzKS5nZXRGb3JtRGF0YSgpXG5cdFx0XHRcdFx0JCh0aGlzKS5yZXNldEZvcm0oKVxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdzZWFyY2gnLCBzZWFyY2gpXG5cdFx0XHRcdFx0dXNlcnMubWF0Y2goc2VhcmNoKS50aGVuKChmcmllbmRzKSA9PiB7XG5cdFx0XHRcdFx0XHRjdHJsLnNldERhdGEoe2ZyaWVuZHN9KVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uSW52aXQ6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Y29uc3QgZnJpZW5kVXNlck5hbWUgPSAkKHRoaXMpLmRhdGEoJ3VzZXJuYW1lJylcblxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbkludml0JywgZnJpZW5kVXNlck5hbWUpXG5cdFx0XHRcdFx0dXNlcnMuc2VuZE5vdGlmKGZyaWVuZFVzZXJOYW1lLCB7XG5cdFx0XHRcdFx0XHR0eXBlOiAnaW52aXQnLFxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVx0XG5cblx0fVxufSk7XG5cblxuXG5cbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdyb290UGFnZScsIHtcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LnVzZXJzJ10sXG5cblx0dGVtcGxhdGU6IFwiPGRpdiBjbGFzcz1cXFwiYWRkRnJpZW5kXFxcIj5cXG5cdDxidXR0b24gXFxuXHRcdGNsYXNzPVxcXCJ3My1idG4gdzMtYmx1ZVxcXCIgXFxuXHRcdHRpdGxlPVxcXCJBZGQgRnJpZW5kXFxcIlxcblx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uQWRkRnJpZW5kXFxcIlxcblxcblx0PjxpIGNsYXNzPVxcXCJmYSBmYS11c2VyLXBsdXNcXFwiPjwvaT48L2J1dHRvbj5cdFxcbjwvZGl2Plxcbjx1bCBjbGFzcz1cXFwidzMtdWwgdzMtYm9yZGVyIHczLXdoaXRlIHczLWhvdmVyYWJsZVxcXCIgXFxuXHRibi1lYWNoPVxcXCJmcmllbmRzXFxcIj5cXG5cdDxsaSBjbGFzcz1cXFwidzMtYmFyXFxcIj5cXG48IS0tIFx0XHQ8c3BhbiBjbGFzcz1cXFwidzMtYnV0dG9uIHczLXJpZ2h0IGRlbGV0ZVxcXCIgdGl0bGU9XFxcIkRlbGV0ZVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXRpbWVzXFxcIj48L2k+PC9zcGFuPlxcbiAtLT5cXG5cdFx0PGRpdiBjbGFzcz1cXFwidzMtYmFyLWl0ZW1cXFwiIGJuLXRleHQ9XFxcIiRpXFxcIiA+PC9kaXY+XFxuXHQ8L2xpPlxcbjwvdWw+XHRcIixcblxuXHRwcm9wczoge1xuXHRcdCRwYWdlcjogbnVsbFxuXHR9LFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgdXNlcnMpIHtcblxuXHRcdGNvbnN0IHskcGFnZXJ9ID0gdGhpcy5wcm9wc1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRmcmllbmRzOiBbXVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvbkFkZEZyaWVuZDogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25BZGRGcmllbmQnKVxuXHRcdFx0XHRcdCRwYWdlci5wdXNoUGFnZSgnYWRkRnJpZW5kJywge1xuXHRcdFx0XHRcdFx0dGl0bGU6ICdBZGQgRnJpZW5kJ1xuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH1cblx0XHRcdFx0Ly8gb25EZWxldGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHQvLyBcdHZhciBub3RpZklkID0gJCh0aGlzKS5jbG9zZXN0KCdsaScpLmRhdGEoJ25vdGlmSWQnKVxuXHRcdFx0XHQvLyBcdGNvbnNvbGUubG9nKCdvbkRlbGV0ZScsIG5vdGlmSWQpXG5cdFx0XHRcdC8vIFx0dXNlcnMucmVtb3ZlTm90aWYobm90aWZJZClcblx0XHRcdFx0Ly8gfVxuXHRcdFx0fVxuXHRcdH0pXHRcblxuXHRcdGZ1bmN0aW9uIHVwZGF0ZUZyaWVuZHMoKSB7XG5cdFx0XHR1c2Vycy5nZXRGcmllbmRzKCkudGhlbigoZnJpZW5kcykgPT4ge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnZnJpZW5kcycsIGZyaWVuZHMpXG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7ZnJpZW5kc30pXG5cdFx0XHR9KVx0XHRcdFx0XG5cdFx0fVxuXG5cblx0XHR1cGRhdGVGcmllbmRzKClcblxuXHR9XG59KTtcblxuXG5cblxuIl19
