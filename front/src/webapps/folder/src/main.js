$$.control.registerControl('rootPage', {

	template: { gulp_inject: './main.html' },

	deps: ['breizbot.pager', 'breizbot.files', 'breizbot.users', 'app.folder', 'breizbot.broker'],


	init: function (elt, pager, srvFiles, users, folder, broker) {

		const progressDlg = $$.ui.progressDialog()

		let sharingGroups = []

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
							$add: { name: 'add to new group' }
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

					return function (info) {
						//console.log('getItems', info)
						const { name, folder, isImage } = info
						const ret = {}
						if (name != '..') {
							ret.delete = { name: 'Delete', icon: 'fas fa-trash' }
							ret.rename = { name: 'Rename', icon: 'fas fa-i-cursor' }
							if (isImage) {
								ret.makeResizedCopy = { name: 'Make resized copy', icon: 'fas fa-compress-arrows-alt' }
							}
							if (!folder) {
								ret.download = { name: 'Download', icon: 'fas fa-download' }
							}
							if (name.toLowerCase().endsWith('.mp4')) {
								ret.convertToMP3 = { name: 'Convert to MP3' }
							}
							if (folder) {
								ret.zipFolder = { name: 'Zip Folder', icon: 'fas fa-compress' }
							}
							if (!folder && name.endsWith('.zip')) {
								ret.unzipFile = { name: 'Unzip File', icon: 'fas fa-expand-alt' }
							}

						}
						return ret
					}

				},



			},
			events: {
				onContextMenu: async function (ev, data) {
					//console.log('onContextMenu', data)
					const { rootDir, name, idx, cmd } = data
					if (cmd == 'download') {
						const url = srvFiles.fileUrl(rootDir + name)
						$$.util.downloadUrl(url, name)
					}

					if (cmd == 'rename') {
						const oldFileName = name
						const newFileName = await $$.ui.showPrompt({ label: 'New name', title: 'Rename', value: oldFileName })
						console.log('newFileName', newFileName)
						if (newFileName != null && newFileName != oldFileName) {
							try {
								const resp = await folder.renameFile(rootDir, oldFileName, newFileName)
								//console.log('resp', resp)
								ctrl.scope.files.updateFile(idx, resp)
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

					if (cmd == 'makeResizedCopy') {
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
								ctrl.scope.files.insertFile(resp, idx)

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

					if (cmd == 'convertToMP3') {
						try {
							progressDlg.setPercentage(0)
							progressDlg.show('Converting...')
							const resp = await folder.convertToMP3(rootDir, name)
							//console.log('resp', resp)
							broker.onTopic('breizbot.mp3.progress', async (msg) => {
								if (msg.hist == true) {
									return
								}
								//console.log('progress', msg.data)
								const { percent } = msg.data
								progressDlg.setPercentage(percent / 100)
								if (Math.floor(percent) == 100) {
									await $$.util.wait(500)
									progressDlg.hide()
									const info = await srvFiles.fileInfo(resp.outFileName)
									//console.log('info', info)
									ctrl.scope.files.insertFile(info, idx)
								}
							})

						}
						catch (resp) {
							console.log('resp', resp)
							$$.ui.showAlert({
								content: resp.responseText,
								title: 'Error'
							})
						}
					}

					if (cmd == 'zipFolder') {
						try {
							const resp = await folder.zipFolder(rootDir, name)
							//console.log('resp', resp)
							ctrl.scope.files.insertFile(resp, idx)
						}
						catch (resp) {
							console.log('resp', resp)
							$$.ui.showAlert({
								content: resp.responseText,
								title: 'Error'
							})
						}
					}

					if (cmd == 'unzipFile') {
						try {
							progressDlg.setPercentage(0)
							progressDlg.show('Unzipping...')
							const resp = await folder.unzipFile(rootDir, name)
							//console.log('resp', resp)
							broker.onTopic('breizbot.unzip.progress', async (msg) => {
								if (msg.hist == true) {
									return
								}
								//console.log('progress', msg.data)
								const { percent } = msg.data
								progressDlg.setPercentage(percent / 100)
								if (Math.floor(percent) == 100) {
									await $$.util.wait(500)
									progressDlg.hide()
									ctrl.scope.files.reload()
								}
							})

						}
						catch (resp) {
							console.log('resp', resp)
							$$.ui.showAlert({
								content: resp.responseText,
								title: 'Error'
							})
						}
					}

					if (cmd == 'delete') {
						deleteFiles([{ fileName: rootDir + name, idx }])
					}



				},
				onDirChange: function (ev, data) {
					//console.log('onDirChange', data)
					ctrl.setData({ rootDir: data.newDir, nbSelection: 0 })
				},
				onFileClick: function (ev, data) {
					//console.log('onFileClick', data)
					const { fileName, rootDir } = data
					const fullName = rootDir + fileName

					const type = $$.util.getFileType(fileName)
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
					ctrl.scope.files.toggleSelection()
					ctrl.setData({ nbSelection: ctrl.scope.files.getNbSelFiles() })
				},
				onSelChange: function (ev, data) {
					//console.log('onSelChange', data)
					const { isShareSelected } = data

					ctrl.setData({ nbSelection: ctrl.scope.files.getNbSelFiles(), isShareSelected })

				},
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
					var rootDir = ctrl.scope.files.getRootDir()
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
						ctrl.scope.files.insertFile(resp)
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
					const selectedFiles = ctrl.scope.files.getSelFileNames()
					console.log('onCopyFiles', selectedFiles)
					ctrl.setData({
						selectedFiles,
						operation: 'copy'
					})

				},

				onDeleteFiles: function (ev) {

					const selFiles = ctrl.scope.files.getSelFiles()
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
					const selectedFiles = ctrl.scope.files.getSelFileNames()
					console.log('onCutFiles', selectedFiles)
					ctrl.setData({
						selectedFiles,
						operation: 'cut'
					})
				},

				onPasteFiles: async function (ev) {
					console.log('onPasteFiles')
					const { rootDir, selectedFiles, operation } = ctrl.model

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
					$$.util.openFileDialog((files) => {
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
								await users.addSharingGroup(name)
								await getSharingGroups()
							}
							else {
								return
							}
						}
						const selFiles = ctrl.scope.files.getSelFileNames()
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

		getSharingGroups()

		function reload() {
			ctrl.setData({ selectedFiles: [], operation: 'none', nbSelection: 0 })
			ctrl.scope.files.reload()
		}

		async function getSharingGroups() {
			sharingGroups = await users.getSharingGroups()
			//console.log('sharingGroups', sharingGroups)
		}

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

				await srvFiles.uploadFile(file, file.name, rootDir, function (percentComplete) {
					data.percentage = percentComplete
					ctrl.updateNodeTree('downloads')
				})
				console.log('Download Finished: ', data.fileName)
				const idx = downloads.indexOf(data)
				downloads.splice(idx, 1)
				ctrl.updateNodeTree('downloads')
				const fileInfo = await srvFiles.fileInfo(rootDir + data.fileName)
				ctrl.scope.files.insertFile(fileInfo)
			}
			catch (resp) {
				console.log('resp', resp)
				$$.ui.showAlert({ content: resp.responseText, title: 'Error' })
			}

		}

		function deleteFiles(fileNames) {
			//console.log('deleteFiles', fileNames)
			$$.ui.showConfirm({
				content: 'Are you sure ?',
				title: 'Delete files'
			}, async function () {
				try {
					const resp = await folder.removeFiles(fileNames.map((i) => i.fileName))
					console.log('resp', resp)
					ctrl.scope.files.removeFiles(fileNames.map((i) => i.idx))
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




