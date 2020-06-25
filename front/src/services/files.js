$$.service.registerService('breizbot.files', {

	deps: ['brainjs.resource'],

	init: function(config, resource) {
		const http = resource('/api/files')
		
		return {
			fileInfo: function(filePath, friendUser, options) {
				console.log('[FileService] fileInfo', filePath, friendUser, options)

				return http.post('/fileInfo', {filePath, friendUser, options})
			},
			list: function(destPath, options, friendUser) {
				console.log('[FileService] list', destPath)

				return http.post('/list', {destPath, options, friendUser})
			},

			fileUrl: function(fileName, friendUser) {
				return $$.util.getUrlParams('/api/files/load', {fileName, friendUser})
			},

			fileThumbnailUrl: function(fileName, size, friendUser) {
				return $$.util.getUrlParams('/api/files/loadThumbnail', {fileName, size, friendUser})
			},

			uploadFile: function(blob, saveAsfileName, destPath, onUploadProgress) {
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
			}

		}
	},

	$iface: `
		list(path, options, friendUser):Promise<[FileInfo]>;
		fileInfo(filePath, friendUser, options):Promise<FileInfo>
		fileUrl(fileName, friendUser):string;
		fileThumbnailUrl(fileName, size, friendUser):string;
		uploadFile(blob, saveAsfileName, destPath, onUploadProgress):Promise;
	`

});
