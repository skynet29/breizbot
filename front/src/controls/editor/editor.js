$$.control.registerControl('breizbot.htmleditor', {

	template: { gulp_inject: './editor.html' },

	deps: ['breizbot.pager', 'breizbot.files'],

	init: function (elt, pager, files) {

		const colorMap = {
			black: '#000000',
			red: '#f44336',
			green: '#4CAF50',
			blue: '#2196F3',
			yellow: '#ffeb3b',
			cyan: '#00bcd4',
			pink: '#e91e63'

		}

		const fontSizes = '8,10,12,14,18,24,36'
		const fontNames = ["Arial", "Courier New", "Times New Roman"]


		function getFontSizeItems() {
			const ret = {}
			fontSizes.split(',').forEach((i, idx) => {
				ret[idx + 1] = { name: `${i} pt` }
			})
			return ret
		}

		function getFontNameItems() {
			const ret = {}
			fontNames.forEach((i) => {
				ret[i] = { name: i }
			})
			return ret
		}

		function getColorItems() {
			const ret = {}
			Object.keys(colorMap).forEach((i) => {
				ret[i] = {
					name: i.charAt(0).toUpperCase() + i.slice(1),
					icon: `fas fa-square-full w3-text-${i}`
				}
			})
			return ret

		}

		const fontSizeItems = getFontSizeItems()
		const defaultFontSize = '3'
		const fontNameItems = getFontNameItems()
		const defaultFontName = 'Arial'
		const colorItems = getColorItems()
		const defaultColor = colorMap['black']

		const ctrl = $$.viewController(elt, {
			data: {
				html: elt.val(),
				fontSize: defaultFontSize,
				fontName: defaultFontName,
				getFontSize: function () {
					const fontSizeItem = fontSizeItems[this.fontSize]

					return `${fontSizeItem.name}&nbsp;<i class="fas fa-caret-down"></i>`
				},
				getFontName: function () {
					return `${this.fontName}&nbsp;<i class="fas fa-caret-down"></i>`
				},
				fontSizeItems,
				fontNameItems,
				colorItems,
				color: defaultColor
			},
			events: {
				onFontNameChange: function (ev, data) {
					//console.log('onFontNameChange', data)
					ctrl.setData({ fontName: data.cmd })
					document.execCommand('fontName', false, data.cmd)
				},
				onFontSizeChange: function (ev, data) {
					//console.log('onFontSizeChange', data)
					ctrl.setData({ fontSize: data.cmd })
					document.execCommand('fontSize', false, data.cmd)
				},
				onInsertImage: function () {
					const selObj = window.getSelection()
					//console.log('selObj', selObj)

					if (!isEditable(selObj.anchorNode)) {
						$$.ui.showAlert({ title: 'Error', content: 'Please select a text before' })
						return
					}

					const range = selObj.getRangeAt(0)

					pager.pushPage('breizbot.files', {
						title: 'Insert Image',
						props: {
							filterExtension: 'jpg,jpeg,png,gif'
						},
						events: {
							fileclick: function (ev, data) {
								pager.popPage(data)
							}
						},
						onReturn: async function (data) {
							console.log('onReturn', data)
							const { fileName, rootDir } = data
							const url = files.fileUrl(rootDir + fileName)
							//console.log('url', url)
							const dataUrl = await $$.util.imageUrlToDataUrl(url)
							const img = document.createElement('img')
							img.src = dataUrl
							range.insertNode(img)

						}
					})

				},
				onCreateLink: async function () {
					const selObj = window.getSelection()

					if (!isEditable(selObj.anchorNode)) {
						$$.ui.showAlert({ title: 'Error', content: 'Please select a text before' })
						return
					}
					const range = selObj.getRangeAt(0)

					const href = await $$.ui.showPrompt({
						title: 'Insert Link',
						label: 'Link Target',
						attrs: { type: 'url' }
					})
					console.log('href', href)
					if (href != null) {
						selObj.removeAllRanges()
						selObj.addRange(range)

						document.execCommand('createLink', false, href)
					}

				},
				onScrollClick: function () {
					ctrl.scope.editor.focus()
				},
				onCommand: function (ev, data) {
					//console.log('onCommand', data)

					let cmd
					let cmdArg

					if (data) {
						cmd = $(this).data('cmd')
						if (cmd != undefined) {
							cmdArg = data.cmd
						}
						else {
							cmd = data.cmd
						}
					}
					else {
						cmd = $(this).data('cmd')
						cmdArg = $(this).data('cmdArg')

					}
					//console.log('onCommand', cmd, cmdArg)

					document.execCommand(cmd, false, cmdArg)

				},
				onColorMenuChange: function (ev, data) {
					console.log('onColorMenuChange', data)
					const color = colorMap[data.cmd]
					ctrl.setData({ color })
					document.execCommand('foreColor', false, color)
				}

			}

		})

		$(document).on('selectionchange', () => {
			//console.log('selectionchange')
			const selObj = window.getSelection()
			//console.log('selObj', selObj)

			if (!isEditable(selObj.anchorNode)) {
				return
			}

			const fontNode = $(selObj.anchorNode).closest('font')
			//console.log('fontNode', fontNode)
			if (fontNode.length == 1) {
				const fontSize = fontNode.attr('size') || defaultFontSize
				const fontName = fontNode.attr('face') || defaultFontName
				const color = fontNode.attr('color') || defaultColor
				//console.log('fontSize', fontSize, 'fontName', fontName, 'color', color)
				ctrl.setData({ fontSize, fontName, color })
			}
			else {
				ctrl.setData({
					fontSize: defaultFontSize,
					fontName: defaultFontName,
					color: defaultColor
				})
			}
		})

		function isEditable(node) {

			const editable = ctrl.scope.editor.get(0)

			while (node && node != document.documentElement) {
				if (node == editable) {
					return true
				}
				node = node.parentNode;
			}
			return false
		}

		this.html = function (htmlString) {
			if (htmlString == undefined) {
				return ctrl.scope.editor.html()
			}

			ctrl.scope.editor.html(htmlString)
		}

		this.load = function (url) {
			return ctrl.scope.editor.load(url)
		}

		this.getValue = function () {
			return ctrl.scope.editor.html()
		}

		this.setValue = function (value) {
			//console.log('brainjs.htmleditor:setValue', value)
			ctrl.scope.editor.html(value)
		}

		this.focus = function () {
			ctrl.scope.editor.get(0).focus()
		}

		this.insertImage = function() {
			const selObj = window.getSelection()
			//console.log('selObj', selObj)

			if (!isEditable(selObj.anchorNode)) {
				$$.ui.showAlert({ title: 'Error', content: 'Please select a text before' })
				return
			}

			const range = selObj.getRangeAt(0)

			pager.pushPage('breizbot.files', {
				title: 'Insert Image',
				props: {
					filterExtension: 'jpg,jpeg,png,gif'
				},
				events: {
					fileclick: function (ev, data) {
						pager.popPage(data)
					}
				},
				onReturn: async function (data) {
					console.log('onReturn', data)
					const { fileName, rootDir } = data
					const url = files.fileUrl(rootDir + fileName)
					//console.log('url', url)
					const dataUrl = await $$.util.imageUrlToDataUrl(url)
					const img = document.createElement('img')
					img.src = dataUrl
					range.insertNode(img)

				}
			})


		}

	},
	$iface: `
		html(htmlString): string;load(url)
	`

});
