$$.service.registerService('breizbot.files', ['brainjs.http'], function(config, http) {

	return {
		list: function(path, options) {
			console.log('[FileService] list', path)

			return http.post('/api/files/list', {path, options})
		},

		fileUrl: function(fileName) {
			return '/api/files/load?fileName=' + fileName
		},

		uploadFile: function(blob, saveAsfileName, destPath) {
			console.log('[FileService] uploadFile', saveAsfileName)
			if (!(blob instanceof Blob)) {
				return Promise.reject('File format not supported')
			}
			//console.log('blob', blob)
			var fd = new FormData()
			fd.append('file', blob, saveAsfileName)
			fd.append('destPath', destPath)
			return http.postFormData('/api/files/save', fd)
		},

		removeFiles: function(fileNames) {
			console.log('[FileService] removeFiles', fileNames)
			return http.post('/api/files/delete', fileNames)
		},

		mkdir: function(fileName) {
			console.log('[FileService] mkdir', fileName)
			return http.post('/api/files/mkdir', {fileName})
		},

		moveFiles: function(fileNames, destPath) {
			console.log('[FileService] moveFiles', fileNames, destPath)
			return http.post('/api/files/move', {fileNames, destPath})
		},

		copyFiles: function(fileNames, destPath) {
			console.log('[FileService] copyFiles', fileNames, destPath)
			return http.post('/api/files/copy', {fileNames, destPath})
		}	
	}

});
