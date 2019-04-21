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
					}).then(() => {
						$$.ui.showAlert({title: 'Add Friend', content: `An invitation was sent to user <strong>${friendUserName}</strong>`})
					})
				}
			}
		})	

	}
});





$$.control.registerControl('rootPage', {

	template: "<div class=\"toolbar\">\n	<button \n		class=\"w3-btn w3-blue\" \n		title=\"Update\"\n		bn-event=\"click: onUpdate\"\n\n	><i class=\"fa fa-redo\"></i></button>	\n\n	<button \n		class=\"w3-btn w3-blue\" \n		title=\"Add Friend\"\n		bn-event=\"click: onAddFriend\"\n\n	><i class=\"fa fa-user-plus\"></i></button>	\n</div>\n<div bn-control=\"breizbot.friends\" bn-iface=\"friends\"></div>",

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
				},
				onUpdate: function() {
					ctrl.scope.friends.update()
				}

			}
		})	

	}
});





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFkZEZyaWVuZC5qcyIsIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN0REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImFwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdhZGRGcmllbmRQYWdlJywge1xuXG5cdGRlcHM6IFsnYnJlaXpib3QudXNlcnMnLCAnYnJlaXpib3QucGFyYW1zJ10sXG5cblx0dGVtcGxhdGU6IFwiPGZvcm0gY2xhc3M9XFxcInNlYXJjaFBhbmVsXFxcIiBibi1ldmVudD1cXFwic3VibWl0OiBvblNlYXJjaFxcXCI+XFxuXHQ8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgbmFtZT1cXFwic2VhcmNoXFxcIiBhdXRvZm9jdXM9XFxcIlxcXCIgcmVxdWlyZWQ9XFxcIlxcXCIgbWlubGVuZ3RoPVxcXCIzXFxcIiBwbGFjZWhvbGRlcj1cXFwiU2VhcmNoIHVzZXJuYW1lXFxcIiBhdXRvY29tcGxldGU9XFxcIm9mZlxcXCI+XFxuXHQ8YnV0dG9uIGNsYXNzPVxcXCJ3My1idG4gdzMtYmx1ZVxcXCIgdGl0bGU9XFxcIlNlYXJjaFxcXCIgdHlwZT1cXFwic3VibWl0XFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtc2VhcmNoXFxcIj48L2k+PC9idXR0b24+XFxuPC9mb3JtPlxcbjxkaXYgY2xhc3M9XFxcInNjcm9sbFBhbmVsXFxcIj5cXG5cdDxwIGJuLXNob3c9XFxcImZyaWVuZHMubGVuZ3RoID09IDBcXFwiPk5vIHJlc3VsdHM8L3A+XFxuXHQ8dWwgY2xhc3M9XFxcInczLXVsIHczLWJvcmRlciB3My13aGl0ZVxcXCIgXFxuXHRcdGJuLWV2ZW50PVxcXCJjbGljay5pbnZpdDogb25JbnZpdFxcXCJcXG5cdFx0Ym4tZWFjaD1cXFwiZnJpZW5kc1xcXCJcXG5cdFx0Ym4tc2hvdz1cXFwiZnJpZW5kcy5sZW5ndGggPiAwXFxcIlxcblx0XHQ+XFxuXHRcdDxsaSBjbGFzcz1cXFwidzMtYmFyXFxcIj5cXG5cdFx0XHQ8c3BhbiBjbGFzcz1cXFwidzMtYnV0dG9uIHczLXJpZ2h0IGludml0XFxcIiB0aXRsZT1cXFwiSW52aXRcXFwiIGJuLWRhdGE9XFxcInt1c2VybmFtZTogJGkudXNlcm5hbWV9XFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtcGx1c1xcXCI+PC9pPjwvc3Bhbj5cXG5cXG5cdFx0XHQ8ZGl2IGNsYXNzPVxcXCJ3My1iYXItaXRlbVxcXCI+XFxuXHRcdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtdXNlciB3My10ZXh0LWJsdWVcXFwiPjwvaT5cXG5cdFx0XHRcdDxzcGFuIGJuLXRleHQ9XFxcIiRpLnVzZXJuYW1lXFxcIj48L3NwYW4+PGJyPlxcblx0XHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLW1hcC1tYXJrZXItYWx0IHczLXRleHQtYmx1ZVxcXCI+PC9pPlxcblx0XHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwiJGkubG9jYXRpb25cXFwiPjwvc3Bhbj5cXG5cdFx0XHQ8L2Rpdj5cXG5cdFx0PC9saT5cXG5cdDwvdWw+XHRcdFxcbjwvZGl2PlxcblwiLFxuXG5cdHByb3BzOiB7XG5cdFx0ZnJpZW5kczogW11cblx0fSxcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIHVzZXJzLCBwYXJhbXMpIHtcblxuXHRcdGNvbnN0IGN1cnJlbnRGcmllbmRzID0gdGhpcy5wcm9wcy5mcmllbmRzXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGZyaWVuZHM6IFtdXG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uU2VhcmNoOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvblNlYXJjaCcpXG5cdFx0XHRcdFx0ZXYucHJldmVudERlZmF1bHQoKVxuXHRcdFx0XHRcdGNvbnN0IHtzZWFyY2h9ID0gJCh0aGlzKS5nZXRGb3JtRGF0YSgpXG5cdFx0XHRcdFx0JCh0aGlzKS5yZXNldEZvcm0oKVxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdzZWFyY2gnLCBzZWFyY2gpXG5cdFx0XHRcdFx0dXNlcnMubWF0Y2goc2VhcmNoKS50aGVuKChmcmllbmRzKSA9PiB7XG5cdFx0XHRcdFx0XHRjdHJsLnNldERhdGEoe2ZyaWVuZHM6IGZyaWVuZHMuZmlsdGVyKChmcmllbmQpID0+IGZyaWVuZC51c2VybmFtZSAhPSBwYXJhbXMuJHVzZXJOYW1lKX0pXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fSxcblx0XHRcdFx0b25JbnZpdDogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRjb25zdCBmcmllbmRVc2VyTmFtZSA9ICQodGhpcykuZGF0YSgndXNlcm5hbWUnKVxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbkludml0JywgZnJpZW5kVXNlck5hbWUpXG5cdFx0XHRcdFx0aWYgKGN1cnJlbnRGcmllbmRzLmluY2x1ZGVzKGZyaWVuZFVzZXJOYW1lKSkge1xuXHRcdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHt0aXRsZTogJ1dhcm5pbmcnLCBjb250ZW50OiBgXG5cdFx0XHRcdFx0XHRcdFVzZXIgPHN0cm9uZz4ke2ZyaWVuZFVzZXJOYW1lfTwvc3Ryb25nPiBpcyBhbHJlYWR5IHlvdXIgZnJpZW5kXG5cdFx0XHRcdFx0XHRcdGB9KVxuXHRcdFx0XHRcdFx0cmV0dXJuXG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0dXNlcnMuc2VuZE5vdGlmKGZyaWVuZFVzZXJOYW1lLCB7XG5cdFx0XHRcdFx0XHR0eXBlOiAnaW52aXQnLFxuXHRcdFx0XHRcdH0pLnRoZW4oKCkgPT4ge1xuXHRcdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHt0aXRsZTogJ0FkZCBGcmllbmQnLCBjb250ZW50OiBgQW4gaW52aXRhdGlvbiB3YXMgc2VudCB0byB1c2VyIDxzdHJvbmc+JHtmcmllbmRVc2VyTmFtZX08L3N0cm9uZz5gfSlcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcdFxuXG5cdH1cbn0pO1xuXG5cblxuXG4iLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgncm9vdFBhZ2UnLCB7XG5cblx0dGVtcGxhdGU6IFwiPGRpdiBjbGFzcz1cXFwidG9vbGJhclxcXCI+XFxuXHQ8YnV0dG9uIFxcblx0XHRjbGFzcz1cXFwidzMtYnRuIHczLWJsdWVcXFwiIFxcblx0XHR0aXRsZT1cXFwiVXBkYXRlXFxcIlxcblx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uVXBkYXRlXFxcIlxcblxcblx0PjxpIGNsYXNzPVxcXCJmYSBmYS1yZWRvXFxcIj48L2k+PC9idXR0b24+XHRcXG5cXG5cdDxidXR0b24gXFxuXHRcdGNsYXNzPVxcXCJ3My1idG4gdzMtYmx1ZVxcXCIgXFxuXHRcdHRpdGxlPVxcXCJBZGQgRnJpZW5kXFxcIlxcblx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uQWRkRnJpZW5kXFxcIlxcblxcblx0PjxpIGNsYXNzPVxcXCJmYSBmYS11c2VyLXBsdXNcXFwiPjwvaT48L2J1dHRvbj5cdFxcbjwvZGl2PlxcbjxkaXYgYm4tY29udHJvbD1cXFwiYnJlaXpib3QuZnJpZW5kc1xcXCIgYm4taWZhY2U9XFxcImZyaWVuZHNcXFwiPjwvZGl2PlwiLFxuXG5cdHByb3BzOiB7XG5cdFx0JHBhZ2VyOiBudWxsXG5cdH0sXG5cblx0aW5pdDogZnVuY3Rpb24oZWx0KSB7XG5cblx0XHRjb25zdCB7JHBhZ2VyfSA9IHRoaXMucHJvcHNcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25BZGRGcmllbmQ6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uQWRkRnJpZW5kJylcblx0XHRcdFx0XHQkcGFnZXIucHVzaFBhZ2UoJ2FkZEZyaWVuZFBhZ2UnLCB7XG5cdFx0XHRcdFx0XHR0aXRsZTogJ0FkZCBGcmllbmQnLFxuXHRcdFx0XHRcdFx0cHJvcHM6IHtcblx0XHRcdFx0XHRcdFx0ZnJpZW5kczogY3RybC5zY29wZS5mcmllbmRzLmdldEZyaWVuZHMoKVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uVXBkYXRlOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRjdHJsLnNjb3BlLmZyaWVuZHMudXBkYXRlKClcblx0XHRcdFx0fVxuXG5cdFx0XHR9XG5cdFx0fSlcdFxuXG5cdH1cbn0pO1xuXG5cblxuXG4iXX0=
