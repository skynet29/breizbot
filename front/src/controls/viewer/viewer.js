//@ts-check
$$.control.registerControl('breizbot.viewer', {

	template: { gulp_inject: './viewer.html' },

	deps: ['breizbot.files'],

	props: {
		type: '',
		url: '#'
	},

	init: function (elt, files) {

		//@ts-ignore
		let { type, url } = this.props
		//console.log('props', this.props)


		async function hasSubtitle(fileName) {
			console.log({fileName})
			const { exists } = await files.exists(fileName)
			console.log({exists})
			if (exists) {
				ctrl.scope.video.find('video').append($('<track>', {
					label: 'French',
					kind: 'subtitles',
					srclang: 'fr',
					src: files.fileUrl(fileName)
				}))
			}
		}

		const ctrl = $$.viewController(elt, {
			data: {
				url,
				type,
				language: `language-${type}`,
				isImage: function () {
					return this.type == 'image'
				},
				isPdf: function () {
					return this.type == 'pdf'
				},
				isAudio: function () {
					return this.type == 'audio'
				},
				isVideo: function () {
					return this.type == 'video'
				},
				isDoc: function () {
					return this.type == 'hdoc'
				},
				isCode: function () {
					return ['javascript', 'html'].includes(this.type)
				}

			},
			events: {
				onTop: function () {
					console.log('onTop')
					ctrl.scope.doc.find('.scrollPanel').get(0).scroll(0, 0)
				}
			}
		})

		if (type == 'video') {
			const { fileName } = $$.url.parseUrlParams('https://www.netos.ovh' + url)
			//console.log({fileName})
			const vttFile = fileName.substr(0, fileName.lastIndexOf(".")) + ".vtt";
			hasSubtitle(vttFile)

		}

		async function readText() {
			const ret = await fetch(url)
			return await ret.text()
		}

		async function readHtml() {
			const htmlDoc = await readText()
			//console.log('htmlDoc', htmlDoc)
			const htmlElt = ctrl.scope.doc.find('.html')
			htmlElt.html(htmlDoc)
			htmlElt.find('a[href^=http]').attr('target', '_blank') // open external link in new navigator tab
		}

		async function readCode() {
			const code = await readText()
			const codeElt = ctrl.scope.code
			codeElt.find('code').text(code)
			Prism.highlightAllUnder(codeElt.get(0))
		}

		if (type == 'hdoc') {
			readHtml()
		}

		if (ctrl.model.isCode()) {
			readCode()
		}


		this.setData = function (data) {
			console.log('[Viewer] setData', data)
			if (data.url) {
				ctrl.setData({ url: data.url })

			}
		}

	}

});




