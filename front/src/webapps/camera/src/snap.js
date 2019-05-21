$$.control.registerControl('snapPage', {

	deps: ['breizbot.files'],

	template: {gulp_inject: './snap.html'},

	props: {
		$pager: null,
		url: null
	},

	buttons: [
		{label: 'Save', icon: 'fa fa-save'}
	],	

	init: function(elt, files) {

		const {url, $pager} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				url
			}
		})

		this.onAction = function(action) {
			console.log('onAction', action)
			const fileName = 'SNAP' + Date.now() + '.png'
			console.log('fileName', fileName)
			const blob = $$.util.dataURLtoBlob(url)
			files.uploadFile(blob, fileName, '/images/camera').then(function(resp) {
				console.log('resp', resp)
				$pager.popPage()
			})	
			.catch(function(resp) {
				$$.ui.showAlert({
					title: 'Error',
					content: resp.responseText
				})
			})			
		}

	}
});




