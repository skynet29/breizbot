$$.control.registerControl('addFriendPage', {

	deps: ['breizbot.users', 'breizbot.params'],

	template: "<form class=\"searchPanel\" bn-event=\"submit: onSearch\">\n	<input type=\"text\" name=\"search\" autofocus=\"\" required=\"\" minlength=\"3\" placeholder=\"Search username\" autocomplete=\"off\">\n	<button class=\"w3-btn w3-blue\" title=\"Search\" type=\"submit\"><i class=\"fa fa-search\"></i></button>\n</form>\n<div class=\"scrollPanel\">\n	<p bn-show=\"friends.length == 0\">No results</p>\n	<ul class=\"w3-ul w3-border w3-white\" \n		bn-event=\"click.invit: onInvit\"\n		bn-each=\"friends\"\n		bn-show=\"friends.length > 0\"\n		>\n		<li class=\"w3-bar\">\n			<span class=\"w3-button w3-right invit\" title=\"Invit\" bn-data=\"{username: $i.username}\"><i class=\"fa fa-plus\"></i></span>\n\n			<div class=\"w3-bar-item\">\n				<i class=\"fa fa-user w3-text-blue\"></i>\n				<span bn-text=\"$i.username\"></span><br>\n				<i class=\"fa fa-map-marker-alt w3-text-blue\"></i>\n				<span bn-text=\"$i.location\"></span>\n			</div>\n		</li>\n	</ul>		\n</div>\n",

	props: {
		friends: []
	},

	init: function(elt, users, params) {

		const currentFriends = this.props.friends

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
						ctrl.setData({friends: friends.filter((friend) => friend.username != params.$userName)})
					})
				},
				onInvit: function(ev) {
					const friendUserName = $(this).data('username')
					console.log('onInvit', friendUserName)
					if (currentFriends.includes(friendUserName)) {
						$$.ui.showAlert({title: 'Warning', content: `
							User <strong>${friendUserName}</strong> is already your friend
							`})
						return
					}

					users.sendNotif(friendUserName, {
						type: 'invit',
					})
				}
			}
		})	

	}
});





$$.control.registerControl('rootPage', {

	template: "<div class=\"addFriend\">\n	<button \n		class=\"w3-btn w3-blue\" \n		title=\"Add Friend\"\n		bn-event=\"click: onAddFriend\"\n\n	><i class=\"fa fa-user-plus\"></i></button>	\n</div>\n<div bn-control=\"breizbot.friends\" bn-iface=\"friends\"></div>",

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
					$pager.pushPage('addFriendPage', {
						title: 'Add Friend',
						props: {
							friends: ctrl.scope.friends.getFriends()
						}
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





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFkZEZyaWVuZC5qcyIsIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJhcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYWRkRnJpZW5kUGFnZScsIHtcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LnVzZXJzJywgJ2JyZWl6Ym90LnBhcmFtcyddLFxuXG5cdHRlbXBsYXRlOiBcIjxmb3JtIGNsYXNzPVxcXCJzZWFyY2hQYW5lbFxcXCIgYm4tZXZlbnQ9XFxcInN1Ym1pdDogb25TZWFyY2hcXFwiPlxcblx0PGlucHV0IHR5cGU9XFxcInRleHRcXFwiIG5hbWU9XFxcInNlYXJjaFxcXCIgYXV0b2ZvY3VzPVxcXCJcXFwiIHJlcXVpcmVkPVxcXCJcXFwiIG1pbmxlbmd0aD1cXFwiM1xcXCIgcGxhY2Vob2xkZXI9XFxcIlNlYXJjaCB1c2VybmFtZVxcXCIgYXV0b2NvbXBsZXRlPVxcXCJvZmZcXFwiPlxcblx0PGJ1dHRvbiBjbGFzcz1cXFwidzMtYnRuIHczLWJsdWVcXFwiIHRpdGxlPVxcXCJTZWFyY2hcXFwiIHR5cGU9XFxcInN1Ym1pdFxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXNlYXJjaFxcXCI+PC9pPjwvYnV0dG9uPlxcbjwvZm9ybT5cXG48ZGl2IGNsYXNzPVxcXCJzY3JvbGxQYW5lbFxcXCI+XFxuXHQ8cCBibi1zaG93PVxcXCJmcmllbmRzLmxlbmd0aCA9PSAwXFxcIj5ObyByZXN1bHRzPC9wPlxcblx0PHVsIGNsYXNzPVxcXCJ3My11bCB3My1ib3JkZXIgdzMtd2hpdGVcXFwiIFxcblx0XHRibi1ldmVudD1cXFwiY2xpY2suaW52aXQ6IG9uSW52aXRcXFwiXFxuXHRcdGJuLWVhY2g9XFxcImZyaWVuZHNcXFwiXFxuXHRcdGJuLXNob3c9XFxcImZyaWVuZHMubGVuZ3RoID4gMFxcXCJcXG5cdFx0Plxcblx0XHQ8bGkgY2xhc3M9XFxcInczLWJhclxcXCI+XFxuXHRcdFx0PHNwYW4gY2xhc3M9XFxcInczLWJ1dHRvbiB3My1yaWdodCBpbnZpdFxcXCIgdGl0bGU9XFxcIkludml0XFxcIiBibi1kYXRhPVxcXCJ7dXNlcm5hbWU6ICRpLnVzZXJuYW1lfVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXBsdXNcXFwiPjwvaT48L3NwYW4+XFxuXFxuXHRcdFx0PGRpdiBjbGFzcz1cXFwidzMtYmFyLWl0ZW1cXFwiPlxcblx0XHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLXVzZXIgdzMtdGV4dC1ibHVlXFxcIj48L2k+XFxuXHRcdFx0XHQ8c3BhbiBibi10ZXh0PVxcXCIkaS51c2VybmFtZVxcXCI+PC9zcGFuPjxicj5cXG5cdFx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1tYXAtbWFya2VyLWFsdCB3My10ZXh0LWJsdWVcXFwiPjwvaT5cXG5cdFx0XHRcdDxzcGFuIGJuLXRleHQ9XFxcIiRpLmxvY2F0aW9uXFxcIj48L3NwYW4+XFxuXHRcdFx0PC9kaXY+XFxuXHRcdDwvbGk+XFxuXHQ8L3VsPlx0XHRcXG48L2Rpdj5cXG5cIixcblxuXHRwcm9wczoge1xuXHRcdGZyaWVuZHM6IFtdXG5cdH0sXG5cblx0aW5pdDogZnVuY3Rpb24oZWx0LCB1c2VycywgcGFyYW1zKSB7XG5cblx0XHRjb25zdCBjdXJyZW50RnJpZW5kcyA9IHRoaXMucHJvcHMuZnJpZW5kc1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRmcmllbmRzOiBbXVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvblNlYXJjaDogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25TZWFyY2gnKVxuXHRcdFx0XHRcdGV2LnByZXZlbnREZWZhdWx0KClcblx0XHRcdFx0XHRjb25zdCB7c2VhcmNofSA9ICQodGhpcykuZ2V0Rm9ybURhdGEoKVxuXHRcdFx0XHRcdCQodGhpcykucmVzZXRGb3JtKClcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnc2VhcmNoJywgc2VhcmNoKVxuXHRcdFx0XHRcdHVzZXJzLm1hdGNoKHNlYXJjaCkudGhlbigoZnJpZW5kcykgPT4ge1xuXHRcdFx0XHRcdFx0Y3RybC5zZXREYXRhKHtmcmllbmRzOiBmcmllbmRzLmZpbHRlcigoZnJpZW5kKSA9PiBmcmllbmQudXNlcm5hbWUgIT0gcGFyYW1zLiR1c2VyTmFtZSl9KVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uSW52aXQ6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Y29uc3QgZnJpZW5kVXNlck5hbWUgPSAkKHRoaXMpLmRhdGEoJ3VzZXJuYW1lJylcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25JbnZpdCcsIGZyaWVuZFVzZXJOYW1lKVxuXHRcdFx0XHRcdGlmIChjdXJyZW50RnJpZW5kcy5pbmNsdWRlcyhmcmllbmRVc2VyTmFtZSkpIHtcblx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7dGl0bGU6ICdXYXJuaW5nJywgY29udGVudDogYFxuXHRcdFx0XHRcdFx0XHRVc2VyIDxzdHJvbmc+JHtmcmllbmRVc2VyTmFtZX08L3N0cm9uZz4gaXMgYWxyZWFkeSB5b3VyIGZyaWVuZFxuXHRcdFx0XHRcdFx0XHRgfSlcblx0XHRcdFx0XHRcdHJldHVyblxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHVzZXJzLnNlbmROb3RpZihmcmllbmRVc2VyTmFtZSwge1xuXHRcdFx0XHRcdFx0dHlwZTogJ2ludml0Jyxcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcdFxuXG5cdH1cbn0pO1xuXG5cblxuXG4iLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgncm9vdFBhZ2UnLCB7XG5cblx0dGVtcGxhdGU6IFwiPGRpdiBjbGFzcz1cXFwiYWRkRnJpZW5kXFxcIj5cXG5cdDxidXR0b24gXFxuXHRcdGNsYXNzPVxcXCJ3My1idG4gdzMtYmx1ZVxcXCIgXFxuXHRcdHRpdGxlPVxcXCJBZGQgRnJpZW5kXFxcIlxcblx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uQWRkRnJpZW5kXFxcIlxcblxcblx0PjxpIGNsYXNzPVxcXCJmYSBmYS11c2VyLXBsdXNcXFwiPjwvaT48L2J1dHRvbj5cdFxcbjwvZGl2PlxcbjxkaXYgYm4tY29udHJvbD1cXFwiYnJlaXpib3QuZnJpZW5kc1xcXCIgYm4taWZhY2U9XFxcImZyaWVuZHNcXFwiPjwvZGl2PlwiLFxuXG5cdHByb3BzOiB7XG5cdFx0JHBhZ2VyOiBudWxsXG5cdH0sXG5cblx0aW5pdDogZnVuY3Rpb24oZWx0KSB7XG5cblx0XHRjb25zdCB7JHBhZ2VyfSA9IHRoaXMucHJvcHNcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25BZGRGcmllbmQ6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uQWRkRnJpZW5kJylcblx0XHRcdFx0XHQkcGFnZXIucHVzaFBhZ2UoJ2FkZEZyaWVuZFBhZ2UnLCB7XG5cdFx0XHRcdFx0XHR0aXRsZTogJ0FkZCBGcmllbmQnLFxuXHRcdFx0XHRcdFx0cHJvcHM6IHtcblx0XHRcdFx0XHRcdFx0ZnJpZW5kczogY3RybC5zY29wZS5mcmllbmRzLmdldEZyaWVuZHMoKVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH1cblx0XHRcdFx0Ly8gb25EZWxldGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHQvLyBcdHZhciBub3RpZklkID0gJCh0aGlzKS5jbG9zZXN0KCdsaScpLmRhdGEoJ25vdGlmSWQnKVxuXHRcdFx0XHQvLyBcdGNvbnNvbGUubG9nKCdvbkRlbGV0ZScsIG5vdGlmSWQpXG5cdFx0XHRcdC8vIFx0dXNlcnMucmVtb3ZlTm90aWYobm90aWZJZClcblx0XHRcdFx0Ly8gfVxuXHRcdFx0fVxuXHRcdH0pXHRcblxuXHR9XG59KTtcblxuXG5cblxuIl19
