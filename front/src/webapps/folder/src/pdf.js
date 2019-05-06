$$.control.registerControl('pdfPage', {

	deps: ['breizbot.files'],

	template: {gulp_inject: './pdf.html'},

	props: {
		$pager: null,
		url: '',
		fullName: ''
	},

	init: function(elt, files) {

		const {$pager, url, fullName} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				url
			}
		})

		function remove() {
			$$.ui.showConfirm({title: 'Remove file', content: 'Are you sure ?'}, function() {
				files.removeFiles([fullName])
				.then(function(resp) {
					console.log('resp', resp)
					$pager.popPage('reload')
				})
				.catch(function(resp) {
					console.log('resp', resp)
					$$.ui.showAlert({
						content: resp.responseText,
						title: 'Error'
					})
				})
			})			
		}

		this.onAction = function(action) {
			if (action == 'del') {
				remove()
			}
		}

	}
});




