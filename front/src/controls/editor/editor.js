//@ts-check
$$.control.registerControl('breizbot.htmleditor', {

	template: { gulp_inject: './editor.html' },

	deps: ['breizbot.pager', 'breizbot.files'],

	props: {
		useDataUrlForImg: false
	},

	/**
	 * 
	 * @param {*} elt 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 * @param {Breizbot.Services.Files.Interface} files 
	 */
	init: function (elt, pager, files) {

		//@ts-ignore
		const { useDataUrlForImg } = this.props
		console.log('useDataUrlForImg', useDataUrlForImg)

		const colorMap = {
			black: '#000000',
			red: '#f44336',
			green: '#4CAF50',
			blue: '#2196F3',
			yellow: '#ffeb3b',
			cyan: '#00bcd4',
			pink: '#e91e63'

		}

		const fontSizes = '8,10,12,14,18,24,36'.split(',')
		const fontNames = ["Arial", "Courier New", "Times New Roman"]

		function getHeadingItems() {
			const ret = {
				p: { name: 'Normal' }
			}
			for (let i = 1; i <= 6; i++) {
				ret['h' + i] = { name: `<h${i}>Heading ${i}</h${i}>`, isHtmlName: true }
			}
			return ret
		}

		function getFontSizeItems() {
			const ret = {}
			fontSizes.forEach((i, idx) => {
				ret[idx + 1] = { name: `<font size="${idx + 1}">${i} pt</font>`, isHtmlName: true }
			})
			return ret
		}

		function getFontNameItems() {
			const ret = {}
			fontNames.forEach((i) => {
				ret[i] = { name: `<font face="${i}">${i}</font>`, isHtmlName: true }
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
					return `${fontSizes[this.fontSize - 1]} pt&nbsp;<i class="fas fa-caret-down"></i>`
				},
				getFontName: function () {
					return `${this.fontName}&nbsp;<i class="fas fa-caret-down"></i>`
				},
				fontSizeItems,
				fontNameItems,
				colorItems,
				color: defaultColor,
				headingItems: getHeadingItems()
			},
			events: {
				onInsertImage: function (ev) {
					insertImage()
				},
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
					//console.log('href', href)
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

		elt.find('button.w3-button').attr('type', 'button')

		$(document).on('selectionchange', () => {
			//console.log('selectionchange')
			const selObj = window.getSelection()
			//console.log('selObj', selObj)

			if (!isEditable(selObj.anchorNode)) {
				return
			}

			const fontSizeNode = $(selObj.anchorNode).closest('font[size]')
			//console.log('fontNode', fontNode)
			if (fontSizeNode.length == 1) {
				const fontSize = fontSizeNode.attr('size') || defaultFontSize
				const fontName = fontSizeNode.attr('face') || defaultFontName
				//console.log('fontSize', fontSize, 'fontName', fontName, 'color', color)
				ctrl.setData({ fontSize, fontName })
			}
			else {
				ctrl.setData({
					fontSize: defaultFontSize,
					fontName: defaultFontName,
				})
			}
			const fontColorNode = $(selObj.anchorNode).closest('font[color]')
			//console.log('fontNode', fontNode)
			if (fontColorNode.length == 1) {
				const color = fontColorNode.attr('color') || defaultColor
				//console.log('fontSize', fontSize, 'fontName', fontName, 'color', color)
				ctrl.setData({ color })
			}
			else {
				ctrl.setData({
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

		function insertImage() {
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
					let url = files.fileUrl(rootDir + fileName)
					//console.log('url', url)
					if (useDataUrlForImg) {
						url = await $$.url.imageUrlToDataUrl(url)
					}
					const img = document.createElement('img')
					img.src = url
					range.insertNode(img)

				}
			})


		}

	},
	$iface: `
		html(htmlString): string;load(url)
	`

});
