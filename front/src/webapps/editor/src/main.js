$$.control.registerControl('rootPage', {

	template: {gulp_inject: './main.html'},

	deps: ['breizbot.files', 'breizbot.pager'],

	init: function(elt, files, pager) {

		let range

		const savingDlg = $$.ui.savingDialog()

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
				onSaveFile: async function(ev) {
					console.log('onSaveFile')
					if (ctrl.model.fileName != '') {
						saveFile()
						return
					}
					let fileName = await $$.ui.showPrompt({title: 'Save File', label: "FileName:"})
					console.log('fileName', fileName)
					if (fileName != null) {
						fileName += '.hdoc'
						ctrl.setData({fileName, rootDir: '/apps/editor'})
						saveFile()
					}
				},
				onOpenFile: function(ev) {
					console.log('onOpenFile')
					pager.pushPage('breizbot.files', {
						title: 'Open File',
						props: {
							filterExtension: '.hdoc'
						},
						events: {
							fileclick: function(ev, data) {
								pager.popPage(data)
							}
						},
						onReturn: function(data) {
							console.log('onReturn', data)
							const {fileName, rootDir} = data
							const url = files.fileUrl(rootDir + fileName)

							ctrl.setData({fileName, rootDir})
							ctrl.scope.editor.load(url)
						}						
					})
				},
				onInsertImage: function(ev) {
					console.log('onInsertImage')

					pager.pushPage('breizbot.files', {
						title: 'Insert Image',
						props: {
							imageOnly: true,
							showThumbnail: true
						},
						events: {
							fileclick: function(ev, data) {
								pager.popPage(data)
							}
						},
						onReturn: function(data) {
							console.log('onReturn', data)
							const {fileName, rootDir} = data
							const url = files.fileUrl(rootDir + fileName)
							ctrl.scope.editor.insertImage(url)
						}						
					})					
				}
			}
		})

		async function saveFile() {
			const {fileName, rootDir} = ctrl.model
			const htmlString = ctrl.scope.editor.html()
			const blob = new Blob([htmlString], {type: 'text/html'})
			try {
				savingDlg.show()
				const resp = await files.uploadFile(blob, fileName, rootDir, (value) => {
					savingDlg.setPercentage(value)
				})
				console.log('resp', resp)
				await $$.util.wait(1000)
				savingDlg.hide()
			}
			catch(resp) {
				savingDlg.hide()
				$$.ui.showAlert({
					title: 'Error',
					content: resp.responseText
				})
			}
		}

	}
});




