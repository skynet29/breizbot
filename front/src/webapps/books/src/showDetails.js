$$.control.registerControl('showDetails', {

	template: { gulp_inject: './showDetails.html' },

	deps: ['breizbot.pager', 'breizbot.files'],

	props: {
		data: {}
	},

	init: function (elt, pager, srvFile) {

		const { data } = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				data,
				getCoverUrl: function () {
					return (this.data.cover) ? srvFile.fileAppUrl(this.data.cover) : '#'
				},
				getDescription: function() {
					return (this.data.description) ? this.data.description.replace(/\n/g, '<br><br>') : ''
				}
			},
			events: {
			}
		})

	}


});




