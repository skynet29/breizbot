$$.control.registerControl('breizbot.htmleditor', {

	template: {gulp_inject: './editor.html'},

	init: function(elt) {

		const colorMap = {
			black: '#0',
			red: '#f44336',
			green: '#4CAF50',
			blue: '#2196F3',
			yellow: '#ffeb3b',
			cyan: '#00bcd4',
			pink: '#e91e63'

		}


		const ctrl = $$.viewController(elt, {
			data: {
				color: '#0',
				colorItems: {
					black: {name: 'Black', icon: 'fas fa-square-full w3-text-black'},
					red: {name: 'Red', icon: 'fas fa-square-full w3-text-red'},
					green: {name: 'Green', icon: 'fas fa-square-full w3-text-green'},
					blue: {name: 'Blue', icon: 'fas fa-square-full w3-text-blue'},
					yellow: {name: 'Yellow', icon: 'fas fa-square-full w3-text-yellow'},
					cyan: {name: 'Cyan', icon: 'fas fa-square-full w3-text-cyan'},
					pink: {name: 'Magenta', icon: 'fas fa-square-full w3-text-pink'}
				},
				html: elt.val()
			},
			events: {
				onCreateLink: async function() {
					const selObj = window.getSelection()
					console.log('selObj', selObj)
					const {anchorNode, anchorOffset, focusOffset } = selObj

					if (!isEditable(anchorNode)) {
						$$.ui.showAlert({title: 'Error', content: 'Please select a text before'})
						return
					}

					const href = await $$.ui.showPrompt({
						title: 'Insert Link',
						label: 'Link Target',
						attrs: {type: 'url'}
					})
					console.log('href', href)
					if (href != null) {
						const range = document.createRange()
						range.setStart(anchorNode, anchorOffset)
						range.setEnd(anchorNode, focusOffset)
						selObj.removeAllRanges()
						selObj.addRange(range)

							document.execCommand('createLink', false, href)
					}

				},
				onScrollClick: function() {
					ctrl.scope.editor.focus()
				},
				onCommand: function(ev, data) {
					console.log('onCommand', data)

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
					console.log('onCommand', cmd, cmdArg)

					document.execCommand(cmd, false, cmdArg)
				
				},
				onColorMenuChange: function(ev, data) {
					console.log('onColorMenuChange', data)
					//ctrl.setData({color: colorMap[data.cmd]})
					document.execCommand('foreColor', false, colorMap[data.cmd])
				}

			}

		})	

		function isEditable(node) {

			const editable = ctrl.scope.editor.get(0)

			while(node && node != document.documentElement) {
				if(node == editable) {
					return true
				}
				node = node.parentNode;
			}	
			return false		
		}

		this.html = function(htmlString) {
			if (htmlString == undefined) {
				return ctrl.scope.editor.html()
			}

			ctrl.scope.editor.html(htmlString)
		}

		this.load = function(url) {
			return ctrl.scope.editor.load(url)
		}

		this.insertImage = function(url) {
			document.execCommand('insertImage', false, url)
		}

		this.getValue = function() {
			return ctrl.scope.editor.html() 
		}

		this.setValue = function(value) {
			//console.log('brainjs.htmleditor:setValue', value)
			ctrl.scope.editor.html(value)
		}

		this.focus = function() {
			ctrl.scope.editor.get(0).focus()
		}


	},
	$iface: `
		html(htmlString): string;load(url);
		insertImage(url)
	`

});
