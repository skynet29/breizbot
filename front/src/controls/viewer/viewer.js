$$.control.registerControl('breizbot.viewer', {

	deps: ['breizbot.files'],

	template: {gulp_inject: './viewer.html'},

	props: {
		type: '',
		url: '#'
	},
	
	init: function(elt, files) {

		let {type, url} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				url,
				type,
				if1: function() {
					return this.type == 'image'
				},
				if2: function() {
					return this.type == 'pdf'
				},
				if3: function() {
					return this.type == 'audio'
				},
				if4: function() {
					return this.type == 'video'
				}

			}
		})



		this.setData = function(data) {
			//console.log('[Viewer] setData', data)
			if (data.url) {
				ctrl.setData({url: data.url})
			}
		}

	},
	$iface: `
		setData({url: string})
		`

});




