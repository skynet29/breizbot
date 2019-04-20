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





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFkZEZyaWVuZC5qcyIsIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN0REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2FkZEZyaWVuZFBhZ2UnLCB7XG5cblx0ZGVwczogWydicmVpemJvdC51c2VycycsICdicmVpemJvdC5wYXJhbXMnXSxcblxuXHR0ZW1wbGF0ZTogXCI8Zm9ybSBjbGFzcz1cXFwic2VhcmNoUGFuZWxcXFwiIGJuLWV2ZW50PVxcXCJzdWJtaXQ6IG9uU2VhcmNoXFxcIj5cXG5cdDxpbnB1dCB0eXBlPVxcXCJ0ZXh0XFxcIiBuYW1lPVxcXCJzZWFyY2hcXFwiIGF1dG9mb2N1cz1cXFwiXFxcIiByZXF1aXJlZD1cXFwiXFxcIiBtaW5sZW5ndGg9XFxcIjNcXFwiIHBsYWNlaG9sZGVyPVxcXCJTZWFyY2ggdXNlcm5hbWVcXFwiIGF1dG9jb21wbGV0ZT1cXFwib2ZmXFxcIj5cXG5cdDxidXR0b24gY2xhc3M9XFxcInczLWJ0biB3My1ibHVlXFxcIiB0aXRsZT1cXFwiU2VhcmNoXFxcIiB0eXBlPVxcXCJzdWJtaXRcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1zZWFyY2hcXFwiPjwvaT48L2J1dHRvbj5cXG48L2Zvcm0+XFxuPGRpdiBjbGFzcz1cXFwic2Nyb2xsUGFuZWxcXFwiPlxcblx0PHAgYm4tc2hvdz1cXFwiZnJpZW5kcy5sZW5ndGggPT0gMFxcXCI+Tm8gcmVzdWx0czwvcD5cXG5cdDx1bCBjbGFzcz1cXFwidzMtdWwgdzMtYm9yZGVyIHczLXdoaXRlXFxcIiBcXG5cdFx0Ym4tZXZlbnQ9XFxcImNsaWNrLmludml0OiBvbkludml0XFxcIlxcblx0XHRibi1lYWNoPVxcXCJmcmllbmRzXFxcIlxcblx0XHRibi1zaG93PVxcXCJmcmllbmRzLmxlbmd0aCA+IDBcXFwiXFxuXHRcdD5cXG5cdFx0PGxpIGNsYXNzPVxcXCJ3My1iYXJcXFwiPlxcblx0XHRcdDxzcGFuIGNsYXNzPVxcXCJ3My1idXR0b24gdzMtcmlnaHQgaW52aXRcXFwiIHRpdGxlPVxcXCJJbnZpdFxcXCIgYm4tZGF0YT1cXFwie3VzZXJuYW1lOiAkaS51c2VybmFtZX1cXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1wbHVzXFxcIj48L2k+PC9zcGFuPlxcblxcblx0XHRcdDxkaXYgY2xhc3M9XFxcInczLWJhci1pdGVtXFxcIj5cXG5cdFx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS11c2VyIHczLXRleHQtYmx1ZVxcXCI+PC9pPlxcblx0XHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwiJGkudXNlcm5hbWVcXFwiPjwvc3Bhbj48YnI+XFxuXHRcdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtbWFwLW1hcmtlci1hbHQgdzMtdGV4dC1ibHVlXFxcIj48L2k+XFxuXHRcdFx0XHQ8c3BhbiBibi10ZXh0PVxcXCIkaS5sb2NhdGlvblxcXCI+PC9zcGFuPlxcblx0XHRcdDwvZGl2Plxcblx0XHQ8L2xpPlxcblx0PC91bD5cdFx0XFxuPC9kaXY+XFxuXCIsXG5cblx0cHJvcHM6IHtcblx0XHRmcmllbmRzOiBbXVxuXHR9LFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgdXNlcnMsIHBhcmFtcykge1xuXG5cdFx0Y29uc3QgY3VycmVudEZyaWVuZHMgPSB0aGlzLnByb3BzLmZyaWVuZHNcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0ZnJpZW5kczogW11cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25TZWFyY2g6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uU2VhcmNoJylcblx0XHRcdFx0XHRldi5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0XHRcdFx0Y29uc3Qge3NlYXJjaH0gPSAkKHRoaXMpLmdldEZvcm1EYXRhKClcblx0XHRcdFx0XHQkKHRoaXMpLnJlc2V0Rm9ybSgpXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ3NlYXJjaCcsIHNlYXJjaClcblx0XHRcdFx0XHR1c2Vycy5tYXRjaChzZWFyY2gpLnRoZW4oKGZyaWVuZHMpID0+IHtcblx0XHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7ZnJpZW5kczogZnJpZW5kcy5maWx0ZXIoKGZyaWVuZCkgPT4gZnJpZW5kLnVzZXJuYW1lICE9IHBhcmFtcy4kdXNlck5hbWUpfSlcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkludml0OiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGNvbnN0IGZyaWVuZFVzZXJOYW1lID0gJCh0aGlzKS5kYXRhKCd1c2VybmFtZScpXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uSW52aXQnLCBmcmllbmRVc2VyTmFtZSlcblx0XHRcdFx0XHRpZiAoY3VycmVudEZyaWVuZHMuaW5jbHVkZXMoZnJpZW5kVXNlck5hbWUpKSB7XG5cdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe3RpdGxlOiAnV2FybmluZycsIGNvbnRlbnQ6IGBcblx0XHRcdFx0XHRcdFx0VXNlciA8c3Ryb25nPiR7ZnJpZW5kVXNlck5hbWV9PC9zdHJvbmc+IGlzIGFscmVhZHkgeW91ciBmcmllbmRcblx0XHRcdFx0XHRcdFx0YH0pXG5cdFx0XHRcdFx0XHRyZXR1cm5cblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHR1c2Vycy5zZW5kTm90aWYoZnJpZW5kVXNlck5hbWUsIHtcblx0XHRcdFx0XHRcdHR5cGU6ICdpbnZpdCcsXG5cdFx0XHRcdFx0fSkudGhlbigoKSA9PiB7XG5cdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe3RpdGxlOiAnQWRkIEZyaWVuZCcsIGNvbnRlbnQ6IGBBbiBpbnZpdGF0aW9uIHdhcyBzZW50IHRvIHVzZXIgPHN0cm9uZz4ke2ZyaWVuZFVzZXJOYW1lfTwvc3Ryb25nPmB9KVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVx0XG5cblx0fVxufSk7XG5cblxuXG5cbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdyb290UGFnZScsIHtcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGNsYXNzPVxcXCJhZGRGcmllbmRcXFwiPlxcblx0PGJ1dHRvbiBcXG5cdFx0Y2xhc3M9XFxcInczLWJ0biB3My1ibHVlXFxcIiBcXG5cdFx0dGl0bGU9XFxcIkFkZCBGcmllbmRcXFwiXFxuXHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25BZGRGcmllbmRcXFwiXFxuXFxuXHQ+PGkgY2xhc3M9XFxcImZhIGZhLXVzZXItcGx1c1xcXCI+PC9pPjwvYnV0dG9uPlx0XFxuPC9kaXY+XFxuPGRpdiBibi1jb250cm9sPVxcXCJicmVpemJvdC5mcmllbmRzXFxcIiBibi1pZmFjZT1cXFwiZnJpZW5kc1xcXCI+PC9kaXY+XCIsXG5cblx0cHJvcHM6IHtcblx0XHQkcGFnZXI6IG51bGxcblx0fSxcblxuXHRpbml0OiBmdW5jdGlvbihlbHQpIHtcblxuXHRcdGNvbnN0IHskcGFnZXJ9ID0gdGhpcy5wcm9wc1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvbkFkZEZyaWVuZDogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25BZGRGcmllbmQnKVxuXHRcdFx0XHRcdCRwYWdlci5wdXNoUGFnZSgnYWRkRnJpZW5kUGFnZScsIHtcblx0XHRcdFx0XHRcdHRpdGxlOiAnQWRkIEZyaWVuZCcsXG5cdFx0XHRcdFx0XHRwcm9wczoge1xuXHRcdFx0XHRcdFx0XHRmcmllbmRzOiBjdHJsLnNjb3BlLmZyaWVuZHMuZ2V0RnJpZW5kcygpXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fVxuXHRcdFx0XHQvLyBvbkRlbGV0ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdC8vIFx0dmFyIG5vdGlmSWQgPSAkKHRoaXMpLmNsb3Nlc3QoJ2xpJykuZGF0YSgnbm90aWZJZCcpXG5cdFx0XHRcdC8vIFx0Y29uc29sZS5sb2coJ29uRGVsZXRlJywgbm90aWZJZClcblx0XHRcdFx0Ly8gXHR1c2Vycy5yZW1vdmVOb3RpZihub3RpZklkKVxuXHRcdFx0XHQvLyB9XG5cdFx0XHR9XG5cdFx0fSlcdFxuXG5cdH1cbn0pO1xuXG5cblxuXG4iXX0=
