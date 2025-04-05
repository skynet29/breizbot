//@ts-check
$$.control.registerControl('rootPage', {

	template: { gulp_inject: './main.html' },

	deps: ['breizbot.files', 'breizbot.pager', 'breizbot.params'],

	/**
	 * 
	 * @param {Breizbot.Services.Files.Interface} files 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 */
	init: function (elt, files, pager, params) {

		console.log('params', params)

		const addLinkDlg = $$.formDialogController({
			title: 'Add Anchor Link',
			template: {gulp_inject: './addLink.html'},
			data: {
				items: []
			},
			events: {
				onRemoveAnchor: function() {
					const {value} = addLinkDlg.getFormData()
					console.log('onRemoveAnchor', value)
					editorElt.find(`[id=${value}]`).removeAttr('id')
					addLinkDlg.setData({items: getAnchorList()})
					const elt = editorElt.find(`a[href="#${value}"]`)
					const text = elt.text()
					elt.replaceWith(`<div>${text}</div>`)

				}
			}
		})

		const ctrl = $$.viewController(elt, {
			data: {
				fileName: ''
			},
			events: {
				onAddAnchorLink: async function() {
					console.log('onAddAnchor')
					const anchorList = getAnchorList()
					console.log('anchorList', anchorList)
					if (anchorList.length == 0) {
						$$.ui.showAlert({content: 'No anchor available !'})
						return
					}
					addLinkDlg.setData({items: anchorList})
					editor.addLink(async () => {
						const ret = await addLinkDlg.show()
						console.log('ret', ret)
						if (ret != null) {
							return '#' + ret.value
						}
						return ret
					})
					
				},
				onAddAnchor: async function(ev) {
					console.log('onAddAnchor')
					
					//console.log('selObj', selObj)
					const selObj = window.getSelection()
		
					if (!editor.isEditable()) {
						$$.ui.showAlert({ title: 'Error', content: 'Please select a text before' })
						return
					}

					const parent = selObj.anchorNode.parentElement
					if ($(parent).hasClass('editor')) {
						$$.ui.showAlert({ title: 'Error', content: 'Acnhor text must be a title' })
						return
					}

					const anchorName = await $$.ui.showPrompt({title: 'Add Anchor', label: 'Anchor name:'})
					if (anchorName != null) {
						console.log('anchorName', anchorName)
						parent.id = 'tag-' + anchorName			
					}
				},
				onNewFile: function (ev) {
					//console.log('onNewFile')
					editor.html('')
					ctrl.setData({ fileName: '' })
				},
				onSaveFile: async function (ev) {
					//console.log('onSaveFile')
					let { fileName, rootDir } = ctrl.model

					if (fileName != '') {
						await saveFile(fileName, {checkExists: false, destPath: rootDir})
						return
					}
					fileName = await $$.ui.showPrompt({ title: 'Save File', label: "FileName:" })
					//console.log('fileName', fileName)
					if (fileName != null) {
						fileName += '.hdoc'						
						if (await saveFile(fileName, {checkExists: true})) {
							ctrl.setData({ fileName })
						}
					}
				},
				onOpenFile: function (ev) {
					//console.log('onOpenFile')
					files.openFile('Open File', {filterExtension: 'hdoc'}, loadFileName)

				}
			}
		})

		/**@type {JQuery<HTMLElement>} */
		const editorElt = ctrl.scope.editor

		/**@type {Breizbot.Controls.Editor.Interface} */
		const editor = editorElt.iface()

		function getAnchorList() {
			const ret = []
			editorElt.find('[id^=tag-]').each(function() {
				const id = $(this).attr(('id'))
				ret.push({
					label: id.substr(4),
					value: id
				})
			})
			return ret
		}

		if (params.fileName) {
			loadFileName(params)
		}

		/**
		 * 
		 * @param {{fileName: string, rootDir: string}} data 
		 */
		function loadFileName(data) {
			const { fileName, rootDir } = data
			const url = files.fileUrl(rootDir + fileName)

			ctrl.setData({ fileName, rootDir })
			editor.load(url, () => {
				console.log('file loaded')
			})
		}

		/**
		 * 
		 * @param {string} fileName 
		 * @param {{checkExists?: boolean, destPath?: string}} options 
		 */
		async function saveFile(fileName, options) {
			//console.log('saveFile')
			const htmlString = editor.html()
			const blob = new Blob([htmlString], { type: 'text/html' })
			return files.saveFile(blob, fileName, options)
		}

	}
});




