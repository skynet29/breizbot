//@ts-check
$$.control.registerControl('rootPage', {

	template: { gulp_inject: './main.html' },

	deps: ['breizbot.pager', 'breizbot.files', 'app.folder', 'breizbot.broker', 'breizbot.scheduler'],

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 * @param {Breizbot.Services.Files.Interface} srvFiles 
	 * @param {AppFolder.Interface} folder 
	 * @param {Breizbot.Services.Broker.Interface} broker 
	 * @param {Breizbot.Services.Scheduler.Interface} scheduler
	 */
	init: function (elt, pager, srvFiles, folder, broker, scheduler) {

		const progressDlg = $$.ui.progressDialog()

		let sharingGroups = []

		function getViewerType(fileName) {
			let type = $$.file.getFileType(fileName)
			if (fileName.endsWith('.hdoc')) {
				type = 'hdoc'
			}
			return type
		}

		const ctrl = $$.viewController(elt, {
			data: {
				operation: 'none',
				nbSelection: 0,
				isShareSelected: false,
				isMobileDevice: false,
				selectedFiles: [],
				rootDir: '/',
				prop1: function () {
					return { disabled: this.nbSelection == 0 }
				},
				canShare: function () {
					return { disabled: this.nbSelection == 0 || this.rootDir.startsWith('/share/') || this.isShareSelected }
				},

				getShareGroups: function () {
					return function () {
						const items = {
							$add: { name: 'add to new folder' }
						}
						if (sharingGroups.length != 0) {
							items.sep = '----'
							sharingGroups.forEach((name) => {
								items[name] = { name }
							})
						}
						return items

					}
				},
				downloads: [],
				hasDownloads: function () {
					return this.downloads.length > 0
				},
				canPaste: function () {
					return { disabled: this.selectedFiles.length == 0 }
				},
				getItems: function () {

					/**@param {Breizbot.Services.Files.FileInfo} info */
					return function (info) {
						//console.log('getItems', info)
						const { name, folder, isImage } = info
						const ret = {}
						ret.delete = { name: 'Delete', icon: 'fas fa-trash' }
						ret.rename = { name: 'Rename', icon: 'fas fa-i-cursor' }
						if (isImage) {
							ret.makeResizedCopy = { name: 'Make resized copy', icon: 'fas fa-compress-arrows-alt' }
						}
						if (!folder) {

							const type = getViewerType(name)
							if (type) {
								ret.open = { name: 'Open in viewer', icon: 'fas fa-search' }
							}

							if (type == 'hdoc') {
								ret.edit = { name: 'Open in editor', icon: 'fas fa-edit' }
							}


							ret.download = { name: 'Download', icon: 'fas fa-upload' }

							if (name.endsWith('.zip')) {
								ret.unzipFile = { name: 'Unzip File', icon: 'fas fa-expand-alt' }
							}

							else if (name.toLowerCase().endsWith('.mp4')) {
								ret.convertToMP3 = { name: 'Convert to MP3' }
							}
						}
						else {
							ret.zipFolder = { name: 'Zip Folder', icon: 'fas fa-compress' }
						}

						return ret
					}

				},



			},
			events: {
				onImportUrl: async function () {
					//console.log('onImportUrl')
					const url = await $$.ui.showPrompt({ title: 'Inport URL', label: 'URL', attrs: { type: 'url' } })
					if (url != null) {
						progressDlg.setPercentage(0)
						progressDlg.show('Downloading...')
						const resp = await folder.importUrl(ctrl.model.rootDir, url)
						//console.log('resp', resp)

						async function onProgress(msg) {
							if (msg.hist == true) {
								return
							}
							const { percent } = msg.data
							//console.log('progress', percent)
							progressDlg.setPercentage(percent / 100)
							if (Math.floor(percent) == 100) {
								await $$.util.wait(500)
								progressDlg.hide()
								const info = await srvFiles.fileInfo(resp.outFileName)
								//console.log('info', info)
								files.insertFile(info)
								broker.offTopic('breizbot.importUrl.progress', onProgress)
							}
						}

						broker.onTopic('breizbot.importUrl.progress', onProgress)



					}



				},

				/**
				 * 
				 * @param {Breizbot.Controls.Files.EventData.ContextMenuItem} data 
				 */
				onContextMenu: async function (ev, data) {
					//console.log('onContextMenu', data)
					const { rootDir, name, idx, cmd } = data
					switch (cmd) {
						case 'rename':
							rename(data)
							break
						case 'makeResizedCopy':
							makeResizedCopy(data)
							break;
						case 'convertToMP3':
							convertToMP3(data)
							break
						case 'zipFolder':
							zipFolder(data)
							break
						case 'unzipFile':
							unzipFile(data)
							break
						case 'delete':
							deleteFiles([{ fileName: rootDir + name, idx }])
							break
						case 'download':
							download(data)
							break
						case 'open':
							scheduler.openApp('viewer', {
								type: getViewerType(name),
								url: srvFiles.fileUrl(rootDir + name),
							}, name)
							break
						case 'edit':
							scheduler.openApp('editor', {
								rootDir,
								fileName: name
							})
							break
					}

				},
				/**
				 * 
				 * @param {Breizbot.Controls.Files.EventData.DirChange} data 
				 */
				onDirChange: function (ev, data) {
					//console.log('onDirChange', data)
					ctrl.setData({ rootDir: data.newDir, nbSelection: 0 })
				},

				/**
				 * 
				 * @param {Breizbot.Controls.Files.EventData.FileClick} data 
				 */
				onFileClick: function (ev, data) {
					//console.log('onFileClick', data)
					const { fileName, rootDir } = data
					const fullName = rootDir + fileName

					const type = getViewerType(fileName)

					if (type != undefined) {
						pager.pushPage('breizbot.viewer', {
							title: fileName,
							props: {
								type,
								url: srvFiles.fileUrl(fullName)
							}
						})
					}

				},
				onToggleSelection: function () {
					files.toggleSelection()
					ctrl.setData({ nbSelection: files.getNbSelFiles() })
				},

				/**
				 * 
				 * @param {Breizbot.Controls.Files.EventData.SelChange} data 
				 */
				onSelChange: function (ev, data) {
					//console.log('onSelChange', data)
					const { isShareSelected } = data

					ctrl.setData({ nbSelection: files.getNbSelFiles(), isShareSelected })

				},

				/**
				 * 
				 * @param {Brainjs.Controls.ContextMenu.EventData.ContextMenuChange} data 
				 */
				onToolbarContextMenu: function (ev, data) {
					//console.log('onToolbarContextMenu', data)
					elt.find(`button[data-cmd=${data.cmd}]`).click()
				},
				onToggleDownload: function () {
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

				onCreateFolder: async function () {
					const rootDir = files.getRootDir()
					console.log('onCreateFolder', rootDir)
					const folderName = await $$.ui.showPrompt({
						label: 'Folder name:',
						title: 'New Folder'
					})
					console.log('folderName', folderName)
					if (folderName == null) return

					try {
						const resp = await folder.mkdir(rootDir + folderName)
						console.log('resp', resp)
						files.insertFile(resp)
					}
					catch (resp) {
						console.log('resp', resp)
						$$.ui.showAlert({
							content: resp.responseText,
							title: 'Error'
						})
					}
				},

				onCopyFiles: function (ev) {
					const selectedFiles = files.getSelFileNames()
					//console.log('onCopyFiles', selectedFiles)
					ctrl.setData({
						selectedFiles,
						operation: 'copy'
					})

				},

				onDeleteFiles: function (ev) {

					const selFiles = files.getSelFiles()
					//console.log('onDeleteFiles', selFiles)

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
					const selectedFiles = files.getSelFileNames()
					//console.log('onCutFiles', selectedFiles)
					ctrl.setData({
						selectedFiles,
						operation: 'cut'
					})
				},

				onPasteFiles: async function (ev) {
					const { rootDir, selectedFiles, operation } = ctrl.model
					//console.log('onPasteFiles', rootDir)

					try {
						if (operation == 'copy') {
							await folder.copyFiles(selectedFiles, rootDir)
						}
						else {
							await folder.moveFiles(selectedFiles, rootDir)
						}
						reload()
					}
					catch (resp) {
						console.log('resp', resp)
						$$.ui.showAlert({
							content: resp.responseText,
							title: 'Error'
						})
					}
				},

				onReload: function (ev) {
					reload()
				},

				onImportFile: function (ev) {
					$$.ui.openFileDialog((files) => {
						console.log('files', files)
						for (const file of files) {
							uploadFile(file)
						}

					}, true)

				},

				onShareSelected: async function (ev, data) {
					console.log('onShareSelected', data)
					let name = data.cmd
					try {
						if (name == '$add') {
							name = await $$.ui.showPrompt({ title: 'Add Group', label: 'Name' })
							if (name != null) {
								await getSharingGroups()
							}
							else {
								return
							}
						}
						const selFiles = files.getSelFileNames()
						await folder.shareFiles(selFiles, name)
						reload()
					}
					catch (resp) {
						console.log('resp', resp)
						//ctrl.setData({selectedFiles: [], operation: 'none'})
						$$.ui.showAlert({
							content: resp.responseText,
							title: 'Error'
						})
					}


				}


			}
		})

		/**@type {Breizbot.Controls.Files.Interface} */
		const files = ctrl.scope.files

		getSharingGroups()

		async function unzipFile(data) {
			const { rootDir, name, idx } = data

			try {
				progressDlg.setPercentage(0)
				progressDlg.show('Unzipping...')
				const resp = await folder.unzipFile(rootDir, name)
				//console.log('resp', resp)
				async function onProgress(msg) {
					if (msg.hist == true) {
						return
					}
					//console.log('progress', msg.data)
					const { percent } = msg.data
					progressDlg.setPercentage(percent / 100)
					if (Math.floor(percent) == 100) {
						await $$.util.wait(500)
						progressDlg.hide()
						broker.offTopic('breizbot.unzip.progress', onProgress)

						files.reload()
					}
				}
				broker.onTopic('breizbot.unzip.progress', onProgress)


			}
			catch (resp) {
				console.log('resp', resp)
				$$.ui.showAlert({
					content: resp.responseText,
					title: 'Error'
				})
			}
		}

		function download(data) {
			const { rootDir, name } = data

			const url = srvFiles.fileUrl(rootDir + name)
			$$.url.downloadUrl(url, name)
		}

		async function zipFolder(data) {
			const { rootDir, name, idx } = data

			try {
				progressDlg.setPercentage(0)
				progressDlg.show('Zipping...')
				const resp = await folder.zipFolder(rootDir, name)
				//console.log('resp', resp)
				async function onProgress(msg) {
					if (msg.hist == true) {
						return
					}
					const { percent } = msg.data
					//console.log('progress', percent)
					progressDlg.setPercentage(percent / 100)
					if (Math.floor(percent) == 100) {
						await $$.util.wait(500)
						progressDlg.hide()
						const info = await srvFiles.fileInfo(resp.outFileName)
						//console.log('info', info)
						files.insertFile(info, idx)
						broker.offTopic('breizbot.zip.progress', onProgress)
					}
				}

				broker.onTopic('breizbot.zip.progress', onProgress)


			}
			catch (resp) {
				console.log('resp', resp)
				$$.ui.showAlert({
					content: resp.responseText,
					title: 'Error'
				})
			}
		}
		async function makeResizedCopy(data) {
			const { rootDir, name, idx } = data

			const percentage = await $$.ui.showPrompt({
				label: 'Rescale percentage:',
				title: 'Make resized copy',
				attrs: { min: 10, max: 90, type: 'number' },
				value: 50
			})

			if (percentage != null) {
				try {
					const resp = await folder.resizeImage(rootDir, name, percentage + '%')
					//console.log('resp', resp)
					files.insertFile(resp, idx)

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

		async function convertToMP3(data) {
			const { rootDir, name, idx } = data

			try {
				progressDlg.setPercentage(0)
				progressDlg.show('Converting...')
				const resp = await folder.convertToMP3(rootDir, name)
				//console.log('resp', resp)

				async function onProgress(msg) {

					if (msg.hist == true) {
						return
					}
					console.log('progress', msg.data)
					const { percent, finish, error } = msg.data
					if (error) {
						progressDlg.hide()
						broker.offTopic('breizbot.mp3.progress', onProgress)
						$$.ui.showAlert({ title: 'Error', content: error })

					}
					else if (finish === true) {
						await $$.util.wait(500)
						progressDlg.hide()
						const info = await srvFiles.fileInfo(resp.outFileName)
						//console.log('info', info)
						files.insertFile(info, idx)
						broker.offTopic('breizbot.mp3.progress', onProgress)
					}
					else {
						progressDlg.setPercentage(percent / 100)
					}
				}
				broker.onTopic('breizbot.mp3.progress', onProgress)


			}
			catch (resp) {
				console.log('resp', resp)
				$$.ui.showAlert({
					content: resp.responseText,
					title: 'Error'
				})
			}
		}

		async function rename(data) {
			const { rootDir, name, idx } = data

			const oldFileName = name
			const newFileName = await $$.ui.showPrompt({ label: 'New name', title: 'Rename', value: oldFileName })
			console.log('newFileName', newFileName)
			if (newFileName != null && newFileName != oldFileName) {
				try {
					const resp = await folder.renameFile(rootDir, oldFileName, newFileName)
					//console.log('resp', resp)
					files.updateFile(idx, resp)
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

		function reload() {
			ctrl.setData({ selectedFiles: [], operation: 'none', nbSelection: 0 })
			files.reload()
		}

		async function getSharingGroups() {
			sharingGroups = await srvFiles.list('/share', { folderOnly: true })
			sharingGroups = sharingGroups.map((f) => f.name)
			//console.log('sharingGroups', sharingGroups)
		}

		/**
		 * 
		 * @param {File} file 
		 */
		async function uploadFile(file) {
			try {
				const data = {
					fileName: file.name,
					percentage: 0
				}

				const { downloads, rootDir } = ctrl.model
				downloads.push(data)
				ctrl.updateNodeTree('downloads')
				console.log('uploadFile', rootDir, file.name)

				await srvFiles.uploadFile(file, file.name, rootDir, false, function (percentComplete) {
					data.percentage = percentComplete
					ctrl.updateNodeTree('downloads')
				})
				console.log('Download Finished: ', data.fileName)
				const idx = downloads.indexOf(data)
				downloads.splice(idx, 1)
				ctrl.updateNodeTree('downloads')
				const fileInfo = await srvFiles.fileInfo(rootDir + data.fileName)
				files.insertFile(fileInfo)
			}
			catch (resp) {
				console.log('resp', resp)
				$$.ui.showAlert({ content: resp.responseText, title: 'Error' })
			}

		}

		/**
		 * @param {Breizbot.Controls.Files.FileDesc[]} fileNames
		 */
		function deleteFiles(fileNames) {
			//console.log('deleteFiles', fileNames)
			$$.ui.showConfirm({
				content: 'Are you sure ?',
				title: 'Delete files'
			}, async function () {
				try {
					const resp = await folder.removeFiles(fileNames.map((i) => i.fileName))
					console.log('resp', resp)
					files.removeFiles(fileNames.map((i) => i.idx))
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

		const resizeObserver = new ResizeObserver(entries => {
			ctrl.model.isMobileDevice = $$.util.isMobileDevice()
			ctrl.updateNodeTree('toolbar')
		})

		resizeObserver.observe(elt.get(0));



	}
});




