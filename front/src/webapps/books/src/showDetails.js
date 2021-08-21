//@ts-check
$$.control.registerControl('showDetails', {

	template: { gulp_inject: './showDetails.html' },

	deps: ['breizbot.files'],

	props: {
		data: {}
	},

	/**
	 * 
	 * @param {Breizbot.Services.Files.Interface} srvFile 
	 */
	init: function (elt, srvFile) {

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




