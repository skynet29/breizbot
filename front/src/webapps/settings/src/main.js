$$.control.registerControl('rootPage', {

	template: { gulp_inject: './main.html' },

	deps: ['breizbot.users', 'breizbot.songs', 'breizbot.params'],

	props: {
		birthdayScheduleTime: '1000'
	},

	init: function (elt, users, songs, params) {

		const settings = $.extend(this.props, params)
		//console.log('settings', settings)

		const waitDlg = $$.ui.waitDialog('Generating...')

		const ctrl = $$.viewController(elt, {
			data: {
				settings
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
				},
				onApply: async function(ev) {
					ev.preventDefault()
					const data = $(this).getFormData()
					console.log('data', data)
					await users.setUserSettings(data)
				}
			}
		})

	}


});




