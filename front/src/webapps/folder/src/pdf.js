$$.control.registerControl('pdfPage', {

	deps: ['breizbot.files'],

	template: {gulp_inject: './pdf.html'},

	props: {
		$pager: null,
		fullName: ''
	},

	init: function(elt, files) {

		const {$pager, fullName} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				url: files.fileUrl(fullName)
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



