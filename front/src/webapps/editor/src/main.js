//@ts-check
$$.control.registerControl('rootPage', {

	template: { gulp_inject: './main.html' },

	deps: ['breizbot.files', 'breizbot.pager'],

	/**
	 * 
	 * @param {Breizbot.Services.Files.Interface} files 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 */
	init: function (elt, files, pager) {

		const ctrl = $$.viewController(elt, {
			data: {
				fileName: ''
			},
			events: {
				onNewFile: function (ev) {
					//console.log('onNewFile')
					ctrl.scope.editor.html('')
					ctrl.setData({ fileName: '' })
				},
				onSaveFile: async function (ev) {
					//console.log('onSaveFile')
					let { fileName } = ctrl.model

					if (fileName != '') {
						await saveFile(fileName, false)
						return
					}
					fileName = await $$.ui.showPrompt({ title: 'Save File', label: "FileName:" })
					//console.log('fileName', fileName)
					if (fileName != null) {
						fileName += '.hdoc'						
						if (await saveFile(fileName, true)) {
							ctrl.setData({ fileName })
						}
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

		/**
		 * 
		 * @param {string} fileName 
		 * @param {boolean} checkExists 
		 */
		async function saveFile(fileName, checkExists) {
			//console.log('saveFile')
			const htmlString = ctrl.scope.editor.html()
			const blob = new Blob([htmlString], { type: 'text/html' })
			return files.saveFile(blob, fileName, checkExists)
		}

	}
});




