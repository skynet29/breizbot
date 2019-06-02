$$.control.registerControl('breizbot.viewer', {

	deps: ['breizbot.files'],

	template: {gulp_inject: './viewer.html'},

	props: {
		fullName: ''
	},
	
	init: function(elt, files) {

		const {fullName} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				url: files.fileUrl(fullName),
				type: $$.util.getFileType(fullName)
			}
		})

		function remove(callback) {
			$$.ui.showConfirm({title: 'Remove file', content: 'Are you sure ?'}, function() {
				files.removeFiles([fullName])
				.then(function(resp) {
					console.log('resp', resp)
					callback()
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

		this.remove = remove

	},
	$iface: `remove()`

});




