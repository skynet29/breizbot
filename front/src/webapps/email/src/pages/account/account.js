//@ts-check
$$.control.registerControl('accountPage', {

	template: { gulp_inject: './account.html' },

	deps: ['app.mails', 'breizbot.pager'],

	props: {
		data: null
	},

	/**
	 * 
	 * @param {AppEmail.Interface} srvMail 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 */
	init: function (elt, srvMail, pager) {

		const { data } = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				data,
				isEdit: data != null
			},
			events: {
				onSubmit: async function (ev) {
					ev.preventDefault()
					const formData = $(this).getFormData()
					console.log('formData', formData)
					if (data == null) {
						await srvMail.createMailAccount(formData)
					}
					else {
						await srvMail.updateMailAccount(formData)
					}
					pager.popPage()

				}
			}
		})

		this.getButtons = function () {
			return {
				apply: {
					title: 'Apply',
					icon: 'fa fa-check',
					onClick: function () {
						ctrl.scope.submit.click()
					}
				}
			}
		}

	}

});




