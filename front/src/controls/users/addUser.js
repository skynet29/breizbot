$$.control.registerControl('breizbot.addUser', {

	template: {gulp_inject: './addUser.html'},

	props: {
		$pager: null
	},


	init: function(elt) {

		const {$pager} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
			},
			events: {
				onSubmit: function(ev) {
					ev.preventDefault()
					$pager.popPage($(this).getFormData())
				}
			}
		})

		this.getButtons = function() {
			return {
				create: {
					title: 'Create',
					icon: 'fa fa-check',
					onClick: function() {
						ctrl.scope.submit.click()
					}
				}
			}
		
		}

	}

});
