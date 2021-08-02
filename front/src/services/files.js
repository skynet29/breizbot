$$.service.registerService('breizbot.files', {

	deps: ['brainjs.resource', 'breizbot.params'],

	init: function (config, resource, params) {
		const http = resource('/api/files')

		const savingDlg = $$.ui.progressDialog()


		return {
			fileInfo: function (filePath, friendUser, options) {
				console.log('[FileService] fileInfo', filePath, friendUser, options)

				return http.post('/fileInfo', { filePath, friendUser, options })
			},
			list: function (destPath, options, friendUser) {
				console.log('[FileService] list', destPath)

				return http.post('/list', { destPath, options, friendUser })
			},

			fileUrl: function (fileName, friendUser) {
				return $$.util.getUrlParams('/api/files/load', { fileName, friendUser })
			},

			fileAppUrl: function(fileName) {
				fileName = `/apps/${params.$appName}/${fileName}`
				return $$.util.getUrlParams('/api/files/load', { fileName })
			},

			fileThumbnailUrl: function (fileName, size, friendUser) {
				return $$.util.getUrlParams('/api/files/loadThumbnail', { fileName, size, friendUser })
			},

			uploadFile: function (blob, saveAsfileName, destPath, onUploadProgress) {
				console.log('[FileService] uploadFile', saveAsfileName, destPath)
				if (!(blob instanceof Blob)) {
					console.warn('File format not supported')
					return Promise.reject('File format not supported')
				}
				//console.log('blob', blob)
				var fd = new FormData()
				fd.append('file', blob, saveAsfileName)
				fd.append('destPath', destPath)
				return http.postFormData('/save', fd, onUploadProgress)
			},

			saveFile: async function (blob, saveAsfileName, destPath) {
				destPath = destPath || `/apps/${params.$appName}`
				try {
					savingDlg.setPercentage(0)
					savingDlg.show()
					const resp = await this.uploadFile(blob, saveAsfileName, destPath, (value) => {
						savingDlg.setPercentage(value)
					})
					await $$.util.wait(1000)
					savingDlg.hide()
				}
				catch (e) {
					savingDlg.hide()
					$$.ui.showAlert({
						title: 'Error',
						content: e.responseText
					})
				}

			}

		}
	},

	$iface: `
		list(path, options, friendUser):Promise<[FileInfo]>;
		fileInfo(filePath, friendUser, options):Promise<FileInfo>
		fileUrl(fileName, friendUser):string;
		fileThumbnailUrl(fileName, size, friendUser):string;
		uploadFile(blob, saveAsfileName, destPath, [onUploadProgress]):Promise;
		saveFile(blob, saveAsfileName, [destPath]):Promise;
	`

});
