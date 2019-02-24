$$.control.registerControl('breizbot.users', {
	deps: ['breizbot.users'],

	template: {gulp_inject: './users.html'},

	init: function(elt, users) {



		const dlgAddUser = $$.formDialogController({
			title: 'Add User',
			template: {gulp_inject: './addUser.html'}
		})

		const ctrl = $$.viewController(elt, {
			data: {
				columns: [
					{name: 'username', label: 'User Name'},
					{name: 'pseudo', label: 'Pseudo'},
					{name: 'location', label: 'Location'},
					{name: 'email', label: 'Email'},
					{label: 'Actions', buttons: [
						{cmd: 'delete', title: 'Delete', icon: 'fa fa-trash'}
					]}
				],
				data: []
			},
			events: {
				onAddUser: function(ev) {
					dlgAddUser.show(function(data) {
						users.add(data).then(getUsers)
					})
				},
				onTableCmd: function(ev, evdata) {
					const {data, cmd} = evdata
					if (cmd == 'delete') {
						$$.ui.showConfirm({title: 'Delete User', content: 'Are you sure ?'}, function() {
							users.remove(data.username).then(getUsers)
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

	}
});
