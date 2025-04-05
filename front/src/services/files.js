//@ts-check
$$.service.registerService('breizbot.files', {

	deps: ['brainjs.resource', 'breizbot.params', 'breizbot.pager'],

	/**
	 * 
	 * @param {*} config 
	 * @param {*} resource 
	 * @param {*} params 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 * @returns 
	 */
	init: function (config, resource, params, pager) {
		/**@type {Brainjs.Services.Http.Interface} */
		const http = resource('/api/files')

		const savingDlg = $$.ui.progressDialog()

		let rootDir = '/'

		function openFile(title, props, cbk) {
			props.rootDir = rootDir
			pager.pushPage('breizbot.files', {
				title,
				props,
				events: {
					fileclick: function (ev, data) {
						pager.popPage(data)
					}
				},
				onReturn: async function (data) {
					console.log('onReturn', data)
					rootDir = data.rootDir
					cbk(data)
				}
			})
		}


		return {
			openFile,
			exists: function(filePath) {
				return http.post('/exists', { filePath })
			},

			fileInfo: function (filePath, friendUser, options) {
				//console.log('[FileService] fileInfo', filePath, friendUser, options)

				return http.post('/fileInfo', { filePath, friendUser, options })
			},
			list: function (destPath, options, friendUser) {
				//console.log('[FileService] list', destPath)

				return http.post('/list', { destPath, options, friendUser })
			},

			move: function(fileName, destPath) {
				return http.post('/move', { destPath, fileName})
			},

			fileUrl: function (fileName, friendUser) {
				return $$.url.getUrlParams('/api/files/load', { fileName, friendUser })
			},

			fileAppUrl: function(fileName) {
				fileName = `/apps/${params.$appName}/${fileName}`
				return $$.url.getUrlParams('/api/files/load', { fileName })
			},

			fileThumbnailUrl: function (fileName, size, friendUser) {
				return $$.url.getUrlParams('/api/files/loadThumbnail', { fileName, size, friendUser })
			},

			fileAppThumbnailUrl: function (fileName, size) {
				fileName = `/apps/${params.$appName}/${fileName}`
				return $$.url.getUrlParams('/api/files/loadThumbnail', { fileName, size })
			},

			assetsUrl: function(fileName)  {
				return  `/webapps/${params.$appName}/assets/${fileName}`
			},

			/**
			 * 
			 * @param {Blob} blob 
			 * @param {string} saveAsfileName 
			 * @param {string} destPath 
			 * @param {boolean} checkExists
			 * @param {*} onUploadProgress 
			 * @returns 
			 */
			uploadFile: async function (blob, saveAsfileName, destPath, checkExists, onUploadProgress) {
				//console.log('[FileService] uploadFile', checkExists, saveAsfileName, destPath)
				if (!(blob instanceof Blob)) {
					console.warn('File format not supported')
					return Promise.reject('File format not supported')
				}
				if (checkExists) {
					try {
						await this.fileInfo(destPath + '/' + saveAsfileName)
						return Promise.reject('File already exists')
					}
					catch(e) {
					}
				}
				const fd = new FormData()
				fd.append('file', blob, saveAsfileName)
				fd.append('destPath', destPath)
				return http.postFormData('/save', fd, onUploadProgress)

				//console.log('blob', blob)

			},

			saveFile: async function (blob, saveAsfileName, options) {
				options = options || {}
				const destPath  = options.destPath || `/apps/${params.$appName}`
				try {
					savingDlg.setPercentage(0)
					savingDlg.show()
					const resp = await this.uploadFile(blob, saveAsfileName, destPath, options.checkExists, (value) => {
						savingDlg.setPercentage(value)
					})
					await $$.util.wait(1000)
					savingDlg.hide()
					return true
				}
				catch (e) {
					console.log('error', e)
					savingDlg.hide()
					$$.ui.showAlert({
						title: 'Error',
						content: e.responseText || e
					})
					return false
				}

			}

		}
	}

});
