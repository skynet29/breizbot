//@ts-check
$$.control.registerControl('breizbot.users', {

	deps: ['breizbot.users', 'breizbot.notifs', 'breizbot.pager'],

	template: { gulp_inject: './users.html' },

	/**
	 * 
	 * @param {Breizbot.Services.User.AdminInterface} users 
	 * @param {Breizbot.Services.Notif.Interface} notifsSrv 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 */
	init: function (elt, users, notifsSrv, pager) {

		const ctrl = $$.viewController(elt, {
			data: {
				data: [],
				text1: function (scope) {
					return new Date(scope.$i.createDate).toLocaleDateString('fr-FR')
				},
				text2: function (scope) {
					return new Date(scope.$i.lastLoginDate).toLocaleDateString('fr-FR')
				},
				text3: function (scope) {
					return new Date(scope.$i.lastLoginDate).toLocaleTimeString('fr-FR')
				},
				show1: function (scope) {
					return scope.$i.createDate != undefined
				},
				show2: function (scope) {
					return scope.$i.lastLoginDate != undefined && scope.$i.lastLoginDate != 0
				}
			},
			events: {
				onAddUser: function (ev) {
					pager.pushPage('breizbot.addUser', {
						title: 'Add User',
						onReturn: async function (data) {
							//console.log('onReturn', data)
							await users.add(data)
							getUsers()
						}
					})
				},
				onDelete: function (ev) {
					const idx = $(this).closest('tr').index()
					const { username } = ctrl.model.data[idx]
					$$.ui.showConfirm({ title: 'Delete User', content: 'Are you sure ?' }, async function () {
						await users.remove(username)
						getUsers()
					})
				},
				onNotif: async function (ev) {
					const idx = $(this).closest('tr').index()
					const { username } = ctrl.model.data[idx]
					const text = await $$.ui.showPrompt({ title: 'Send Notification', label: 'Message' })
					if (text != null) {
						notifsSrv.sendNotif(username, { text })
					}
				},
				onUpdate: function () {
					getUsers()
				},
				onResetPwd: function() {
					const idx = $(this).closest('tr').index()
					const { username } = ctrl.model.data[idx]
					$$.ui.showConfirm({ title: 'Reset Password', content: 'Are you sure ?' }, async function () {
						await users.resetPwd(username)
					})				
				}

			}
		})

		async function getUsers() {
			const data = await users.list()
			console.log('getUsers', data)
			ctrl.setData({ data })

		}

		getUsers()



	}

});
