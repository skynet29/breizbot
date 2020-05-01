(function () {

	function getIconClass(name) {
		name = name.toLowerCase()
		if (name.endsWith('.pdf')) {
			return 'fa-file-pdf'
		}
		if (name.endsWith('.hdoc')) {
			return 'fa-file-word'
		}
		if (name.endsWith('.ogg') || name.endsWith('.mp3')) {
			return 'fa-file-audio'
		}
		if (name.endsWith('.mp4')) {
			return 'fa-file-video'
		}
		if (name.endsWith('.zip')) {
			return 'fa-file-archive'
		}

		return 'fa-file'
	}

	function sortFiles(files) {
		files.sort((a, b) => {
			if (a.folder && !b.folder) {
				return -1
			}
			if (!a.folder && b.folder) {
				return 1
			}
			return a.name.localeCompare(b.name)
		})
	}

	$$.control.registerControl('breizbot.files', {
		deps: ['breizbot.files'],
		props: {
			$pager: null,
			showToolbar: false,
			imageOnly: false,
			filterExtension: undefined,
			getMP3Info: false,
			friendUser: '',
			mp3Filters: null
		},

		template: { gulp_inject: './files.html' },

		init: function (elt, srvFiles) {

			const thumbnailSize = '100x?'
			const maxUploadSize = 10 * 1024 * 2014 // 10 Mo

			let selected = false

			let {
				showToolbar,
				filterExtension,
				friendUser,
				imageOnly,
				getMP3Info,
				mp3Filters
			} = this.props

			if (friendUser != '') {
				showToolbar = false
			}

			function getSelFiles() {
				const selFiles = []
				elt.find('.check:checked').each(function () {
					const idx = $(this).closest('.thumbnail').index()
					const { name, folder } = ctrl.model.files[idx]

					selFiles.push({ fileName: ctrl.model.rootDir + name, idx, folder })
				})
				//console.log('selFiles', selFiles)	
				return selFiles
			}


			function getNbSelFiles() {
				return elt.find('.check:checked').length
			}

			function toggleSelection() {
				selected = !selected
				elt.find('.check').prop('checked', selected)
			}

			const ctrl = $$.viewController(elt, {

				data: {
					downloads: [],
					hasDownloads: function() {
						return this.downloads.length > 0
					},
					loading: false,
					showToolbar,
					rootDir: '/',
					files: [],
					selectedFiles: [],
					operation: 'none',
					nbSelection: 0,
					isShareSelected: false,
					mp3Filters,
					info: function () {
						let nbFiles = 0
						let nbFolders = 0
						this.getFiles().forEach((i) => {
							if (i.folder) {
								if (i.name != '..') {
									nbFolders++
								}
							}
							else {
								nbFiles++
							}
						})

						let ret = []
						if (nbFolders == 1) {
							ret.push(`${nbFolders} folder`)
						}
						if (nbFolders > 1) {
							ret.push(`${nbFolders} folders`)
						}
						if (nbFiles == 1) {
							ret.push(`${nbFiles} file`)
						}
						if (nbFiles > 1) {
							ret.push(`${nbFiles} files`)
						}
						return ret.join(' / ')
					},

					isInFilter: function (mp3Info) {
						var ret = true
						for (var f in this.mp3Filters) {
							var value = mp3Info[f]
							var filterValue = this.mp3Filters[f]
							if (filterValue != null) {
								ret &= (filterValue === value)
							}
						}
						return ret
					},

					getFiles: function () {
						if (this.mp3Filters === null) {
							return this.files
						}
						return this.files.filter((f) => {
							return f.folder || (f.mp3 && f.mp3 && this.isInFilter(f.mp3))
						})
					},
					isMP3: function (scope) {
						return getMP3Info && scope.f.mp3 != undefined && scope.f.mp3.title != undefined &&
							scope.f.mp3.title != ''
					},
					getPath: function () {
						const tab = ('/home' + this.rootDir).split('/')
						tab.shift()
						tab.pop()
						return tab
					},
					isLast: function (scope) {
						return scope.idx == this.getPath().length - 1
					},
					isFirst: function (scope) {
						return scope.idx == 0
					},
					getPathInfo: function (scope) {
						return this.getPath().slice(1, scope.idx + 1).join('/')
					},

					getItems: function (scope) {
						const ret = {}
						if (showToolbar && scope.f.name != '..') {
							ret.delete = { name: 'Delete', icon: 'fas fa-trash' }
							ret.rename = { name: 'Rename' }
							if (scope.f.isImage) {
								ret.makeResizedCopy = { name: 'Make resized copy', icon: 'fas fa-compress-arrows-alt' }
							}
							if (!scope.f.folder) {
								ret.download = { name: 'Download', icon: 'fas fa-download' }
							}
							if (scope.f.name.toLowerCase().endsWith('.mp4')) {
								ret.convertToMP3 = { name: 'Convert to MP3' }
							}
							if (scope.f.folder) {
								ret.zipFolder = { name: 'Zip Folder', icon: 'fas fa-file-archive' }
							}

						}
						return ret

					},
					getThumbnailUrl: function (scope) {
						return srvFiles.fileThumbnailUrl(this.rootDir + scope.f.name, thumbnailSize, friendUser)
					},
					if1: function (scope) {
						return scope.f.name != '..'
					},
					if2: function (scope) {
						return !scope.f.folder && !scope.f.isImage && !this.isMP3(scope)
					},
					if3: function (scope) {
						return !scope.f.folder && scope.f.isImage
					},
					class1: function (scope) {
						return `fa fa-4x w3-text-blue-grey ${getIconClass(scope.f.name)}`
					},
					getSize: function (scope) {
						let size = scope.f.size
						let unit = 'octets'
						if (size > 1024) {
							unit = 'Ko'
							size /= 1024
						}

						if (size > 1024) {
							unit = 'Mo'
							size /= 1024
						}

						size = Math.floor(size * 10) / 10
						return 'Size: ' + size + ' ' + unit
					},

					getDimension: function (scope) {
						const d = scope.f.dimension
						return `Dimension: ${d.width}x${d.height}`
					},


					getDate: function (scope) {
						const date = new Date(scope.f.mtime).toLocaleDateString()
						return 'Last Modif: ' + date

					},

					prop1: function () {
						return { disabled: this.nbSelection == 0 }
					},
					prop2: function () {
						return { disabled: this.nbSelection == 0 || this.rootDir.startsWith('/share/') || this.isShareSelected }
					},
					prop3: function () {
						return { disabled: this.selectedFiles.length == 0 }
					}

				},
				events: {
					onToggleDownload: function() {
						console.log('onToggleDownload')
						const $i = $(this).find('i')
						const panel = $(this).siblings('.downloadItems')
						if ($i.hasClass('fa-caret-right')) {
							$i.removeClass('fa-caret-right').addClass('fa-caret-down')
							panel.slideDown()
						}
						else {
							$i.removeClass('fa-caret-down').addClass('fa-caret-right')						
							panel.slideUp()
						}
	
					},
					onPathItem: function (ev) {
						const pathItem = $(this).data('info')
						console.log('onPathItem', pathItem)
						ev.preventDefault()

						loadData(pathItem == '' ? '/' : '/' + pathItem + '/')
					},
					onReload: function (ev) {
						loadData()
					},

					onContextMenu: async function (ev, data) {
						const idx = $(this).closest('.thumbnail').index()
						const info = ctrl.model.files[idx]
						const { cmd } = data

						const { rootDir } = ctrl.model

						if (cmd == 'download') {
							const url = srvFiles.fileUrl(rootDir + info.name)
							$$.util.downloadUrl(url, info.name)
						}

						if (cmd == 'rename') {
							rename(info, idx)
						}

						if (cmd == 'makeResizedCopy') {
							makeResizedCopy(info, idx)
						}

						if (cmd == 'convertToMP3') {
							convertToMP3(info, idx)
						}

						if (cmd == 'zipFolder') {
							zipFolder(info, idx)
						}

						if (cmd == 'delete') {
							const { name, folder } = info
							deleteFiles([{ fileName: rootDir + name, idx, folder }])
						}


					},

					onFileClick: function (ev) {
						const idx = $(this).closest('.thumbnail').index()
						const info = ctrl.model.getFiles()[idx]

						ev.stopPropagation()
						const data = {
							fileName: info.name,
							rootDir: ctrl.model.rootDir,
							isImage: info.isImage
						}

						elt.trigger('fileclick', data)
					},
					onCheckClick: function (ev) {
						const idx = $(this).closest('.thumbnail').index()
						const info = ctrl.model.getFiles()[idx]

						if (info.name == 'share' && ctrl.model.rootDir == '/') {
							ctrl.model.isShareSelected = $(this).getValue()
						}

						ctrl.setData({ nbSelection: getNbSelFiles() })
					},
					onFolderClick: function (ev) {

						const idx = $(this).closest('.thumbnail').index()
						const info = ctrl.model.getFiles()[idx]

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
					onCreateFolder: async function () {
						var rootDir = ctrl.model.rootDir
						const folderName = await $$.ui.showPrompt({
							label: 'Folder name:',
							title: 'New Folder'
						})
						console.log('folderName', folderName)
						if (folderName == null) return

						try {
							const resp = await srvFiles.mkdir(rootDir + folderName)
							console.log('resp', resp)
							insertFile(resp)
						}
						catch (resp) {
							console.log('resp', resp)
							$$.ui.showAlert({
								content: resp.responseText,
								title: 'Error'
							})
						}
					},
					onTogleSelection: function () {
						toggleSelection()
						ctrl.setData({ nbSelection: getNbSelFiles() })
					},

					onDeleteFiles: function (ev) {

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
					onCutFiles: function (ev) {
						console.log('onCutFiles')
						ctrl.setData({
							selectedFiles: getSelFiles(),
							operation: 'cut'
						})
					},

					onCopyFiles: function (ev) {
						console.log('onCopyFiles')
						ctrl.setData({
							selectedFiles: getSelFiles(),
							operation: 'copy'
						})

					},

					onShareFiles: async function (ev) {
						console.log('onShareFiles')
						try {
							const resp = await srvFiles.shareFiles(getSelFiles())
							console.log('resp', resp)
							ctrl.setData({ selectedFiles: [], operation: 'none' })
							loadData()
						}
						catch (resp) {
							console.log('resp', resp)
							//ctrl.setData({selectedFiles: [], operation: 'none'})
							$$.ui.showAlert({
								content: resp.responseText,
								title: 'Error'
							})
						}
					},

					onPasteFiles: async function (ev) {
						console.log('onPasteFiles')
						const { rootDir, selectedFiles, operation } = ctrl.model

						let resp = ''
						try {
							if (operation == 'copy') {
								resp = await srvFiles.copyFiles(selectedFiles, rootDir)
							}
							else {
								resp = await srvFiles.moveFiles(selectedFiles, rootDir)
							}
							console.log('resp', resp)
							ctrl.setData({ selectedFiles: [], operation: 'none' })
							loadData()
						}
						catch (resp) {
							console.log('resp', resp)
							//ctrl.setData({selectedFiles: [], operation: 'none'})
							$$.ui.showAlert({
								content: resp.responseText,
								title: 'Error'
							})
						}
					},
					onImportFile: function (ev) {

						$$.util.openFileDialog(async function (file) {
							//console.log('fileSize', file.size / 1024)
							console.log('Download file:', file.name)
							// if (file.size > maxUploadSize) {
							// 	$$.ui.showAlert({ content: 'File too big', title: 'Import file' })
							// 	return
							// }
							try {
								const data = {
									fileName: file.name, 
									percentage: 0
								}

								const {downloads, rootDir} = ctrl.model
								downloads.push(data)
								ctrl.updateNode('downloads, hasDownloads')

								await srvFiles.uploadFile(file, file.name, ctrl.model.rootDir, function(evt) {
									if (evt.lengthComputable) {
										const percentComplete = evt.loaded / evt.total
										//console.log('percentComplete', percentComplete)
										data.percentage = percentComplete
										ctrl.updateNode('downloads')

									  }
								})
								console.log('Download Finished: ', data.fileName)
								const idx = downloads.indexOf(data)
								downloads.splice(idx, 1)
								ctrl.updateNode('downloads, hasDownloads')
								const fileInfo = await srvFiles.fileInfo(rootDir + data.fileName)
								insertFile(fileInfo)
							}
							catch (resp) {
								console.log('resp', resp)
								$$.ui.showAlert({ content: resp.responseText, title: 'Error' })
							}

						})

					}
				}

			})

			function deleteFiles(fileNames) {
				console.log('deleteFiles', fileNames)
				$$.ui.showConfirm({
					content: 'Are you sure ?',
					title: 'Delete files'
				}, async function () {
					try {
						const resp = await srvFiles.removeFiles(fileNames.map((i) => i.fileName))
						console.log('resp', resp)
						//loadData()	
						fileNames.reverse().forEach((i) => {
							ctrl.removeArrayItem('files', i.idx, 'files')
						})
						ctrl.updateNode('info')
						console.log('files', ctrl.model.files)
					}
					catch (resp) {
						console.log('resp', resp)
						$$.ui.showAlert({
							content: resp.responseText,
							title: 'Error'
						})
					}
				})
			}


			async function loadData(rootDir, resetFilters) {
				if (rootDir == undefined) {
					rootDir = ctrl.model.rootDir
				}
				console.log('loadData', rootDir)
				ctrl.setData({loading: true})
				const files = await srvFiles.list(rootDir, { filterExtension, imageOnly, getMP3Info }, friendUser)
				//console.log('files', files)


				if (rootDir != '/') {
					files.unshift({ name: '..', folder: true })
				}

				sortFiles(files)

				if (resetFilters !== false) {
					ctrl.model.mp3Filters = null
				}


				ctrl.setData({
					loading: false,
					files,
					rootDir,
					nbSelection: 0,
					isShareSelected: false
				})

			}

			async function zipFolder(info, idx) {
				try {
					const resp = await srvFiles.zipFolder(ctrl.model.rootDir, info.name)
					//console.log('resp', resp)
					ctrl.insertArrayItemAfter('files', idx, resp, 'files')
					console.log('files', ctrl.model.files)
					ctrl.updateNode('info')

				}
				catch (resp) {
					console.log('resp', resp)
					$$.ui.showAlert({
						content: resp.responseText,
						title: 'Error'
					})
				}
			}

			async function convertToMP3(info, idx) {
				try {
					const resp = await srvFiles.convertToMP3(ctrl.model.rootDir, info.name)
					//console.log('resp', resp)
					ctrl.insertArrayItemAfter('files', idx, resp, 'files')
					ctrl.updateNode('info')
					console.log('files', ctrl.model.files)

				}
				catch (resp) {
					console.log('resp', resp)
					$$.ui.showAlert({
						content: resp.responseText,
						title: 'Error'
					})
				}
			}

			async function makeResizedCopy(info, idx) {
				const percentage = await $$.ui.showPrompt({
					label: 'Rescale percentage:',
					title: 'Make resized copy',
					attrs: { min: 10, max: 90, type: 'number' },
					value: 50
				})

				if (percentage != null) {
					const { rootDir } = ctrl.model
					try {
						const resp = await srvFiles.resizeImage(rootDir, info.name, percentage + '%')
						//console.log('resp', resp)
						ctrl.insertArrayItemAfter('files', idx, resp, 'files')
						console.log('files', ctrl.model.files)
						ctrl.updateNode('info')

					}
					catch (resp) {
						console.log('resp', resp)
						$$.ui.showAlert({
							content: resp.responseText,
							title: 'Error'
						})
					}
				}

			}

			async function rename(info, idx) {
				const oldFileName = info.name
				const newFileName = await $$.ui.showPrompt({ label: 'New name', title: 'Rename', value: oldFileName })
				console.log('newFileName', newFileName)
				if (newFileName != null && newFileName != oldFileName) {
					try {
						const resp = await srvFiles.renameFile(ctrl.model.rootDir, oldFileName, newFileName)
						//console.log('resp', resp)
						ctrl.updateArrayItem('files', idx, resp, 'files')
						console.log('files', ctrl.model.files)
					}
					catch (resp) {
						console.log('resp', resp)
						$$.ui.showAlert({
							content: resp.responseText,
							title: 'Error'
						})

					}
				}
			}

			loadData()

			function insertFile(fileInfo) {
				let idx = ctrl.model.getFiles().filter((f) => f.folder).length
				//console.log('idx', idx)
				ctrl.insertArrayItemAfter('files', idx - 1, fileInfo, 'files')
				console.log('files', ctrl.model.files)
				ctrl.updateNode('info')

			}

			this.getFiles = function () {
				return ctrl.model.files.filter((f) => !f.folder)
			}

			this.getFilteredFiles = function () {
				return ctrl.model.getFiles().filter((f) => !f.folder)
			}

			this.update = function () {
				//console.log('[FileCtrl] update')
				loadData(undefined, false)
			}

			this.updateFile = async function (fileName, options) {
				const { files, rootDir } = ctrl.model
				let idx = ctrl.model.getFiles().findIndex((i) => i.name == fileName)
				//console.log('[FileCtrl] updateFile', idx, fileName, options)
				const info = await srvFiles.fileInfo(rootDir + fileName, friendUser, options)
				ctrl.updateArrayItem('files', idx, info)
				idx = files.findIndex((i) => i.name == fileName)
				files[idx] = info
				//console.log('files', files)
			}

			this.setMP3Filters = function (mp3Filters) {
				ctrl.setData({ mp3Filters })
			}

			this.getMP3Filters = function () {
				return ctrl.model.mp3Filters
			}
		},

		$iface: 'update()',
		$events: 'fileclick'

	});

})();
