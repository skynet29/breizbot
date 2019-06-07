$$.control.registerControl('viewerPage', {

	deps: ['breizbot.files'],

	template: {gulp_inject: './viewer.html'},

	props: {
		$pager: null,
		fullName: '',
	},

	buttons: [
		{name: 'del', icon: 'fa fa-trash'}
	],
	
	init: function(elt, files) {

		const {$pager, fullName} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				type: $$.util.getFileType(fullName),
				url: files.fileUrl(fullName)
			}
		})


		this.onAction = function(action) {
			console.log('onAction', action)
			if (action == 'del') {
				ctrl.scope.viewer.remove(fullName, function(){
					$pager.popPage('reload')
				})
			}

		}

	}
});




