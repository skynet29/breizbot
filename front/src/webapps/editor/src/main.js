$$.control.registerControl('rootPage', {

	template: {gulp_inject: './main.html'},

	deps: ['breizbot.files'],

	props: {
		$pager: null
	},

	init: function(elt, files) {

		const {$pager} = this.props
		let range

		const ctrl = $$.viewController(elt, {
			data: {
				fileName: '',
				rootDir: ''
			},
			events: {
				onNewFile: function(ev) {
					console.log('onNewFile')
					ctrl.scope.editor.html('')
					ctrl.setData({fileName: ''})
				},				
				onSaveFile: function(ev) {
					console.log('onSaveFile')
					if (ctrl.model.fileName != '') {
						saveFile()
						return
					}
					$$.ui.showPrompt({title: 'Save File', content: "FileName:"}, function(fileName) {
						fileName += '.doc'
						ctrl.setData({fileName, rootDir: '/apps/editor'})
						saveFile()
					})
				},
				onOpenFile: function(ev) {
					console.log('onOpenFile')
					$pager.pushPage('breizbot.files', {
						title: 'Open File',
						props: {
							filterExtension: '.doc'
						},
						onReturn: function(data) {
							console.log('onReturn', data)
							const {fileName, rootDir, cmd} = data
							const url = files.fileUrl(rootDir + fileName)

							ctrl.setData({fileName, rootDir})
							ctrl.scope.editor.load(url)
						}						
					})
				},
				onInsertImage: function(ev) {
					console.log('onInsertImage')

					$pager.pushPage('breizbot.files', {
						title: 'Insert Image',
						props: {
							imageOnly: true,
							showThumbnail: true
						},
						onReturn: function(data) {
							console.log('onReturn', data)
							const {fileName, rootDir, cmd} = data
							const url = files.fileUrl(rootDir + fileName)

							if (cmd == 'openFile') {
								ctrl.setData({fileName, rootDir})

								ctrl.scope.editor.load(url)

							}
							if (cmd == 'insertImage') {

								ctrl.scope.editor.insertImage(url)
							}
						}						
					})					
				}
			}
		})

		function saveFile() {
			const {fileName, rootDir} = ctrl.model
			const htmlString = ctrl.scope.editor.html()
			const blob = new Blob([htmlString], {type: 'text/html'})
			files.uploadFile(blob, fileName, rootDir).then(function(resp) {
				console.log('resp', resp)
			})	
			.catch(function(resp) {
				$$.ui.showAlert({
					title: 'Error',
					content: resp.responseText
				})
			})	
		}

		this.onReturn = function(data) {
			console.log('onReturn', data)
			if (data == undefined) {
				return
			}
			const {fileName, rootDir, cmd} = data
			const url = files.fileUrl(rootDir + fileName)

			if (cmd == 'openFile') {
				ctrl.setData({fileName, rootDir})

				ctrl.scope.editor.load(url)

			}
			if (cmd == 'insertImage') {

				ctrl.scope.editor.insertImage(url)
			}
		}


	}
});




