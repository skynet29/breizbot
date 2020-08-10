$$.control.registerControl('rootPage', {

	template: { gulp_inject: './main.html' },

	deps: ['breizbot.users', 'breizbot.songs'],

	init: function (elt, users, songs) {

		const waitDlg = $$.ui.waitDialog('Generating...')

		const ctrl = $$.viewController(elt, {
			data: {
			},
			events: {
				onChangePwd: async function () {
					const newPwd = await $$.ui.showPrompt({ title: 'Change Password', label: 'New Password:' })
					console.log('newPwd', newPwd)
					if (newPwd != null) {
						try {
							await users.changePwd(newPwd)
							$$.ui.showAlert({ title: 'Change Password', content: 'Password has been changed' })
						}
						catch (e) {
							$$.ui.showAlert({ title: 'Error', content: e.responseText })
						}
					}
				},
				onGenerateMusicDb: async function() {
					waitDlg.show()
					await songs.generateDb()
					waitDlg.hide()
				}
			}
		})

	}


});




