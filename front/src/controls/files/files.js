$$.control.registerControl('breizbot.files', {
	deps: ['breizbot.files'], 
	props: {
		$pager: null,
		showToolbar: false,
		imageOnly: false,
		filterExtension: undefined,
		friendUser: ''
	},

	template: {gulp_inject: './files.html'},

	init: function(elt, srvFiles) {

		const thumbnailSize = '100x?'
		const maxUploadSize = 2*1024*2014 // 2 Mo

		let {
			$pager,
			showToolbar,
			filterExtension,
			friendUser,
			imageOnly
		} = this.props

		if (friendUser != '') {
			showToolbar = false
		}

		const ctrl = $$.viewController(elt, {
			
			data: {
				showToolbar,
				rootDir: '/',
				selectMode: false,
				files: [],
				selectedFiles: [],
				operation: 'none',
				nbSelection: 0,
				isShareSelected: false,
				prop1: function() {
					return {disabled: this.nbSelection == 0}
				},
				prop2: function() {
					return {disabled: this.nbSelection == 0 || this.rootDir.startsWith('/share/') || this.isShareSelected}
				},
				prop3: function() {
					return {disabled:  this.selectedFiles.length == 0}
				}

			},
			events: {
				onReload: function(ev) {
					loadData()
				},

				onContextMenu: function(ev, cmd, info) {
					console.log('onContextMenu', cmd, info)

					const {rootDir} = ctrl.model

					if (cmd == 'download') {
						const url = srvFiles.fileUrl(rootDir + info.name)
						$$.util.downloadUrl(url, info.name)
					}

					if (cmd == 'rename') {
						const oldFileName = info.name
						$$.ui.showPrompt({label: 'New name', title: 'Rename', value: oldFileName}, function(newFileName) {
							console.log('newFileName', newFileName)
							if (newFileName != oldFileName) {
								srvFiles.renameFile(rootDir, oldFileName, newFileName)
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
								})								}
						})
					}

					if (cmd == 'makeResizedCopy') {
						$$.ui.showPrompt({
							label: 'Rescale percentage:', 
							title: 'Make resized copy',
							attrs: {min: 10, max: 90, type: 'number'},
							value: 50
						}, function(percentage) {
							srvFiles.resizeImage(rootDir, info.name, percentage+'%')
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
					}

					if (cmd == 'convertToMP3') {
						srvFiles.convertToMP3(rootDir, info.name)
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
					}

					if (cmd == 'delete') {
						deleteFiles([rootDir + info.name])
					}

					
				},

				onFileClick: function(ev, info) {
					//console.log('onFileClick', info)
					ev.stopPropagation()
					const data = {
						fileName: info.name,
						rootDir: ctrl.model.rootDir,                       
						isImage: info.isImage
					}

					if ($pager != null) {
						$pager.popPage(data)
					}
					else {
						elt.trigger('fileclick', data)
					}
				},
				onCheckClick: function(ev, info, value) {
					//console.log('onCheckClick', info, value)

					//console.log('info', info)
					if (info.name == 'share' && ctrl.model.rootDir == '/') {
						ctrl.model.isShareSelected = value
					}
					//console.log('isShareSelected', ctrl.model.isShareSelected)
					
					const checked = ctrl.scope.files.getSelFiles()
					const nbSelection = checked.length

					ctrl.setData({nbSelection})
				},
				onFolderClick: function(ev, info) {

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

					deleteFiles(selFiles)

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
						$$.util.readFile(file).then((blob) => {
							srvFiles.uploadFile(blob, file.name, ctrl.model.rootDir).then(function() {
								loadData()
							})
							.catch(function(resp) {
								console.log('resp', resp)
								$$.ui.showAlert({content: resp.responseText, title: 'Error'})							
							})

						})
				
					})
				}
			}

		})

		function deleteFiles(fileNames) {
			$$.ui.showConfirm({
				content: 'Are you sure ?',
				title: 'Delete files'
			}, function() {
				srvFiles.removeFiles(fileNames)
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
		}

		function setSelMode(selMode) {
			if (selMode == false) {
				ctrl.model.nbSelection = 0
			}
			ctrl.model.selectMode = selMode
			ctrl.update()
		}

		function getSelFiles() {
			const selFiles = ctrl.scope.files.getSelFiles()
			console.log('selFiles', selFiles)
			return selFiles.map((f) => ctrl.model.rootDir + f.name)
		}

		function loadData(rootDir) {
			//console.log('loadData', rootDir)
			if (rootDir == undefined) {
				rootDir = ctrl.model.rootDir
			}
			srvFiles.list(rootDir, {filterExtension, imageOnly}, friendUser).then(function(files) {
				//console.log('files', files)
				files.forEach((f) => {
					f.items = {
						delete: {name: 'Delete', icon: 'fas fa-trash'}
					}
					if (f.isImage) {
						f.thumbnailUrl = srvFiles.fileThumbnailUrl(rootDir + f.name, thumbnailSize, friendUser)
					}
					if (showToolbar) {
						f.items.rename = {name: 'Rename'}
						if (f.isImage) {
							f.items.makeResizedCopy = {name: 'Make resized copy', icon: 'fas fa-compress-arrows-alt'}
						}
						if (!f.folder) {
							f.items.download = {name: 'Download', icon: 'fas fa-download'}
						}
						if (f.name.endsWith('.mp4')) {
							f.items.convertToMP3 = {name: 'Convert to MP3'}
						}

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

		this.getFiles = function() {
			return ctrl.model.files.filter((f) => !f.folder)
		}

		this.update = function() {
			console.log('[FileCtrl] update')
			loadData()
		}
	},

	$iface: 'update()',
	$events: 'fileclick'

});
