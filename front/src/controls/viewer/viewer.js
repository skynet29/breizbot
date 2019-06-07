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
				type
			}
		})

		function remove(fullName, callback) {
			console.log('[Viewer] remove', {fullName})

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

		function save(destPath, fileName, callback) {			
			console.log('[Viewer] save', {destPath, fileName})
			if (ctrl.model.url == '') {
				$$.ui.showAlert({title: 'Error', content: 'File not loaded, please wait'})
				return
			}
			const blob = $$.util.dataURLtoBlob(ctrl.model.url)
			files.uploadFile(blob, fileName, destPath).then(function(resp) {
				console.log('resp', resp)
				callback()
			})	
			.catch(function(resp) {
				$$.ui.showAlert({
					title: 'Error',
					content: resp.responseText
				})
			})				
		}		

		this.remove = remove
		this.save = save

		this.setData = function(data) {
			console.log('[Viewer] setData', data)
			if (data.url) {
				ctrl.setData({url: data.url})
			}
		}

	},
	$iface: `
		remove(fullName, callback);
		save(destPath, fileName, callback)
		`

});




