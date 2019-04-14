$$.control.registerControl('addFriend', {

	deps: ['breizbot.users'],

	template: "<form class=\"searchPanel\" bn-event=\"submit: onSearch\">\n	<input type=\"text\" name=\"search\" autofocus=\"\" required=\"\" minlength=\"3\">\n	<button class=\"w3-btn w3-blue\" title=\"Search\" type=\"submit\"><i class=\"fa fa-search\"></i></button>\n</form>\n<ul class=\"w3-ul w3-border w3-white\" \n	bn-event=\"click.invit: onInvit\"\n	bn-each=\"friends\">\n	<li class=\"w3-bar\">\n		<span class=\"w3-button w3-right invit\" title=\"Invit\" bn-data=\"{username: $i.username}\"><i class=\"fa fa-plus\"></i></span>\n\n		<div class=\"w3-bar-item\" bn-text=\"$i.username\" ></div>\n	</li>\n</ul>	",

	init: function(elt, users) {

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
					users.sendInvitation(friendUserName)
				}
			}
		})	

	}
});





$$.control.registerControl('rootPage', {

	deps: ['breizbot.users'],

	template: "<div class=\"addFriend\">\n	<button \n		class=\"w3-btn w3-blue\" \n		title=\"Add Friend\"\n		bn-event=\"click: onAddFriend\"\n\n	><i class=\"fa fa-user-plus\"></i></button>	\n</div>\n<ul class=\"w3-ul w3-border w3-white\" \n	bn-each=\"friends\">\n	<li class=\"w3-bar\">\n<!-- 		<span class=\"w3-button w3-right delete\" title=\"Delete\"><i class=\"fa fa-times\"></i></span>\n -->\n		<div class=\"w3-bar-item\" bn-text=\"$i\" ></div>\n	</li>\n</ul>	",

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





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFkZEZyaWVuZC5qcyIsIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2FkZEZyaWVuZCcsIHtcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LnVzZXJzJ10sXG5cblx0dGVtcGxhdGU6IFwiPGZvcm0gY2xhc3M9XFxcInNlYXJjaFBhbmVsXFxcIiBibi1ldmVudD1cXFwic3VibWl0OiBvblNlYXJjaFxcXCI+XFxuXHQ8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgbmFtZT1cXFwic2VhcmNoXFxcIiBhdXRvZm9jdXM9XFxcIlxcXCIgcmVxdWlyZWQ9XFxcIlxcXCIgbWlubGVuZ3RoPVxcXCIzXFxcIj5cXG5cdDxidXR0b24gY2xhc3M9XFxcInczLWJ0biB3My1ibHVlXFxcIiB0aXRsZT1cXFwiU2VhcmNoXFxcIiB0eXBlPVxcXCJzdWJtaXRcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1zZWFyY2hcXFwiPjwvaT48L2J1dHRvbj5cXG48L2Zvcm0+XFxuPHVsIGNsYXNzPVxcXCJ3My11bCB3My1ib3JkZXIgdzMtd2hpdGVcXFwiIFxcblx0Ym4tZXZlbnQ9XFxcImNsaWNrLmludml0OiBvbkludml0XFxcIlxcblx0Ym4tZWFjaD1cXFwiZnJpZW5kc1xcXCI+XFxuXHQ8bGkgY2xhc3M9XFxcInczLWJhclxcXCI+XFxuXHRcdDxzcGFuIGNsYXNzPVxcXCJ3My1idXR0b24gdzMtcmlnaHQgaW52aXRcXFwiIHRpdGxlPVxcXCJJbnZpdFxcXCIgYm4tZGF0YT1cXFwie3VzZXJuYW1lOiAkaS51c2VybmFtZX1cXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1wbHVzXFxcIj48L2k+PC9zcGFuPlxcblxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJ3My1iYXItaXRlbVxcXCIgYm4tdGV4dD1cXFwiJGkudXNlcm5hbWVcXFwiID48L2Rpdj5cXG5cdDwvbGk+XFxuPC91bD5cdFwiLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgdXNlcnMpIHtcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0ZnJpZW5kczogW11cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25TZWFyY2g6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uU2VhcmNoJylcblx0XHRcdFx0XHRldi5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0XHRcdFx0Y29uc3Qge3NlYXJjaH0gPSAkKHRoaXMpLmdldEZvcm1EYXRhKClcblx0XHRcdFx0XHQkKHRoaXMpLnJlc2V0Rm9ybSgpXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ3NlYXJjaCcsIHNlYXJjaClcblx0XHRcdFx0XHR1c2Vycy5tYXRjaChzZWFyY2gpLnRoZW4oKGZyaWVuZHMpID0+IHtcblx0XHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7ZnJpZW5kc30pXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fSxcblx0XHRcdFx0b25JbnZpdDogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRjb25zdCBmcmllbmRVc2VyTmFtZSA9ICQodGhpcykuZGF0YSgndXNlcm5hbWUnKVxuXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uSW52aXQnLCBmcmllbmRVc2VyTmFtZSlcblx0XHRcdFx0XHR1c2Vycy5zZW5kSW52aXRhdGlvbihmcmllbmRVc2VyTmFtZSlcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXHRcblxuXHR9XG59KTtcblxuXG5cblxuIiwiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ3Jvb3RQYWdlJywge1xuXG5cdGRlcHM6IFsnYnJlaXpib3QudXNlcnMnXSxcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGNsYXNzPVxcXCJhZGRGcmllbmRcXFwiPlxcblx0PGJ1dHRvbiBcXG5cdFx0Y2xhc3M9XFxcInczLWJ0biB3My1ibHVlXFxcIiBcXG5cdFx0dGl0bGU9XFxcIkFkZCBGcmllbmRcXFwiXFxuXHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25BZGRGcmllbmRcXFwiXFxuXFxuXHQ+PGkgY2xhc3M9XFxcImZhIGZhLXVzZXItcGx1c1xcXCI+PC9pPjwvYnV0dG9uPlx0XFxuPC9kaXY+XFxuPHVsIGNsYXNzPVxcXCJ3My11bCB3My1ib3JkZXIgdzMtd2hpdGVcXFwiIFxcblx0Ym4tZWFjaD1cXFwiZnJpZW5kc1xcXCI+XFxuXHQ8bGkgY2xhc3M9XFxcInczLWJhclxcXCI+XFxuPCEtLSBcdFx0PHNwYW4gY2xhc3M9XFxcInczLWJ1dHRvbiB3My1yaWdodCBkZWxldGVcXFwiIHRpdGxlPVxcXCJEZWxldGVcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS10aW1lc1xcXCI+PC9pPjwvc3Bhbj5cXG4gLS0+XFxuXHRcdDxkaXYgY2xhc3M9XFxcInczLWJhci1pdGVtXFxcIiBibi10ZXh0PVxcXCIkaVxcXCIgPjwvZGl2Plxcblx0PC9saT5cXG48L3VsPlx0XCIsXG5cblx0cHJvcHM6IHtcblx0XHQkcGFnZXI6IG51bGxcblx0fSxcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIHVzZXJzKSB7XG5cblx0XHRjb25zdCB7JHBhZ2VyfSA9IHRoaXMucHJvcHNcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0ZnJpZW5kczogW11cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25BZGRGcmllbmQ6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uQWRkRnJpZW5kJylcblx0XHRcdFx0XHQkcGFnZXIucHVzaFBhZ2UoJ2FkZEZyaWVuZCcsIHtcblx0XHRcdFx0XHRcdHRpdGxlOiAnQWRkIEZyaWVuZCdcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIG9uRGVsZXRlOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0Ly8gXHR2YXIgbm90aWZJZCA9ICQodGhpcykuY2xvc2VzdCgnbGknKS5kYXRhKCdub3RpZklkJylcblx0XHRcdFx0Ly8gXHRjb25zb2xlLmxvZygnb25EZWxldGUnLCBub3RpZklkKVxuXHRcdFx0XHQvLyBcdHVzZXJzLnJlbW92ZU5vdGlmKG5vdGlmSWQpXG5cdFx0XHRcdC8vIH1cblx0XHRcdH1cblx0XHR9KVx0XG5cblx0XHRmdW5jdGlvbiB1cGRhdGVGcmllbmRzKCkge1xuXHRcdFx0dXNlcnMuZ2V0RnJpZW5kcygpLnRoZW4oKGZyaWVuZHMpID0+IHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ2ZyaWVuZHMnLCBmcmllbmRzKVxuXHRcdFx0XHRjdHJsLnNldERhdGEoe2ZyaWVuZHN9KVxuXHRcdFx0fSlcdFx0XHRcdFxuXHRcdH1cblxuXG5cdFx0dXBkYXRlRnJpZW5kcygpXG5cblx0fVxufSk7XG5cblxuXG5cbiJdfQ==
