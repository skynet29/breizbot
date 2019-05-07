$$.service.registerService('breizbot.files', {

	deps: ['brainjs.http'],

	init: function(config, http) {
		return {
			list: function(path, options) {
				console.log('[FileService] list', path)

				return http.post('/api/files/list', {path, options})
			},

			fileUrl: function(fileName) {
				return '/api/files/load?fileName=' + fileName
			},

			fileThumbnailUrl: function(fileName, size) {
				return `/api/files/loadThumbnail?fileName=${fileName}&size=${size}`
			},

			uploadFile: function(blob, saveAsfileName, destPath) {
				console.log('[FileService] uploadFile', saveAsfileName, destPath)
				if (!(blob instanceof Blob)) {
					console.warn('File format not supported')
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
	},

	$iface: `
		list(path, options):Promise;
		fileUrl(fileName):string;
		fileThumbnailUrl(fileName, size):string;
		uploadFile(blob, saveAsfileName, destPath):Promise;
		removeFiles(fileNames):Promise;
		mkdir(fileName):Promise;
		moveFiles(fileNames, destPath):Promise;
		copyFiles(fileNames, destPath):Promise			
	`

});
