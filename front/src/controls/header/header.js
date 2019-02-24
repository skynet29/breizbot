$$.control.registerControl('breizbot.header', {

	props: {
		userName: 'Unknown',
		showHome: true,
		title: ''
	},

	template: {gulp_inject: './header.html'},

	init: function(elt) {

		$$.viewController(elt, {
			data: {
				items: {
					pwd: {name: 'Change password', icon: 'fa-lock'},
					apps: {name: 'Applications', icon: 'fa-th'},
					sep: '------',
					logout: {name: 'Logout', icon: 'fa-power-off'}
				},
				userName: this.props.userName,
				showHome: this.props.showHome,
				title: this.props.title
			},
			events: {
				onContextMenu: function(ev, data) {
					console.log('onContextMenu', data)
					if (data.cmd == 'logout') {
						location.href = '/logout'
					}
					if (data.cmd == 'apps') {
						location.href = '/apps/store'
					}
				}
			}
		})
	}
});
