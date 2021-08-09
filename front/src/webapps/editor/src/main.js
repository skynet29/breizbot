//@ts-check
$$.control.registerControl('rootPage', {

	template: { gulp_inject: './main.html' },

	deps: ['breizbot.files', 'breizbot.pager'],

	/**
	 * 
	 * @param {Breizbot.Files.Interface} files 
	 * @param {Breizbot.Pager.Interface} pager 
	 */
	init: function (elt, files, pager) {

		const ctrl = $$.viewController(elt, {
			data: {
				fileName: '',
				rootDir: ''
			},
			events: {
				onNewFile: function (ev) {
					//console.log('onNewFile')
					ctrl.scope.editor.html('')
					ctrl.setData({ fileName: '' })
				},
				onSaveFile: async function (ev) {
					//console.log('onSaveFile')
					if (ctrl.model.fileName != '') {
						saveFile()
						return
					}
					let fileName = await $$.ui.showPrompt({ title: 'Save File', label: "FileName:" })
					//console.log('fileName', fileName)
					if (fileName != null) {
						fileName += '.hdoc'
						ctrl.setData({ fileName, rootDir: '/apps/editor' })
						saveFile()
					}
				},
				onOpenFile: function (ev) {
					//console.log('onOpenFile')
					pager.pushPage('breizbot.files', {
						title: 'Open File',
						props: {
							filterExtension: 'hdoc'
						},
						events: {
							fileclick: function (ev, data) {
								pager.popPage(data)
							}
						},
						onReturn: function (data) {
							//console.log('onReturn', data)
							const { fileName, rootDir } = data
							const url = files.fileUrl(rootDir + fileName)

							ctrl.setData({ fileName, rootDir })
							ctrl.scope.editor.load(url)
						}
					})
				}
			}
		})

		async function saveFile() {
			//console.log('saveFile')
			const { fileName, rootDir } = ctrl.model
			const htmlString = ctrl.scope.editor.html()
			const blob = new Blob([htmlString], { type: 'text/html' })
			await files.saveFile(blob, fileName, rootDir)
		}

	}
});




