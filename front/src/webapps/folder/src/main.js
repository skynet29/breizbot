$$.control.registerControl('breizbot.main', {

	deps: ['breizbot.files'],

	template: {gulp_inject: './main.html'},

	init: function(elt, srvFiles) {

		$$.viewController(elt, {
			data: {
			},
			events: {
				onFileClick: function(ev, data) {
					//console.log('onFileClick', data)
					const {fileName, rootDir} = data
					if ($$.util.isImage(fileName)) {
						const url = srvFiles.fileUrl(rootDir + fileName)
						$$.ui.showAlert({
							okText: 'Close',
							width: 'auto',
							title: fileName,
							content: `<img src="${url}" width="400">`
						})						
					}

				}
			}
		})
	}
});




