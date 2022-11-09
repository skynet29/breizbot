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

		const speechRecoAvailable = ('webkitSpeechRecognition' in window)
		const isMobilDevice = /Android/i.test(navigator.userAgent)
		console.log('isMobilDevice', isMobilDevice)
		let ignoreOnEnd = false
		let recognition = null
		let finalSpan = null
		let interimSpan = null
		let finalTranscript = ''
		/**@type {Range} */
		let range = null

		const two_line = /\n\n/g
		const one_line = /\n/g
		function linebreak(s) {
			return s.replace(two_line, '<p></p>').replace(one_line, '<br>')
		}

		const first_char = /\S/
		function capitalize(s) {
			return s.replace(first_char, m => m.toUpperCase())
		}

		if (speechRecoAvailable) {
			recognition = new webkitSpeechRecognition();
			recognition.continuous = true
			recognition.interimResults = true
			recognition.lang = 'fr-FR'

			recognition.onstart = function () {
				console.log('onStart')
				ctrl.setData({ recognizing: true })

			}

			recognition.onerror = function (event) {
				console.log('onError', event.error)
			}

			recognition.onend = function () {
				console.log('onEnd')
				if (isMobilDevice && ctrl.model.recognizing) {
					range.collapse()
					startRecognition()
				}
				else {
					ctrl.setData({ recognizing: false })
					range.collapse()
				}
			}

			recognition.onresult = function (event) {
				//console.log('onResult', event.results.length)
				let interimTranscript = ''
				for (let i = event.resultIndex; i < event.results.length; ++i) {
					//console.log('results', event.results[i])
					if (event.results[i].isFinal && event.results[i][0].confidence != 0) {
						finalTranscript += event.results[i][0].transcript
					} else {
						interimTranscript += event.results[i][0].transcript
					}
				}
				//console.log('interimTranscript', interimTranscript)
				//console.log('finalTranscript', finalTranscript)
				finalTranscript = capitalize(finalTranscript)
				finalSpan.innerHTML = linebreak(finalTranscript)
				interimSpan.innerHTML = linebreak(interimTranscript)
			}
		}

		function startRecognition() {
			//console.log('selObj', selObj)

			if (!isEditable()) {
				$$.ui.showAlert({ title: 'Error', content: 'Please select a text before' })
				return
			}

			range = getRange()
			finalSpan = document.createElement('span')
			interimSpan = document.createElement('span')
			interimSpan.className = 'interim'
			range.insertNode(interimSpan)
			range.insertNode(finalSpan)
			finalTranscript = ''
			recognition.start()
			ignoreOnEnd = false
		}

		/**
		 * 
		 * @param {string} text 
		 * @param {string} tagName
		 * @returns {JQuery<HTMLElement>}
		 */
		function div(text, tagName) {
			//console.log('div', tagName, text)
			const elt = ['I', 'B', 'U', 'FONT'].includes(tagName) ? 'span' : 'div'
			return $(`<${elt}>`).text(text)
		}

		let imgUrls = []

		/**
		 * 
		 * @param {Range} range 
		 */
		function convertToTable(range) {
			const selRangeText = getTextNodesBetween(range.commonAncestorContainer, range.startContainer, range.endContainer)
			if (selRangeText.length == 0) {
				$$.ui.showAlert({ title: 'Error', content: 'Please select a text before' })
				return
			}

			range.deleteContents()

			const table = document.createElement('table')
			for (const row of selRangeText) {
				const tr = document.createElement('tr')
				table.appendChild(tr)
				for (const text of row.split(';')) {
					const td = document.createElement('td')
					tr.appendChild(td)
					if (text.startsWith('img(')) {
						const urlId = text.replaceAll(')', '').substr(4)
						const img = document.createElement('img')
						img.src = imgUrls[urlId]
						td.appendChild(img)
					}
					else {
						td.textContent = text
					}
				}
			}
			imgUrls = []
			range.insertNode(table)

		}

		/**
		 * 
		 * @param {Range} range 
		 */
		function convertToList(range) {
			const parentElement = $(range.startContainer.parentElement)

			if (['TD', 'TH'].includes(parentElement.get(0).tagName)) {
				const table = parentElement.closest('table')
				const tr = table.find('tr')
				const data = []
				tr.each(function () {
					const td = $(this).find('td,th')
					const text = []
					td.each(function () {
						$(this).find('img').each(function () {
							const src = $(this).attr('src')
							imgUrls.push(src)
							$(this).replaceWith(`img(${imgUrls.length - 1})`)
						})

						text.push($(this).text())
					})
					data.push(text.join(';'))

				})
				table.remove()
				range.deleteContents()
				for (const text of data.reverse()) {
					const div = document.createElement('div')
					div.innerHTML = text
					range.insertNode(div)
				}
			}
			else {
				$$.ui.showAlert({ title: 'Error', content: 'Please select a cell table' })

			}

		}

		/**
		 * 
		 * @param {Range} range 
		 */
		function addRow(range) {
			const parentElement = $(range.startContainer.parentElement)

			if (['TD', 'TH'].includes(parentElement.get(0).tagName)) {
				const tr = parentElement.closest('tr')
				const nbCols = tr.find('td, th').length
				//console.log('nb col', nbCols)
				const newTr = document.createElement('tr')
				for (let i = 0; i < nbCols; i++) {
					const newTd = document.createElement('td')
					newTr.appendChild(newTd)
				}
				tr.after(newTr)
			}
			else {
				$$.ui.showAlert({ title: 'Error', content: 'Please select a cell table' })

			}
		}

		/**
		 * 
		 * @param {Range} range 
		 */
		 function addColumn(range) {
			//console.log('addColumn')
			const parentElement = $(range.startContainer.parentElement)

			if (['TD', 'TH'].includes(parentElement.get(0).tagName)) {
				const selCol = parentElement.index()
				//console.log('selCol', selCol)
				const table = parentElement.closest('table')
				table.find('tr').each(function() {
					const td = document.createElement('td')
					$(this).find('td,th').eq(selCol).after(td)
				})
			}
			else {
				$$.ui.showAlert({ title: 'Error', content: 'Please select a cell table' })

			}
		}		

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
				headingItems: getHeadingItems(),
				showMicro: false,
				isMicroVisible: function () {
					return this.showMicro && this.speechRecoAvailable
				},
				speechRecoAvailable,
				recognizing: false,
				getMicUrl: function () {
					return this.recognizing ? '/assets/mic-animate.gif' : '/assets/mic.gif'
				}
			},
			events: {
				onToogleMicro: function () {
					ctrl.setData({ showMicro: !ctrl.model.showMicro })
				},
				onInsertTable: function (ev, info) {
					console.log('onInsertTable', info)
					const { cmd } = info
					if (!isEditable()) {
						$$.ui.showAlert({ title: 'Error', content: 'Please select a text before' })
						return
					}

					const selObj = window.getSelection()
					const range = selObj.getRangeAt(0)
					if (cmd == 'convertToList') {
						convertToList(range)
						selObj.removeAllRanges()
					}
					else if (cmd == 'convertToTable') {
						convertToTable(range)
						selObj.removeAllRanges()
					}
					else if (cmd == 'addRow') {
						addRow(range)
					}
					else if (cmd == 'addCol') {
						addColumn(range)
					}

				},
				onRemoveFormat: function (ev) {
					ev.stopPropagation()
					//console.log('onRemoveFormat')
					const selObj = window.getSelection()

					if (!isEditable()) {
						$$.ui.showAlert({ title: 'Error', content: 'Please select a text before' })
						return
					}

					const node = selObj.anchorNode
					if (node.nodeType != node.TEXT_NODE) {
						$$.ui.showAlert({ title: 'Error', content: 'Please select a text before' })
						return

					}
					const text = node.textContent
					//console.log({text})
					const parent = node.parentElement
					const tagName = parent.tagName

					if ($(parent).hasClass('editor')) {
						if (node.previousSibling != null) {
							div(text, tagName).insertAfter(node.previousSibling)
							parent.removeChild(node)
						}
					}
					else {
						if (parent.parentElement.childElementCount == 1) {
							parent.removeChild(node)
							parent.parentElement.textContent = parent.parentElement.textContent + text
						}
						else {
							$(parent).replaceWith(div(text, tagName))
						}
					}
				},
				onMicro: function () {
					if (ctrl.model.recognizing) {
						ctrl.setData({ recognizing: false })
						recognition.stop()
					}
					else {
						startRecognition()
					}
				},
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

					addLink(async () => {
						return await $$.ui.showPrompt({
							title: 'Insert Link',
							label: 'Link Target',
							attrs: { type: 'url' }
						})

					})

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

			if (!isEditable()) {
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

		/**
		 * 
		 * @param {Node} node 
		 * @returns 
		 */
		function hasTextChildNode(node) {
			return Array.from(node.childNodes).filter(entry => entry.nodeType == Node.TEXT_NODE).length != 0
		}


		/**
		 * 
		 * @param {Node} rootNode 
		 * @param {Node} startNode 
		 * @param {Node} endNode 
		 * @returns 
		 */
		function getTextNodesBetween(rootNode, startNode, endNode) {
			let pastStartNode = false
			let reachedEndNode = false
			const textNodes = []

			/**
			 * 
			 * @param {Node} node 
			 */
			function getTextNodes(node) {
				if (node == startNode) {
					pastStartNode = true
				}

				if (node.nodeType == Node.TEXT_NODE) {
					if (pastStartNode && !reachedEndNode) {

						if (node.parentElement.tagName == 'SPAN' && node.parentElement.parentElement.tagName == 'DIV' && hasTextChildNode(node.parentElement.parentElement)) {
							const length = textNodes.length
							if (length > 0)
								textNodes[length - 1] += node.textContent

						}
						else {
							textNodes.push(node.textContent)
						}
					}
				} else {
					for (let i = 0, len = node.childNodes.length; !reachedEndNode && i < len; ++i) {
						getTextNodes(node.childNodes[i])
					}
				}

				if (node == endNode) {
					reachedEndNode = true
				}
			}

			getTextNodes(rootNode)
			return textNodes
		}

		function getSelRangeText() {
			const range = getRange()
			return getTextNodesBetween(range.commonAncestorContainer, range.startContainer, range.endContainer)
		}

		/**
		 * 
		 * @param {() => Promise<string>} cbk 
		 * @returns 
		 */
		async function addLink(cbk) {
			const selObj = window.getSelection()

			if (!isEditable()) {
				$$.ui.showAlert({ title: 'Error', content: 'Please select a text before' })
				return
			}
			const range = getRange()
			if (typeof cbk == 'function' && cbk.constructor.name === 'AsyncFunction') {
				const href = await cbk()
				console.log('href', href)
				if (href != null) {
					selObj.removeAllRanges()
					selObj.addRange(range)

					document.execCommand('createLink', false, href)
				}
			}

			//console.log('href', href)


		}

		function getRange() {
			const selObj = window.getSelection()
			return selObj.getRangeAt(0)
		}
		/**
		 * 
		 * @returns {boolean}
		 */
		function isEditable() {

			const selObj = window.getSelection()
			let node = selObj.anchorNode

			const editable = ctrl.scope.editor.get(0)

			while (node && node != document.documentElement) {
				if (node == editable) {
					return true
				}
				node = node.parentNode;
			}
			return false
		}

		this.addLink = addLink

		this.isEditable = isEditable

		this.html = function (htmlString) {
			if (htmlString == undefined) {
				ctrl.scope.editor.find('span').remove('.interim')
				ctrl.scope.editor.find('span').removeAttr('style')
				return ctrl.scope.editor.html()
			}

			ctrl.scope.editor.html(htmlString)
		}

		this.load = function (url, cbk) {
			return ctrl.scope.editor.load(url, cbk)
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

			if (!isEditable()) {
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

	}

});
