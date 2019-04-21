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
				data: []
			},
			events: {
				onAddUser: function(ev) {
					$pager.pushPage('breizbot.addUser', {
						title: 'Add User',
						buttons: [{label: 'Create', name: 'create'}]
					})
				},
				onDelete: function(ev) {
					const data = $(this).closest('tr').data('item')
					$$.ui.showConfirm({title: 'Delete User', content: 'Are you sure ?'}, function() {
						users.remove(data.username).then(getUsers)
					})
				},
				onNotif: function(ev) {
					const data = $(this).closest('tr').data('item')
					console.log('onNotif', data)
					$$.ui.showPrompt({title: 'Send Notification', label: 'Message'}, function(text) {
						users.sendNotif(data.username, text)
					})
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
