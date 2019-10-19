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
				data: [],
				text1: function() {
					return new Date(this.$i.createDate).toLocaleDateString('fr-FR')
				},
				text2: function() {
					return new Date(this.$i.lastLoginDate).toLocaleDateString('fr-FR')
				},
				text3: function() {
					return new Date(this.$i.lastLoginDate).toLocaleTimeString('fr-FR')
				},
				show1: function() {
					return this.$i.createDate != undefined
				},
				show2: function() {
					return this.$i.lastLoginDate != undefined && this.$i.lastLoginDate != 0
				}
			},
			events: {
				onAddUser: function(ev) {
					$pager.pushPage('breizbot.addUser', {
						title: 'Add User',
						onReturn: function(data) {
							//console.log('onReturn', data)
							users.add(data).then(getUsers)
						}						
					})
				},
				onDelete: function(ev) {
					const idx = $(this).closest('tr').index()
					const {username} = ctrl.model.data[idx]
					$$.ui.showConfirm({title: 'Delete User', content: 'Are you sure ?'}, function() {
						users.remove(username).then(getUsers)
					})
				},
				onNotif: function(ev) {
					const idx = $(this).closest('tr').index()
					const {username} = ctrl.model.data[idx]
					$$.ui.showPrompt({title: 'Send Notification', label: 'Message'}, function(text) {
						users.sendNotif(username, {text})
					})
				},
				onUpdate: function() {
					getUsers()
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
