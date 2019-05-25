$$.control.registerControl('breizbot.addUser', {

	template: {gulp_inject: './addUser.html'},

	props: {
		$pager: null
	},

	buttons: [
		{label: 'Create', name: 'create'}
	],

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

		this.onAction = function(cmd) {
			//console.log('onAction', cmd)
			ctrl.scope.submit.click()
		}

	},

	$iface: `
		onAction(cmd)
	`
});
