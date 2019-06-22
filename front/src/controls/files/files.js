$$.control.registerControl('breizbot.files', {
	deps: ['breizbot.files'], 
	props: {
		$pager: null,
		cmd: '',
		showToolbar: false,
		imageOnly: false,
		filterExtension: undefined,
		showThumbnail: false,
		thumbnailSize: '?x100',
		maxUploadSize: 2*1024*2014 // 2 Mo		
	},

	template: {gulp_inject: './files.html'},

	init: function(elt, srvFiles) {

		const {
			$pager,
			cmd,
			showToolbar,
			maxUploadSize,
			filterExtension,
			imageOnly,
			thumbnailSize,
			showThumbnail
		} = this.props

		const ctrl = $$.viewController(elt, {
			
			data: {
				isFile: false,
				showThumbnail,
				thumbnailSize,
				showToolbar,
				rootDir: '/',
				selectMode: false,
				files: [],
				selectedFiles: [],
				operation: 'none',
				nbSelection: 0,
				isShareSelected: false,
				getSize: function(size) {
					let unit = 'Ko'
					size /= 1024
					if (size > 1024) {
						unit = 'Mo'
						size /= 1024
					}
					return 'Size : ' + Math.floor(size) + ' ' + unit
				},

				getIconClass: function(name) {
					if (name.endsWith('.pdf')) {
						return 'fa-file-pdf'
					}
					if (name.endsWith('.doc')) {
						return 'fa-file-word'
					}
					if (name.endsWith('.ogg') || name.endsWith('.mp3')) {
						return 'fa-file-audio'
					}
					if (name.endsWith('.mp4')) {
						return 'fa-file-video'
					}
					return 'fa-file'
				}
			},
			events: {
				onReload: function(ev) {
					loadData()
				},

				onFileClick: function(ev) {
					const info = $(this).closest('.thumbnail').data('info')
					//console.log('onFileClick', info)
					const data = {
						fileName: info.name,
						rootDir: ctrl.model.rootDir,                       
						isImage: info.isImage,
						cmd
					}

					if ($pager != null) {
						$pager.popPage(data)
					}
					else {
						elt.trigger('fileclick', data)
					}
				},
				onCheckClick: function(ev) {
					console.log('onCheckClick')

					const info = $(this).closest('.thumbnail').data('info')

					//console.log('info', info)
					if (info.name == 'share' && ctrl.model.rootDir == '/') {
						ctrl.model.isShareSelected = $(this).getValue()
					}
					//console.log('isShareSelected', ctrl.model.isShareSelected)
					
					const $checked = elt.find('.check:checked')
					const nbSelection = $checked.length

					let isFile = false
					if (nbSelection == 1) {
						const info = $checked.closest('.thumbnail').data('info')
						isFile = !info.folder
					}

					ctrl.setData({
						nbSelection,
						isFile
					})
				},
				onFolderClick: function(ev) {
					const info = $(this).closest('.thumbnail').data('info')

					const dirName = info.name
					//console.log('onFolderClick', dirName)
					if (dirName == '..') {
						const split = ctrl.model.rootDir.split('/')						
						split.pop()
						split.pop()						
						loadData(split.join('/') + '/')
					}
					else {
						loadData(ctrl.model.rootDir + dirName + '/')
					}
				},
				onCreateFolder: function() {
					var rootDir = ctrl.model.rootDir
					$$.ui.showPrompt({
						content: 'Folder name:', 
						title: 'New Folder'
					}, function(folderName) {
						srvFiles.mkdir(rootDir + folderName)
						.then(function(resp) {
							console.log('resp', resp)
							loadData()
						})
						.catch(function(resp) {
							console.log('resp', resp)
							$$.ui.showAlert({
								content: resp.responseText,
								title: 'Error'
							})
						})	
					})
				},
				onToggleSelMode: function()	{
					console.log('onToggleSelMode')

					setSelMode(!ctrl.model.selectMode)
				},

				onDeleteFiles: function(ev) {

					const selFiles = getSelFiles()

					if (selFiles.length == 0) {
						$$.ui.showAlert({
							title: 'Delete files',
							content: 'No files selected'
						})
						return
					}

					$$.ui.showConfirm({
						content: 'Are you sure ?',
						title: 'Delete files'
					}, function() {
						srvFiles.removeFiles(selFiles)
						.then(function(resp) {
							console.log('resp', resp)
							loadData()
						})
						.catch(function(resp) {
							console.log('resp', resp)
							$$.ui.showAlert({
								content: resp.responseText,
								title: 'Error'
							})
						})					
					})					
				},
				onCutFiles: function(ev) {
					console.log('onCutFiles')
					ctrl.setData({
						selectedFiles: getSelFiles(),
						operation: 'cut'
					})
					setSelMode(false)
				},

				onCopyFiles: function(ev) {
					console.log('onCopyFiles')
					ctrl.setData({
						selectedFiles: getSelFiles(),
						operation: 'copy'
					})
					
					setSelMode(false)
				},

				onShareFiles: function(ev) {
					console.log('onShareFiles')
					srvFiles.shareFiles(getSelFiles())
					.then(function(resp) {
						console.log('resp', resp)
						ctrl.setData({selectedFiles: [], operation: 'none'})
						loadData()
					})
					.catch(function(resp) {
						console.log('resp', resp)
						//ctrl.setData({selectedFiles: [], operation: 'none'})
						$$.ui.showAlert({
							content: resp.responseText,
							title: 'Error'
						})
					})						
				},

				onPasteFiles: function(ev) {
					console.log('onPasteFiles')
					const {rootDir, selectedFiles, operation} = ctrl.model
					const promise = 
						(operation == 'copy') ? srvFiles.copyFiles(selectedFiles, rootDir) : srvFiles.moveFiles(selectedFiles, rootDir)

					promise
					.then(function(resp) {
						console.log('resp', resp)
						ctrl.setData({selectedFiles: [], operation: 'none'})
						loadData()
					})
					.catch(function(resp) {
						console.log('resp', resp)
						//ctrl.setData({selectedFiles: [], operation: 'none'})
						$$.ui.showAlert({
							content: resp.responseText,
							title: 'Error'
						})
					})						
				},
				onImportFile: function(ev) {

					$$.util.openFileDialog(function(file) {
						//console.log('fileSize', file.size / 1024)
						if (file.size > maxUploadSize) {
							$$.ui.showAlert({content: 'File too big', title: 'Import file'})
							return
						}
						$$.util.readFileAsDataURL(file, function(dataURL) {
							//console.log('dataURL', dataURL)
							const blob = $$.util.dataURLtoBlob(dataURL)
							srvFiles.uploadFile(blob, file.name, ctrl.model.rootDir).then(function() {
								loadData()
							})
							.catch(function(resp) {
								console.log('resp', resp)
								$$.ui.showAlert({content: resp.responseText, title: 'Error'})							
							})
						})					
					})
				},
				onDownloadFile: function(ev) {
					const info = elt.find('.check:checked').closest('.thumbnail').data('info')
					console.log('onDownloadFile', info)
					const {rootDir} = ctrl.model

					const link = document.createElement('a')
					link.href = srvFiles.fileUrl(rootDir + info.name)
					link.download = info.name
					link.click()

				}
			}

		})

		function setSelMode(selMode) {
			if (selMode == false) {
				ctrl.model.nbSelection = 0
			}
			ctrl.model.selectMode = selMode
			ctrl.forceUpdate('files')
		}

		function getSelFiles() {
			const selFiles = []
			elt.find('.check:checked').each(function() {
				const info = $(this).closest('.thumbnail').data('info')
				
				selFiles.push(ctrl.model.rootDir + info.name)
			})
			console.log('selFiles', selFiles)	
			return selFiles		
		}

		function loadData(rootDir) {
			//console.log('loadData', rootDir)
			if (rootDir == undefined) {
				rootDir = ctrl.model.rootDir
			}
			srvFiles.list(rootDir, {filterExtension, imageOnly}).then(function(files) {
				console.log('files', files)
				files.forEach((f) => {
					if (f.isImage) {
						f.thumbnailUrl = srvFiles.fileThumbnailUrl(rootDir + f.name, thumbnailSize)
					}
				})

				if (rootDir != '/') {
					files.unshift({name: '..', folder: true})
				}

				ctrl.setData({
					files, 
					rootDir, 
					selectMode: false, 
					hasSelection: false, 
					nbSelection: 0,
					isShareSelected: false
				})

			})		
		}

		loadData()

		this.update = function() {
			console.log('[FileCtrl] update')
			loadData()
		}
	},

	$iface: 'update()',
	$events: 'fileclick'

});
