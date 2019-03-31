$$.control.registerControl('imagePage', {

	deps: ['breizbot.files'],

	template: {gulp_inject: './image.html'},

	props: {
		$pager: null,
		url: null,
		fileName: ''
	},

	init: function(elt, files) {

		const {url, $pager, fileName} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				url
			}
		})
		this.onAction = function(action) {
			$$.ui.showConfirm({title: 'Remove file', content: 'Are you sure ?'}, function() {
				files.removeFiles([fileName])
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

	}
});




