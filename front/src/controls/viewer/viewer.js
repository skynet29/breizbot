//@ts-check
$$.control.registerControl('breizbot.viewer', {

	template: {gulp_inject: './viewer.html'},

	props: {
		type: '',
		url: '#'
	},
	
	init: function(elt) {

		//@ts-ignore
		let {type, url} = this.props
		//console.log('props', this.props)

		const ctrl = $$.viewController(elt, {
			data: {
				url,
				type,
				isImage: function() {
					return this.type == 'image'
				},
				isPdf: function() {
					return this.type == 'pdf'
				},
				isAudio: function() {
					return this.type == 'audio'
				},
				isVideo: function() {
					return this.type == 'video'
				},
				isDoc: function() {
					return this.type == 'hdoc'
				}

			},
			events: {
				onTop: function() {
					console.log('onTop')
					ctrl.scope.doc.find('.scrollPanel').get(0).scroll(0, 0)
				}
			}
		})

		async function readHtml() {
			const ret = await fetch(url)			
			const htmlDoc = await ret.text()
			//console.log('htmlDoc', htmlDoc)
			const htmlElt = ctrl.scope.doc.find('.html')
			htmlElt.html(htmlDoc)
			htmlElt.find('a[href^=http]').attr('target', '_blank') // open external link in new navigator tab
		}

		if (type == 'hdoc') {
			readHtml()
		}


		this.setData = function(data) {
			console.log('[Viewer] setData', data)
			if (data.url) {
				ctrl.setData({url: data.url})
			}
		}

	}

});




