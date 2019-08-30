$$.control.registerControl('filesPage', {

	deps: ['breizbot.pager'],

	props: {
		userName: '',
	},

	template: {gulp_inject: './files.html'},

	buttons: [
		{name: 'reload', icon: 'fa fa-sync-alt'}
	],

	init: function(elt, pager) {

		const {userName} = this.props

		const ctrl = $$.viewController(elt, {
			
			data: {
				rootDir: '/',
				files: [],
				userName
			},
			events: {
				onFileClick: function(ev, info) {
					//console.log('onFileClick', info)

					const fullName = ctrl.model.rootDir + info.fileName

					const type = $$.util.getFileType(info.fileName)
					if (type != undefined) {
						pager.pushPage('viewerPage', {
							title: info.name,
							props: {
								fullName,
								userName
							}
						})
					}					
				},


			}

		})

		this.onAction = function(cmd) {
			if (cmd == 'reload') {
				ctrl.scope.files.update()
			}
		}

	}


});
