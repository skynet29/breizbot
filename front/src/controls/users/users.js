$$.control.registerControl('breizbot.users', {
	deps: ['breizbot.users'],

	template: {gulp_inject: './users.html'},

	props: {
		$pager: null
	},

	init: function(elt, users) {

		const {$pager} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				columns: [
					{name: 'username', label: 'User Name'},
					{name: 'pseudo', label: 'Pseudo'},
					{name: 'location', label: 'Location'},
					{name: 'email', label: 'Email'},
					{label: 'Actions', buttons: [
						{cmd: 'delete', title: 'Delete', icon: 'fa fa-trash'},
						{cmd: 'notif', title: 'Send Notification', icon: 'fa fa-bell'},
					]}
				],
				data: []
			},
			events: {
				onAddUser: function(ev) {
					$pager.pushPage('breizbot.addUser', {
						title: 'Add User',
						buttons: [{label: 'Create', name: 'create'}]
					})
				},
				onTableCmd: function(ev, evdata) {
					const {data, cmd} = evdata
					if (cmd == 'delete') {
						$$.ui.showConfirm({title: 'Delete User', content: 'Are you sure ?'}, function() {
							users.remove(data.username).then(getUsers)
						})
					}
					if (cmd == 'notif') {
						$$.ui.showPrompt({title: 'Send Notification', label: 'Message'}, function(text) {
							users.sendNotif(data.username, text)
						})
					}
				}
			}
		})

		function getUsers() {
			users.list().then((data) => {
				console.log('data', data)
				ctrl.setData({data})
			})			
		}

		getUsers()

		this.onReturn = function(data) {
			//console.log('onReturn', data)
			users.add(data).then(getUsers)
		}

	},

	$iface: `
		onReturn(formData)
	`
});
