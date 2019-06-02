$$.control.registerControl('viewerPage', {

	deps: ['breizbot.files'],

	template: {gulp_inject: './viewer.html'},

	props: {
		$pager: null,
		fullName: ''
	},

	buttons: [
		{name: 'del', icon: 'fa fa-trash'}
	],
	
	init: function(elt, files) {

		const {$pager, fullName} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				fullName
			}
		})


		this.onAction = function(action) {
			console.log('onAction', action)
			if (action == 'del') {
				ctrl.scope.viewer.remove(function(){
					$pager.popPage('reload')
				})
			}

		}

	}
});




