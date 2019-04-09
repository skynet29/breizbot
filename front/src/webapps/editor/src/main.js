$$.control.registerControl('rootPage', {

	template: {gulp_inject: './main.html'},

	deps: ['breizbot.files'],

	props: {
		$pager: null
	},

	init: function(elt, files) {

		const {$pager} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
			},
			events: {
				onNewFile: function(ev) {
					console.log('onNewFile')
					ctrl.scope.editor.html('')
				},				
				onSaveFile: function(ev) {
					console.log('onSaveFile')
					$$.ui.showPrompt({title: 'Save File', content: "FileName:"}, function(fileName) {
						const htmlString = ctrl.scope.editor.html()
						const blob = new Blob([htmlString], {type: 'text/html'})
						files.uploadFile(blob, fileName + '.doc', '/documents').then(function(resp) {
							console.log('resp', resp)
						})	
						.catch(function(resp) {
							$$.ui.showAlert({
								title: 'Error',
								content: resp.responseText
							})
						})			
					})
				},
				onOpenFile: function(ev) {
					console.log('onOpenFile')
					$pager.pushPage('openFile', {
						title: 'Open File'
					})
				}
			}
		})

		this.onReturn = function(fileName) {
			console.log('onReturn', fileName)
			ctrl.scope.editor.load(files.fileUrl(fileName))
		}


	}
});




