$$.service.registerService('app.share', {

	deps: ['breizbot.http'],

	init: function(config, http) {
		return {
			list: function(user, path) {
				console.log('[Share] list', path)

				return http.post('/list', {path, user}).then((files) => {
					files.forEach((file) => {
						file.isImage = ($$.util.getFileType(file.name) == 'image')
					})
					return files
				})
			},

			fileUrl: function(user, fileName) {
				return $$.util.getUrlParams('/api/app/share/load', {user, fileName})
			},

			fileThumbnailUrl: function(user, fileName, size) {
				return $$.util.getUrlParams('/api/app/share/loadThumbnail', {user, fileName, size})
			}


		}
	},

	$iface: `
		list(user, path):Promise;
		fileUrl(user, fileName):string;
		fileThumbnailUrl(user, fileName, size):string;
	`

});