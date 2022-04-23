//@ts-check
$$.control.registerControl('rootPage', {

	template: "<div class=\"toolbar\" bn-bind=\"toolbar\">\n	<div class=\"left\">\n		<div class=\"group\" bn-show=\"!isMobileDevice\">\n			<button \n				class=\"w3-button\" \n				title=\"New folder\" \n				bn-event=\"click: onCreateFolder\" \n				data-cmd=\"newFolder\">\n					<i class=\"fas fa-folder-plus\"></i>\n				</button>\n	\n			<button \n				class=\"w3-button\" \n				title=\"Import file\" \n				data-cmd=\"importFile\"\n				bn-event=\"click: onImportFile\">\n					<i class=\"fa fa-download\"></i>\n				</button>\n\n				<button \n				class=\"w3-button\" \n				title=\"Import url\" \n				data-cmd=\"importUrl\"\n				bn-event=\"click: onImportUrl\">\n					<i class=\"fa fa-cloud-download-alt\"></i>\n				</button>\n\n			<button \n				class=\"w3-button\" \n				title=\"Reload\" \n				data-cmd=\"reload\"\n				bn-event=\"click: onReload\">\n					<i class=\"fa fa-sync-alt\"></i>\n				</button>\n\n			<span class=\"separator\"></span>\n	\n	\n		</div>\n	\n		<div class=\"group\">\n			<button class=\"w3-button\" title=\"Toggle Selection\" bn-event=\"click: onToggleSelection\"><i class=\"fa fa-check\"></i></button>\n			<span class=\"separator\"></span>\n	\n	\n		</div>\n	\n		<div class=\"group\">\n			<button class=\"w3-button\" title=\"Delete\" bn-event=\"click: onDeleteFiles\" bn-prop=\"prop1\"><i class=\"fa fa-trash\"></i></button>\n	\n			<button class=\"w3-button\" title=\"Cut\" bn-prop=\"prop1\" bn-event=\"click: onCutFiles\"><i class=\"fa fa-cut\"></i></button>\n	\n			<button class=\"w3-button\" title=\"Copy\" bn-prop=\"prop1\" bn-event=\"click: onCopyFiles\"><i class=\"fa fa-copy\"></i></button>\n	\n			<button class=\"w3-button\" title=\"Share\" \n				bn-prop=\"canShare\" \n				bn-control=\"brainjs.contextmenu\"\n				bn-data=\"{items: getShareGroups, trigger: \'left\'}\"\n				bn-event=\"contextmenuchange: onShareSelected\"\n			><i class=\"fa fa-share-alt\"></i></button>\n	\n			<button class=\"w3-button\" title=\"Paste\" bn-prop=\"canPaste\" bn-event=\"click: onPasteFiles\"><i class=\"fa fa-paste\"></i></button>\n		</div>\n	\n	\n	</div>\n	<div bn-show=\"isMobileDevice\">\n		<button class=\"w3-button\" title=\"More actions\" \n			bn-control=\"brainjs.contextmenu\"\n			bn-event=\"contextmenuchange: onToolbarContextMenu\"\n			bn-data=\"{\n				trigger: \'left\',\n				items: {\n				 	newFolder: {name: \'New folder\', icon: \'fas fa-folder-plus\'},\n				 	importFile: {name: \'Import file\', icon: \'fas fa-download\'},\n				 	reload: {name: \'Reload\', icon: \'fas fa-sync-alt\'}\n				}\n			}\">\n			<i class=\"fa fa-ellipsis-v\"></i></button>\n\n	</div>\n</div>\n\n<div class=\"download\" bn-show=\"hasDownloads\" bn-bind=\"downloads\">\n	<strong bn-event=\"click: onToggleDownload\"><i class=\"fa fa-caret-down fa-fw\"></i>\n			Uploads</strong>\n	<div bn-each=\"downloads\" class=\"downloadItems\">\n		<div class=\"w3-card w3-padding-small\">\n			<div bn-text=\"$scope.$i.fileName\"></div>\n			<progress max=\"1\" bn-val=\"$scope.$i.percentage\"></progress>\n		</div>\n	</div>\n</div>\n\n<div bn-control=\"breizbot.files\" \n	bn-event=\"fileclick: onFileClick, dirchange: onDirChange, selchange: onSelChange, contextmenuItem: onContextMenu\"\n	bn-iface=\"files\"\n	data-selection-enabled=\"true\"\n	bn-data=\"{menuItems: getItems}\"\n	></div>",

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
			console.log(data)
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





//@ts-check
$$.service.registerService('app.folder', {

    deps: ['breizbot.http', 'breizbot.broker'],

    /**
     * 
     * @param {*} config 
     * @param {Breizbot.Services.Http.Interface} http 
     * @param {Breizbot.Services.Broker.Interface} broker 
     * @returns 
     */
    init: function (config, http, broker) {

		let srcId

		broker.on('ready', (msg) => { srcId = msg.clientId})

        return {
            removeFiles: function (fileNames) {
                console.log('[FileService] removeFiles', fileNames)
                return http.post('/delete', fileNames)
            },

            mkdir: function (fileName) {
                console.log('[FileService] mkdir', fileName)
                return http.post('/mkdir', { fileName })
            },

            moveFiles: function (fileNames, destPath) {
                console.log('[FileService] moveFiles', fileNames, destPath)
                return http.post('/move', { fileNames, destPath })
            },

            shareFiles: function (fileNames, groupName) {
                console.log('[FileService] shareFiles', fileNames)
                return http.post('/move', { fileNames, destPath: `/share/${groupName}` })
            },

            copyFiles: function (fileNames, destPath) {
                console.log('[FileService] copyFiles', fileNames, destPath)
                return http.post('/copy', { fileNames, destPath })
            },

            renameFile: function (filePath, oldFileName, newFileName) {
                console.log('[FileService] renameFile', filePath, oldFileName, newFileName)
                return http.post('/rename', { filePath, oldFileName, newFileName })
            },

            resizeImage: function (filePath, fileName, resizeFormat) {
                console.log('[FileService] resizeImage', filePath, fileName, resizeFormat)
                return http.post('/resizeImage', { filePath, fileName, resizeFormat })
            },

            convertToMP3: function (filePath, fileName) {
                console.log('[FileService] convertToMP3', filePath, fileName)
                return http.post('/convertToMP3', { filePath, fileName, srcId })
            },

            zipFolder: function (folderPath, folderName) {
                console.log('[FileService] zipFolder', folderPath, folderName)
                return http.post('/zipFolder', { folderPath, folderName, srcId })
            },

            unzipFile: function (folderPath, fileName) {
                console.log('[FileService] unzipFile', folderPath, fileName)
                return http.post('/unzipFile', { folderPath, fileName, srcId })
            },

            importUrl: function(folderPath, url) {
                console.log('[FileService] importUrl', folderPath, url)
                return http.post('/importUrl', { folderPath, srcId, url })

            }

        }
    }

});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiLCJzZXJ2aWNlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3RwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJhcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvL0B0cy1jaGVja1xuJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ3Jvb3RQYWdlJywge1xuXG5cdHRlbXBsYXRlOiBcIjxkaXYgY2xhc3M9XFxcInRvb2xiYXJcXFwiIGJuLWJpbmQ9XFxcInRvb2xiYXJcXFwiPlxcblx0PGRpdiBjbGFzcz1cXFwibGVmdFxcXCI+XFxuXHRcdDxkaXYgY2xhc3M9XFxcImdyb3VwXFxcIiBibi1zaG93PVxcXCIhaXNNb2JpbGVEZXZpY2VcXFwiPlxcblx0XHRcdDxidXR0b24gXFxuXHRcdFx0XHRjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiBcXG5cdFx0XHRcdHRpdGxlPVxcXCJOZXcgZm9sZGVyXFxcIiBcXG5cdFx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25DcmVhdGVGb2xkZXJcXFwiIFxcblx0XHRcdFx0ZGF0YS1jbWQ9XFxcIm5ld0ZvbGRlclxcXCI+XFxuXHRcdFx0XHRcdDxpIGNsYXNzPVxcXCJmYXMgZmEtZm9sZGVyLXBsdXNcXFwiPjwvaT5cXG5cdFx0XHRcdDwvYnV0dG9uPlxcblx0XFxuXHRcdFx0PGJ1dHRvbiBcXG5cdFx0XHRcdGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIFxcblx0XHRcdFx0dGl0bGU9XFxcIkltcG9ydCBmaWxlXFxcIiBcXG5cdFx0XHRcdGRhdGEtY21kPVxcXCJpbXBvcnRGaWxlXFxcIlxcblx0XHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvbkltcG9ydEZpbGVcXFwiPlxcblx0XHRcdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtZG93bmxvYWRcXFwiPjwvaT5cXG5cdFx0XHRcdDwvYnV0dG9uPlxcblxcblx0XHRcdFx0PGJ1dHRvbiBcXG5cdFx0XHRcdGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIFxcblx0XHRcdFx0dGl0bGU9XFxcIkltcG9ydCB1cmxcXFwiIFxcblx0XHRcdFx0ZGF0YS1jbWQ9XFxcImltcG9ydFVybFxcXCJcXG5cdFx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25JbXBvcnRVcmxcXFwiPlxcblx0XHRcdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtY2xvdWQtZG93bmxvYWQtYWx0XFxcIj48L2k+XFxuXHRcdFx0XHQ8L2J1dHRvbj5cXG5cXG5cdFx0XHQ8YnV0dG9uIFxcblx0XHRcdFx0Y2xhc3M9XFxcInczLWJ1dHRvblxcXCIgXFxuXHRcdFx0XHR0aXRsZT1cXFwiUmVsb2FkXFxcIiBcXG5cdFx0XHRcdGRhdGEtY21kPVxcXCJyZWxvYWRcXFwiXFxuXHRcdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uUmVsb2FkXFxcIj5cXG5cdFx0XHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLXN5bmMtYWx0XFxcIj48L2k+XFxuXHRcdFx0XHQ8L2J1dHRvbj5cXG5cXG5cdFx0XHQ8c3BhbiBjbGFzcz1cXFwic2VwYXJhdG9yXFxcIj48L3NwYW4+XFxuXHRcXG5cdFxcblx0XHQ8L2Rpdj5cXG5cdFxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJncm91cFxcXCI+XFxuXHRcdFx0PGJ1dHRvbiBjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiB0aXRsZT1cXFwiVG9nZ2xlIFNlbGVjdGlvblxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvblRvZ2dsZVNlbGVjdGlvblxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLWNoZWNrXFxcIj48L2k+PC9idXR0b24+XFxuXHRcdFx0PHNwYW4gY2xhc3M9XFxcInNlcGFyYXRvclxcXCI+PC9zcGFuPlxcblx0XFxuXHRcXG5cdFx0PC9kaXY+XFxuXHRcXG5cdFx0PGRpdiBjbGFzcz1cXFwiZ3JvdXBcXFwiPlxcblx0XHRcdDxidXR0b24gY2xhc3M9XFxcInczLWJ1dHRvblxcXCIgdGl0bGU9XFxcIkRlbGV0ZVxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvbkRlbGV0ZUZpbGVzXFxcIiBibi1wcm9wPVxcXCJwcm9wMVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXRyYXNoXFxcIj48L2k+PC9idXR0b24+XFxuXHRcXG5cdFx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIHRpdGxlPVxcXCJDdXRcXFwiIGJuLXByb3A9XFxcInByb3AxXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uQ3V0RmlsZXNcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1jdXRcXFwiPjwvaT48L2J1dHRvbj5cXG5cdFxcblx0XHRcdDxidXR0b24gY2xhc3M9XFxcInczLWJ1dHRvblxcXCIgdGl0bGU9XFxcIkNvcHlcXFwiIGJuLXByb3A9XFxcInByb3AxXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uQ29weUZpbGVzXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtY29weVxcXCI+PC9pPjwvYnV0dG9uPlxcblx0XFxuXHRcdFx0PGJ1dHRvbiBjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiB0aXRsZT1cXFwiU2hhcmVcXFwiIFxcblx0XHRcdFx0Ym4tcHJvcD1cXFwiY2FuU2hhcmVcXFwiIFxcblx0XHRcdFx0Ym4tY29udHJvbD1cXFwiYnJhaW5qcy5jb250ZXh0bWVudVxcXCJcXG5cdFx0XHRcdGJuLWRhdGE9XFxcIntpdGVtczogZ2V0U2hhcmVHcm91cHMsIHRyaWdnZXI6IFxcJ2xlZnRcXCd9XFxcIlxcblx0XHRcdFx0Ym4tZXZlbnQ9XFxcImNvbnRleHRtZW51Y2hhbmdlOiBvblNoYXJlU2VsZWN0ZWRcXFwiXFxuXHRcdFx0PjxpIGNsYXNzPVxcXCJmYSBmYS1zaGFyZS1hbHRcXFwiPjwvaT48L2J1dHRvbj5cXG5cdFxcblx0XHRcdDxidXR0b24gY2xhc3M9XFxcInczLWJ1dHRvblxcXCIgdGl0bGU9XFxcIlBhc3RlXFxcIiBibi1wcm9wPVxcXCJjYW5QYXN0ZVxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvblBhc3RlRmlsZXNcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1wYXN0ZVxcXCI+PC9pPjwvYnV0dG9uPlxcblx0XHQ8L2Rpdj5cXG5cdFxcblx0XFxuXHQ8L2Rpdj5cXG5cdDxkaXYgYm4tc2hvdz1cXFwiaXNNb2JpbGVEZXZpY2VcXFwiPlxcblx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIHRpdGxlPVxcXCJNb3JlIGFjdGlvbnNcXFwiIFxcblx0XHRcdGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29udGV4dG1lbnVcXFwiXFxuXHRcdFx0Ym4tZXZlbnQ9XFxcImNvbnRleHRtZW51Y2hhbmdlOiBvblRvb2xiYXJDb250ZXh0TWVudVxcXCJcXG5cdFx0XHRibi1kYXRhPVxcXCJ7XFxuXHRcdFx0XHR0cmlnZ2VyOiBcXCdsZWZ0XFwnLFxcblx0XHRcdFx0aXRlbXM6IHtcXG5cdFx0XHRcdCBcdG5ld0ZvbGRlcjoge25hbWU6IFxcJ05ldyBmb2xkZXJcXCcsIGljb246IFxcJ2ZhcyBmYS1mb2xkZXItcGx1c1xcJ30sXFxuXHRcdFx0XHQgXHRpbXBvcnRGaWxlOiB7bmFtZTogXFwnSW1wb3J0IGZpbGVcXCcsIGljb246IFxcJ2ZhcyBmYS1kb3dubG9hZFxcJ30sXFxuXHRcdFx0XHQgXHRyZWxvYWQ6IHtuYW1lOiBcXCdSZWxvYWRcXCcsIGljb246IFxcJ2ZhcyBmYS1zeW5jLWFsdFxcJ31cXG5cdFx0XHRcdH1cXG5cdFx0XHR9XFxcIj5cXG5cdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtZWxsaXBzaXMtdlxcXCI+PC9pPjwvYnV0dG9uPlxcblxcblx0PC9kaXY+XFxuPC9kaXY+XFxuXFxuPGRpdiBjbGFzcz1cXFwiZG93bmxvYWRcXFwiIGJuLXNob3c9XFxcImhhc0Rvd25sb2Fkc1xcXCIgYm4tYmluZD1cXFwiZG93bmxvYWRzXFxcIj5cXG5cdDxzdHJvbmcgYm4tZXZlbnQ9XFxcImNsaWNrOiBvblRvZ2dsZURvd25sb2FkXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtY2FyZXQtZG93biBmYS1md1xcXCI+PC9pPlxcblx0XHRcdFVwbG9hZHM8L3N0cm9uZz5cXG5cdDxkaXYgYm4tZWFjaD1cXFwiZG93bmxvYWRzXFxcIiBjbGFzcz1cXFwiZG93bmxvYWRJdGVtc1xcXCI+XFxuXHRcdDxkaXYgY2xhc3M9XFxcInczLWNhcmQgdzMtcGFkZGluZy1zbWFsbFxcXCI+XFxuXHRcdFx0PGRpdiBibi10ZXh0PVxcXCIkc2NvcGUuJGkuZmlsZU5hbWVcXFwiPjwvZGl2Plxcblx0XHRcdDxwcm9ncmVzcyBtYXg9XFxcIjFcXFwiIGJuLXZhbD1cXFwiJHNjb3BlLiRpLnBlcmNlbnRhZ2VcXFwiPjwvcHJvZ3Jlc3M+XFxuXHRcdDwvZGl2Plxcblx0PC9kaXY+XFxuPC9kaXY+XFxuXFxuPGRpdiBibi1jb250cm9sPVxcXCJicmVpemJvdC5maWxlc1xcXCIgXFxuXHRibi1ldmVudD1cXFwiZmlsZWNsaWNrOiBvbkZpbGVDbGljaywgZGlyY2hhbmdlOiBvbkRpckNoYW5nZSwgc2VsY2hhbmdlOiBvblNlbENoYW5nZSwgY29udGV4dG1lbnVJdGVtOiBvbkNvbnRleHRNZW51XFxcIlxcblx0Ym4taWZhY2U9XFxcImZpbGVzXFxcIlxcblx0ZGF0YS1zZWxlY3Rpb24tZW5hYmxlZD1cXFwidHJ1ZVxcXCJcXG5cdGJuLWRhdGE9XFxcInttZW51SXRlbXM6IGdldEl0ZW1zfVxcXCJcXG5cdD48L2Rpdj5cIixcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LnBhZ2VyJywgJ2JyZWl6Ym90LmZpbGVzJywgJ2FwcC5mb2xkZXInLCAnYnJlaXpib3QuYnJva2VyJywgJ2JyZWl6Ym90LnNjaGVkdWxlciddLFxuXG5cdC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5QYWdlci5JbnRlcmZhY2V9IHBhZ2VyIFxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLkZpbGVzLkludGVyZmFjZX0gc3J2RmlsZXMgXG5cdCAqIEBwYXJhbSB7QXBwRm9sZGVyLkludGVyZmFjZX0gZm9sZGVyIFxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLkJyb2tlci5JbnRlcmZhY2V9IGJyb2tlciBcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5TY2hlZHVsZXIuSW50ZXJmYWNlfSBzY2hlZHVsZXJcblx0ICovXG5cdGluaXQ6IGZ1bmN0aW9uIChlbHQsIHBhZ2VyLCBzcnZGaWxlcywgZm9sZGVyLCBicm9rZXIsIHNjaGVkdWxlcikge1xuXG5cdFx0Y29uc3QgcHJvZ3Jlc3NEbGcgPSAkJC51aS5wcm9ncmVzc0RpYWxvZygpXG5cblx0XHRsZXQgc2hhcmluZ0dyb3VwcyA9IFtdXG5cblx0XHRmdW5jdGlvbiBnZXRWaWV3ZXJUeXBlKGZpbGVOYW1lKSB7XG5cdFx0XHRsZXQgdHlwZSA9ICQkLmZpbGUuZ2V0RmlsZVR5cGUoZmlsZU5hbWUpXG5cdFx0XHRpZiAoZmlsZU5hbWUuZW5kc1dpdGgoJy5oZG9jJykpIHtcblx0XHRcdFx0dHlwZSA9ICdoZG9jJ1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHR5cGVcblx0XHR9XG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdG9wZXJhdGlvbjogJ25vbmUnLFxuXHRcdFx0XHRuYlNlbGVjdGlvbjogMCxcblx0XHRcdFx0aXNTaGFyZVNlbGVjdGVkOiBmYWxzZSxcblx0XHRcdFx0aXNNb2JpbGVEZXZpY2U6IGZhbHNlLFxuXHRcdFx0XHRzZWxlY3RlZEZpbGVzOiBbXSxcblx0XHRcdFx0cm9vdERpcjogJy8nLFxuXHRcdFx0XHRwcm9wMTogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHJldHVybiB7IGRpc2FibGVkOiB0aGlzLm5iU2VsZWN0aW9uID09IDAgfVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRjYW5TaGFyZTogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHJldHVybiB7IGRpc2FibGVkOiB0aGlzLm5iU2VsZWN0aW9uID09IDAgfHwgdGhpcy5yb290RGlyLnN0YXJ0c1dpdGgoJy9zaGFyZS8nKSB8fCB0aGlzLmlzU2hhcmVTZWxlY3RlZCB9XG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0Z2V0U2hhcmVHcm91cHM6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRyZXR1cm4gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0Y29uc3QgaXRlbXMgPSB7XG5cdFx0XHRcdFx0XHRcdCRhZGQ6IHsgbmFtZTogJ2FkZCB0byBuZXcgZm9sZGVyJyB9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRpZiAoc2hhcmluZ0dyb3Vwcy5sZW5ndGggIT0gMCkge1xuXHRcdFx0XHRcdFx0XHRpdGVtcy5zZXAgPSAnLS0tLSdcblx0XHRcdFx0XHRcdFx0c2hhcmluZ0dyb3Vwcy5mb3JFYWNoKChuYW1lKSA9PiB7XG5cdFx0XHRcdFx0XHRcdFx0aXRlbXNbbmFtZV0gPSB7IG5hbWUgfVxuXHRcdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0cmV0dXJuIGl0ZW1zXG5cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdGRvd25sb2FkczogW10sXG5cdFx0XHRcdGhhc0Rvd25sb2FkczogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLmRvd25sb2Fkcy5sZW5ndGggPiAwXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGNhblBhc3RlOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHsgZGlzYWJsZWQ6IHRoaXMuc2VsZWN0ZWRGaWxlcy5sZW5ndGggPT0gMCB9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdGdldEl0ZW1zOiBmdW5jdGlvbiAoKSB7XG5cblx0XHRcdFx0XHQvKipAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLkZpbGVzLkZpbGVJbmZvfSBpbmZvICovXG5cdFx0XHRcdFx0cmV0dXJuIGZ1bmN0aW9uIChpbmZvKSB7XG5cdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdnZXRJdGVtcycsIGluZm8pXG5cdFx0XHRcdFx0XHRjb25zdCB7IG5hbWUsIGZvbGRlciwgaXNJbWFnZSB9ID0gaW5mb1xuXHRcdFx0XHRcdFx0Y29uc3QgcmV0ID0ge31cblx0XHRcdFx0XHRcdHJldC5kZWxldGUgPSB7IG5hbWU6ICdEZWxldGUnLCBpY29uOiAnZmFzIGZhLXRyYXNoJyB9XG5cdFx0XHRcdFx0XHRyZXQucmVuYW1lID0geyBuYW1lOiAnUmVuYW1lJywgaWNvbjogJ2ZhcyBmYS1pLWN1cnNvcicgfVxuXHRcdFx0XHRcdFx0aWYgKGlzSW1hZ2UpIHtcblx0XHRcdFx0XHRcdFx0cmV0Lm1ha2VSZXNpemVkQ29weSA9IHsgbmFtZTogJ01ha2UgcmVzaXplZCBjb3B5JywgaWNvbjogJ2ZhcyBmYS1jb21wcmVzcy1hcnJvd3MtYWx0JyB9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRpZiAoIWZvbGRlcikge1xuXG5cdFx0XHRcdFx0XHRcdGNvbnN0IHR5cGUgPSBnZXRWaWV3ZXJUeXBlKG5hbWUpXG5cdFx0XHRcdFx0XHRcdGlmICh0eXBlKSB7XG5cdFx0XHRcdFx0XHRcdFx0cmV0Lm9wZW4gPSB7IG5hbWU6ICdPcGVuIGluIHZpZXdlcicsIGljb246ICdmYXMgZmEtc2VhcmNoJyB9XG5cdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHRpZiAodHlwZSA9PSAnaGRvYycpIHtcblx0XHRcdFx0XHRcdFx0XHRyZXQuZWRpdCA9IHsgbmFtZTogJ09wZW4gaW4gZWRpdG9yJywgaWNvbjogJ2ZhcyBmYS1lZGl0JyB9XG5cdFx0XHRcdFx0XHRcdH1cblxuXG5cdFx0XHRcdFx0XHRcdHJldC5kb3dubG9hZCA9IHsgbmFtZTogJ0Rvd25sb2FkJywgaWNvbjogJ2ZhcyBmYS11cGxvYWQnIH1cblxuXHRcdFx0XHRcdFx0XHRpZiAobmFtZS5lbmRzV2l0aCgnLnppcCcpKSB7XG5cdFx0XHRcdFx0XHRcdFx0cmV0LnVuemlwRmlsZSA9IHsgbmFtZTogJ1VuemlwIEZpbGUnLCBpY29uOiAnZmFzIGZhLWV4cGFuZC1hbHQnIH1cblx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdGVsc2UgaWYgKG5hbWUudG9Mb3dlckNhc2UoKS5lbmRzV2l0aCgnLm1wNCcpKSB7XG5cdFx0XHRcdFx0XHRcdFx0cmV0LmNvbnZlcnRUb01QMyA9IHsgbmFtZTogJ0NvbnZlcnQgdG8gTVAzJyB9XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRyZXQuemlwRm9sZGVyID0geyBuYW1lOiAnWmlwIEZvbGRlcicsIGljb246ICdmYXMgZmEtY29tcHJlc3MnIH1cblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0cmV0dXJuIHJldFxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHR9LFxuXG5cblxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvbkltcG9ydFVybDogYXN5bmMgZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uSW1wb3J0VXJsJylcblx0XHRcdFx0XHRjb25zdCB1cmwgPSBhd2FpdCAkJC51aS5zaG93UHJvbXB0KHsgdGl0bGU6ICdJbnBvcnQgVVJMJywgbGFiZWw6ICdVUkwnLCBhdHRyczogeyB0eXBlOiAndXJsJyB9IH0pXG5cdFx0XHRcdFx0aWYgKHVybCAhPSBudWxsKSB7XG5cdFx0XHRcdFx0XHRwcm9ncmVzc0RsZy5zZXRQZXJjZW50YWdlKDApXG5cdFx0XHRcdFx0XHRwcm9ncmVzc0RsZy5zaG93KCdEb3dubG9hZGluZy4uLicpXG5cdFx0XHRcdFx0XHRjb25zdCByZXNwID0gYXdhaXQgZm9sZGVyLmltcG9ydFVybChjdHJsLm1vZGVsLnJvb3REaXIsIHVybClcblx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKVxuXG5cdFx0XHRcdFx0XHRhc3luYyBmdW5jdGlvbiBvblByb2dyZXNzKG1zZykge1xuXHRcdFx0XHRcdFx0XHRpZiAobXNnLmhpc3QgPT0gdHJ1ZSkge1xuXHRcdFx0XHRcdFx0XHRcdHJldHVyblxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdGNvbnN0IHsgcGVyY2VudCB9ID0gbXNnLmRhdGFcblx0XHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygncHJvZ3Jlc3MnLCBwZXJjZW50KVxuXHRcdFx0XHRcdFx0XHRwcm9ncmVzc0RsZy5zZXRQZXJjZW50YWdlKHBlcmNlbnQgLyAxMDApXG5cdFx0XHRcdFx0XHRcdGlmIChNYXRoLmZsb29yKHBlcmNlbnQpID09IDEwMCkge1xuXHRcdFx0XHRcdFx0XHRcdGF3YWl0ICQkLnV0aWwud2FpdCg1MDApXG5cdFx0XHRcdFx0XHRcdFx0cHJvZ3Jlc3NEbGcuaGlkZSgpXG5cdFx0XHRcdFx0XHRcdFx0Y29uc3QgaW5mbyA9IGF3YWl0IHNydkZpbGVzLmZpbGVJbmZvKHJlc3Aub3V0RmlsZU5hbWUpXG5cdFx0XHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnaW5mbycsIGluZm8pXG5cdFx0XHRcdFx0XHRcdFx0ZmlsZXMuaW5zZXJ0RmlsZShpbmZvKVxuXHRcdFx0XHRcdFx0XHRcdGJyb2tlci5vZmZUb3BpYygnYnJlaXpib3QuaW1wb3J0VXJsLnByb2dyZXNzJywgb25Qcm9ncmVzcylcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRicm9rZXIub25Ub3BpYygnYnJlaXpib3QuaW1wb3J0VXJsLnByb2dyZXNzJywgb25Qcm9ncmVzcylcblxuXG5cblx0XHRcdFx0XHR9XG5cblxuXG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0LyoqXG5cdFx0XHRcdCAqIFxuXHRcdFx0XHQgKiBAcGFyYW0ge0JyZWl6Ym90LkNvbnRyb2xzLkZpbGVzLkV2ZW50RGF0YS5Db250ZXh0TWVudUl0ZW19IGRhdGEgXG5cdFx0XHRcdCAqL1xuXHRcdFx0XHRvbkNvbnRleHRNZW51OiBhc3luYyBmdW5jdGlvbiAoZXYsIGRhdGEpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbkNvbnRleHRNZW51JywgZGF0YSlcblx0XHRcdFx0XHRjb25zdCB7IHJvb3REaXIsIG5hbWUsIGlkeCwgY21kIH0gPSBkYXRhXG5cdFx0XHRcdFx0c3dpdGNoIChjbWQpIHtcblx0XHRcdFx0XHRcdGNhc2UgJ3JlbmFtZSc6XG5cdFx0XHRcdFx0XHRcdHJlbmFtZShkYXRhKVxuXHRcdFx0XHRcdFx0XHRicmVha1xuXHRcdFx0XHRcdFx0Y2FzZSAnbWFrZVJlc2l6ZWRDb3B5Jzpcblx0XHRcdFx0XHRcdFx0bWFrZVJlc2l6ZWRDb3B5KGRhdGEpXG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0Y2FzZSAnY29udmVydFRvTVAzJzpcblx0XHRcdFx0XHRcdFx0Y29udmVydFRvTVAzKGRhdGEpXG5cdFx0XHRcdFx0XHRcdGJyZWFrXG5cdFx0XHRcdFx0XHRjYXNlICd6aXBGb2xkZXInOlxuXHRcdFx0XHRcdFx0XHR6aXBGb2xkZXIoZGF0YSlcblx0XHRcdFx0XHRcdFx0YnJlYWtcblx0XHRcdFx0XHRcdGNhc2UgJ3VuemlwRmlsZSc6XG5cdFx0XHRcdFx0XHRcdHVuemlwRmlsZShkYXRhKVxuXHRcdFx0XHRcdFx0XHRicmVha1xuXHRcdFx0XHRcdFx0Y2FzZSAnZGVsZXRlJzpcblx0XHRcdFx0XHRcdFx0ZGVsZXRlRmlsZXMoW3sgZmlsZU5hbWU6IHJvb3REaXIgKyBuYW1lLCBpZHggfV0pXG5cdFx0XHRcdFx0XHRcdGJyZWFrXG5cdFx0XHRcdFx0XHRjYXNlICdkb3dubG9hZCc6XG5cdFx0XHRcdFx0XHRcdGRvd25sb2FkKGRhdGEpXG5cdFx0XHRcdFx0XHRcdGJyZWFrXG5cdFx0XHRcdFx0XHRjYXNlICdvcGVuJzpcblx0XHRcdFx0XHRcdFx0c2NoZWR1bGVyLm9wZW5BcHAoJ3ZpZXdlcicsIHtcblx0XHRcdFx0XHRcdFx0XHR0eXBlOiBnZXRWaWV3ZXJUeXBlKG5hbWUpLFxuXHRcdFx0XHRcdFx0XHRcdHVybDogc3J2RmlsZXMuZmlsZVVybChyb290RGlyICsgbmFtZSksXG5cdFx0XHRcdFx0XHRcdH0sIG5hbWUpXG5cdFx0XHRcdFx0XHRcdGJyZWFrXG5cdFx0XHRcdFx0XHRjYXNlICdlZGl0Jzpcblx0XHRcdFx0XHRcdFx0c2NoZWR1bGVyLm9wZW5BcHAoJ2VkaXRvcicsIHtcblx0XHRcdFx0XHRcdFx0XHRyb290RGlyLFxuXHRcdFx0XHRcdFx0XHRcdGZpbGVOYW1lOiBuYW1lXG5cdFx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XHRcdGJyZWFrXG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdH0sXG5cdFx0XHRcdC8qKlxuXHRcdFx0XHQgKiBcblx0XHRcdFx0ICogQHBhcmFtIHtCcmVpemJvdC5Db250cm9scy5GaWxlcy5FdmVudERhdGEuRGlyQ2hhbmdlfSBkYXRhIFxuXHRcdFx0XHQgKi9cblx0XHRcdFx0b25EaXJDaGFuZ2U6IGZ1bmN0aW9uIChldiwgZGF0YSkge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uRGlyQ2hhbmdlJywgZGF0YSlcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoeyByb290RGlyOiBkYXRhLm5ld0RpciwgbmJTZWxlY3Rpb246IDAgfSlcblx0XHRcdFx0fSxcblxuXHRcdFx0XHQvKipcblx0XHRcdFx0ICogXG5cdFx0XHRcdCAqIEBwYXJhbSB7QnJlaXpib3QuQ29udHJvbHMuRmlsZXMuRXZlbnREYXRhLkZpbGVDbGlja30gZGF0YSBcblx0XHRcdFx0ICovXG5cdFx0XHRcdG9uRmlsZUNsaWNrOiBmdW5jdGlvbiAoZXYsIGRhdGEpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbkZpbGVDbGljaycsIGRhdGEpXG5cdFx0XHRcdFx0Y29uc3QgeyBmaWxlTmFtZSwgcm9vdERpciB9ID0gZGF0YVxuXHRcdFx0XHRcdGNvbnN0IGZ1bGxOYW1lID0gcm9vdERpciArIGZpbGVOYW1lXG5cblx0XHRcdFx0XHRjb25zdCB0eXBlID0gZ2V0Vmlld2VyVHlwZShmaWxlTmFtZSlcblxuXHRcdFx0XHRcdGlmICh0eXBlICE9IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdFx0cGFnZXIucHVzaFBhZ2UoJ2JyZWl6Ym90LnZpZXdlcicsIHtcblx0XHRcdFx0XHRcdFx0dGl0bGU6IGZpbGVOYW1lLFxuXHRcdFx0XHRcdFx0XHRwcm9wczoge1xuXHRcdFx0XHRcdFx0XHRcdHR5cGUsXG5cdFx0XHRcdFx0XHRcdFx0dXJsOiBzcnZGaWxlcy5maWxlVXJsKGZ1bGxOYW1lKVxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvblRvZ2dsZVNlbGVjdGlvbjogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdGZpbGVzLnRvZ2dsZVNlbGVjdGlvbigpXG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHsgbmJTZWxlY3Rpb246IGZpbGVzLmdldE5iU2VsRmlsZXMoKSB9KVxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdC8qKlxuXHRcdFx0XHQgKiBcblx0XHRcdFx0ICogQHBhcmFtIHtCcmVpemJvdC5Db250cm9scy5GaWxlcy5FdmVudERhdGEuU2VsQ2hhbmdlfSBkYXRhIFxuXHRcdFx0XHQgKi9cblx0XHRcdFx0b25TZWxDaGFuZ2U6IGZ1bmN0aW9uIChldiwgZGF0YSkge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uU2VsQ2hhbmdlJywgZGF0YSlcblx0XHRcdFx0XHRjb25zdCB7IGlzU2hhcmVTZWxlY3RlZCB9ID0gZGF0YVxuXG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHsgbmJTZWxlY3Rpb246IGZpbGVzLmdldE5iU2VsRmlsZXMoKSwgaXNTaGFyZVNlbGVjdGVkIH0pXG5cblx0XHRcdFx0fSxcblxuXHRcdFx0XHQvKipcblx0XHRcdFx0ICogXG5cdFx0XHRcdCAqIEBwYXJhbSB7QnJhaW5qcy5Db250cm9scy5Db250ZXh0TWVudS5FdmVudERhdGEuQ29udGV4dE1lbnVDaGFuZ2V9IGRhdGEgXG5cdFx0XHRcdCAqL1xuXHRcdFx0XHRvblRvb2xiYXJDb250ZXh0TWVudTogZnVuY3Rpb24gKGV2LCBkYXRhKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25Ub29sYmFyQ29udGV4dE1lbnUnLCBkYXRhKVxuXHRcdFx0XHRcdGVsdC5maW5kKGBidXR0b25bZGF0YS1jbWQ9JHtkYXRhLmNtZH1dYCkuY2xpY2soKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvblRvZ2dsZURvd25sb2FkOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uVG9nZ2xlRG93bmxvYWQnKVxuXHRcdFx0XHRcdGNvbnN0ICRpID0gJCh0aGlzKS5maW5kKCdpJylcblx0XHRcdFx0XHRjb25zdCBwYW5lbCA9ICQodGhpcykuc2libGluZ3MoJy5kb3dubG9hZEl0ZW1zJylcblx0XHRcdFx0XHRpZiAoJGkuaGFzQ2xhc3MoJ2ZhLWNhcmV0LXJpZ2h0JykpIHtcblx0XHRcdFx0XHRcdCRpLnJlbW92ZUNsYXNzKCdmYS1jYXJldC1yaWdodCcpLmFkZENsYXNzKCdmYS1jYXJldC1kb3duJylcblx0XHRcdFx0XHRcdHBhbmVsLnNsaWRlRG93bigpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0JGkucmVtb3ZlQ2xhc3MoJ2ZhLWNhcmV0LWRvd24nKS5hZGRDbGFzcygnZmEtY2FyZXQtcmlnaHQnKVxuXHRcdFx0XHRcdFx0cGFuZWwuc2xpZGVVcCgpXG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0b25DcmVhdGVGb2xkZXI6IGFzeW5jIGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRjb25zdCByb290RGlyID0gZmlsZXMuZ2V0Um9vdERpcigpXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uQ3JlYXRlRm9sZGVyJywgcm9vdERpcilcblx0XHRcdFx0XHRjb25zdCBmb2xkZXJOYW1lID0gYXdhaXQgJCQudWkuc2hvd1Byb21wdCh7XG5cdFx0XHRcdFx0XHRsYWJlbDogJ0ZvbGRlciBuYW1lOicsXG5cdFx0XHRcdFx0XHR0aXRsZTogJ05ldyBGb2xkZXInXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnZm9sZGVyTmFtZScsIGZvbGRlck5hbWUpXG5cdFx0XHRcdFx0aWYgKGZvbGRlck5hbWUgPT0gbnVsbCkgcmV0dXJuXG5cblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0Y29uc3QgcmVzcCA9IGF3YWl0IGZvbGRlci5ta2Rpcihyb290RGlyICsgZm9sZGVyTmFtZSlcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcClcblx0XHRcdFx0XHRcdGZpbGVzLmluc2VydEZpbGUocmVzcClcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Y2F0Y2ggKHJlc3ApIHtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcClcblx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7XG5cdFx0XHRcdFx0XHRcdGNvbnRlbnQ6IHJlc3AucmVzcG9uc2VUZXh0LFxuXHRcdFx0XHRcdFx0XHR0aXRsZTogJ0Vycm9yJ1xuXHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0b25Db3B5RmlsZXM6IGZ1bmN0aW9uIChldikge1xuXHRcdFx0XHRcdGNvbnN0IHNlbGVjdGVkRmlsZXMgPSBmaWxlcy5nZXRTZWxGaWxlTmFtZXMoKVxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uQ29weUZpbGVzJywgc2VsZWN0ZWRGaWxlcylcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoe1xuXHRcdFx0XHRcdFx0c2VsZWN0ZWRGaWxlcyxcblx0XHRcdFx0XHRcdG9wZXJhdGlvbjogJ2NvcHknXG5cdFx0XHRcdFx0fSlcblxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdG9uRGVsZXRlRmlsZXM6IGZ1bmN0aW9uIChldikge1xuXG5cdFx0XHRcdFx0Y29uc3Qgc2VsRmlsZXMgPSBmaWxlcy5nZXRTZWxGaWxlcygpXG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25EZWxldGVGaWxlcycsIHNlbEZpbGVzKVxuXG5cdFx0XHRcdFx0aWYgKHNlbEZpbGVzLmxlbmd0aCA9PSAwKSB7XG5cdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe1xuXHRcdFx0XHRcdFx0XHR0aXRsZTogJ0RlbGV0ZSBmaWxlcycsXG5cdFx0XHRcdFx0XHRcdGNvbnRlbnQ6ICdObyBmaWxlcyBzZWxlY3RlZCdcblx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XHRyZXR1cm5cblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRkZWxldGVGaWxlcyhzZWxGaWxlcylcblxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdG9uQ3V0RmlsZXM6IGZ1bmN0aW9uIChldikge1xuXHRcdFx0XHRcdGNvbnN0IHNlbGVjdGVkRmlsZXMgPSBmaWxlcy5nZXRTZWxGaWxlTmFtZXMoKVxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uQ3V0RmlsZXMnLCBzZWxlY3RlZEZpbGVzKVxuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7XG5cdFx0XHRcdFx0XHRzZWxlY3RlZEZpbGVzLFxuXHRcdFx0XHRcdFx0b3BlcmF0aW9uOiAnY3V0J1xuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0b25QYXN0ZUZpbGVzOiBhc3luYyBmdW5jdGlvbiAoZXYpIHtcblx0XHRcdFx0XHRjb25zdCB7IHJvb3REaXIsIHNlbGVjdGVkRmlsZXMsIG9wZXJhdGlvbiB9ID0gY3RybC5tb2RlbFxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uUGFzdGVGaWxlcycsIHJvb3REaXIpXG5cblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0aWYgKG9wZXJhdGlvbiA9PSAnY29weScpIHtcblx0XHRcdFx0XHRcdFx0YXdhaXQgZm9sZGVyLmNvcHlGaWxlcyhzZWxlY3RlZEZpbGVzLCByb290RGlyKVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRcdGF3YWl0IGZvbGRlci5tb3ZlRmlsZXMoc2VsZWN0ZWRGaWxlcywgcm9vdERpcilcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHJlbG9hZCgpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGNhdGNoIChyZXNwKSB7XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe1xuXHRcdFx0XHRcdFx0XHRjb250ZW50OiByZXNwLnJlc3BvbnNlVGV4dCxcblx0XHRcdFx0XHRcdFx0dGl0bGU6ICdFcnJvcidcblx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdG9uUmVsb2FkOiBmdW5jdGlvbiAoZXYpIHtcblx0XHRcdFx0XHRyZWxvYWQoKVxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdG9uSW1wb3J0RmlsZTogZnVuY3Rpb24gKGV2KSB7XG5cdFx0XHRcdFx0JCQudWkub3BlbkZpbGVEaWFsb2coKGZpbGVzKSA9PiB7XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZygnZmlsZXMnLCBmaWxlcylcblx0XHRcdFx0XHRcdGZvciAoY29uc3QgZmlsZSBvZiBmaWxlcykge1xuXHRcdFx0XHRcdFx0XHR1cGxvYWRGaWxlKGZpbGUpXG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHR9LCB0cnVlKVxuXG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0b25TaGFyZVNlbGVjdGVkOiBhc3luYyBmdW5jdGlvbiAoZXYsIGRhdGEpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25TaGFyZVNlbGVjdGVkJywgZGF0YSlcblx0XHRcdFx0XHRsZXQgbmFtZSA9IGRhdGEuY21kXG5cdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdGlmIChuYW1lID09ICckYWRkJykge1xuXHRcdFx0XHRcdFx0XHRuYW1lID0gYXdhaXQgJCQudWkuc2hvd1Byb21wdCh7IHRpdGxlOiAnQWRkIEdyb3VwJywgbGFiZWw6ICdOYW1lJyB9KVxuXHRcdFx0XHRcdFx0XHRpZiAobmFtZSAhPSBudWxsKSB7XG5cdFx0XHRcdFx0XHRcdFx0YXdhaXQgZ2V0U2hhcmluZ0dyb3VwcygpXG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuXG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGNvbnN0IHNlbEZpbGVzID0gZmlsZXMuZ2V0U2VsRmlsZU5hbWVzKClcblx0XHRcdFx0XHRcdGF3YWl0IGZvbGRlci5zaGFyZUZpbGVzKHNlbEZpbGVzLCBuYW1lKVxuXHRcdFx0XHRcdFx0cmVsb2FkKClcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Y2F0Y2ggKHJlc3ApIHtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcClcblx0XHRcdFx0XHRcdC8vY3RybC5zZXREYXRhKHtzZWxlY3RlZEZpbGVzOiBbXSwgb3BlcmF0aW9uOiAnbm9uZSd9KVxuXHRcdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHtcblx0XHRcdFx0XHRcdFx0Y29udGVudDogcmVzcC5yZXNwb25zZVRleHQsXG5cdFx0XHRcdFx0XHRcdHRpdGxlOiAnRXJyb3InXG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdH1cblxuXG5cdFx0XHRcdH1cblxuXG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdC8qKkB0eXBlIHtCcmVpemJvdC5Db250cm9scy5GaWxlcy5JbnRlcmZhY2V9ICovXG5cdFx0Y29uc3QgZmlsZXMgPSBjdHJsLnNjb3BlLmZpbGVzXG5cblx0XHRnZXRTaGFyaW5nR3JvdXBzKClcblxuXHRcdGFzeW5jIGZ1bmN0aW9uIHVuemlwRmlsZShkYXRhKSB7XG5cdFx0XHRjb25zdCB7IHJvb3REaXIsIG5hbWUsIGlkeCB9ID0gZGF0YVxuXG5cdFx0XHR0cnkge1xuXHRcdFx0XHRwcm9ncmVzc0RsZy5zZXRQZXJjZW50YWdlKDApXG5cdFx0XHRcdHByb2dyZXNzRGxnLnNob3coJ1VuemlwcGluZy4uLicpXG5cdFx0XHRcdGNvbnN0IHJlc3AgPSBhd2FpdCBmb2xkZXIudW56aXBGaWxlKHJvb3REaXIsIG5hbWUpXG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKVxuXHRcdFx0XHRhc3luYyBmdW5jdGlvbiBvblByb2dyZXNzKG1zZykge1xuXHRcdFx0XHRcdGlmIChtc2cuaGlzdCA9PSB0cnVlKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm5cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygncHJvZ3Jlc3MnLCBtc2cuZGF0YSlcblx0XHRcdFx0XHRjb25zdCB7IHBlcmNlbnQgfSA9IG1zZy5kYXRhXG5cdFx0XHRcdFx0cHJvZ3Jlc3NEbGcuc2V0UGVyY2VudGFnZShwZXJjZW50IC8gMTAwKVxuXHRcdFx0XHRcdGlmIChNYXRoLmZsb29yKHBlcmNlbnQpID09IDEwMCkge1xuXHRcdFx0XHRcdFx0YXdhaXQgJCQudXRpbC53YWl0KDUwMClcblx0XHRcdFx0XHRcdHByb2dyZXNzRGxnLmhpZGUoKVxuXHRcdFx0XHRcdFx0YnJva2VyLm9mZlRvcGljKCdicmVpemJvdC51bnppcC5wcm9ncmVzcycsIG9uUHJvZ3Jlc3MpXG5cblx0XHRcdFx0XHRcdGZpbGVzLnJlbG9hZCgpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGJyb2tlci5vblRvcGljKCdicmVpemJvdC51bnppcC5wcm9ncmVzcycsIG9uUHJvZ3Jlc3MpXG5cblxuXHRcdFx0fVxuXHRcdFx0Y2F0Y2ggKHJlc3ApIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKVxuXHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe1xuXHRcdFx0XHRcdGNvbnRlbnQ6IHJlc3AucmVzcG9uc2VUZXh0LFxuXHRcdFx0XHRcdHRpdGxlOiAnRXJyb3InXG5cdFx0XHRcdH0pXG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZG93bmxvYWQoZGF0YSkge1xuXHRcdFx0Y29uc3QgeyByb290RGlyLCBuYW1lIH0gPSBkYXRhXG5cblx0XHRcdGNvbnN0IHVybCA9IHNydkZpbGVzLmZpbGVVcmwocm9vdERpciArIG5hbWUpXG5cdFx0XHQkJC51cmwuZG93bmxvYWRVcmwodXJsLCBuYW1lKVxuXHRcdH1cblxuXHRcdGFzeW5jIGZ1bmN0aW9uIHppcEZvbGRlcihkYXRhKSB7XG5cdFx0XHRjb25zdCB7IHJvb3REaXIsIG5hbWUsIGlkeCB9ID0gZGF0YVxuXG5cdFx0XHR0cnkge1xuXHRcdFx0XHRwcm9ncmVzc0RsZy5zZXRQZXJjZW50YWdlKDApXG5cdFx0XHRcdHByb2dyZXNzRGxnLnNob3coJ1ppcHBpbmcuLi4nKVxuXHRcdFx0XHRjb25zdCByZXNwID0gYXdhaXQgZm9sZGVyLnppcEZvbGRlcihyb290RGlyLCBuYW1lKVxuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdyZXNwJywgcmVzcClcblx0XHRcdFx0YXN5bmMgZnVuY3Rpb24gb25Qcm9ncmVzcyhtc2cpIHtcblx0XHRcdFx0XHRpZiAobXNnLmhpc3QgPT0gdHJ1ZSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGNvbnN0IHsgcGVyY2VudCB9ID0gbXNnLmRhdGFcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdwcm9ncmVzcycsIHBlcmNlbnQpXG5cdFx0XHRcdFx0cHJvZ3Jlc3NEbGcuc2V0UGVyY2VudGFnZShwZXJjZW50IC8gMTAwKVxuXHRcdFx0XHRcdGlmIChNYXRoLmZsb29yKHBlcmNlbnQpID09IDEwMCkge1xuXHRcdFx0XHRcdFx0YXdhaXQgJCQudXRpbC53YWl0KDUwMClcblx0XHRcdFx0XHRcdHByb2dyZXNzRGxnLmhpZGUoKVxuXHRcdFx0XHRcdFx0Y29uc3QgaW5mbyA9IGF3YWl0IHNydkZpbGVzLmZpbGVJbmZvKHJlc3Aub3V0RmlsZU5hbWUpXG5cdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdpbmZvJywgaW5mbylcblx0XHRcdFx0XHRcdGZpbGVzLmluc2VydEZpbGUoaW5mbywgaWR4KVxuXHRcdFx0XHRcdFx0YnJva2VyLm9mZlRvcGljKCdicmVpemJvdC56aXAucHJvZ3Jlc3MnLCBvblByb2dyZXNzKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdGJyb2tlci5vblRvcGljKCdicmVpemJvdC56aXAucHJvZ3Jlc3MnLCBvblByb2dyZXNzKVxuXG5cblx0XHRcdH1cblx0XHRcdGNhdGNoIChyZXNwKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcClcblx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHtcblx0XHRcdFx0XHRjb250ZW50OiByZXNwLnJlc3BvbnNlVGV4dCxcblx0XHRcdFx0XHR0aXRsZTogJ0Vycm9yJ1xuXHRcdFx0XHR9KVxuXHRcdFx0fVxuXHRcdH1cblx0XHRhc3luYyBmdW5jdGlvbiBtYWtlUmVzaXplZENvcHkoZGF0YSkge1xuXHRcdFx0Y29uc3QgeyByb290RGlyLCBuYW1lLCBpZHggfSA9IGRhdGFcblxuXHRcdFx0Y29uc3QgcGVyY2VudGFnZSA9IGF3YWl0ICQkLnVpLnNob3dQcm9tcHQoe1xuXHRcdFx0XHRsYWJlbDogJ1Jlc2NhbGUgcGVyY2VudGFnZTonLFxuXHRcdFx0XHR0aXRsZTogJ01ha2UgcmVzaXplZCBjb3B5Jyxcblx0XHRcdFx0YXR0cnM6IHsgbWluOiAxMCwgbWF4OiA5MCwgdHlwZTogJ251bWJlcicgfSxcblx0XHRcdFx0dmFsdWU6IDUwXG5cdFx0XHR9KVxuXG5cdFx0XHRpZiAocGVyY2VudGFnZSAhPSBudWxsKSB7XG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0Y29uc3QgcmVzcCA9IGF3YWl0IGZvbGRlci5yZXNpemVJbWFnZShyb290RGlyLCBuYW1lLCBwZXJjZW50YWdlICsgJyUnKVxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKVxuXHRcdFx0XHRcdGZpbGVzLmluc2VydEZpbGUocmVzcCwgaWR4KVxuXG5cdFx0XHRcdH1cblx0XHRcdFx0Y2F0Y2ggKHJlc3ApIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHtcblx0XHRcdFx0XHRcdGNvbnRlbnQ6IHJlc3AucmVzcG9uc2VUZXh0LFxuXHRcdFx0XHRcdFx0dGl0bGU6ICdFcnJvcidcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0YXN5bmMgZnVuY3Rpb24gY29udmVydFRvTVAzKGRhdGEpIHtcblx0XHRcdGNvbnN0IHsgcm9vdERpciwgbmFtZSwgaWR4IH0gPSBkYXRhXG5cblx0XHRcdHRyeSB7XG5cdFx0XHRcdHByb2dyZXNzRGxnLnNldFBlcmNlbnRhZ2UoMClcblx0XHRcdFx0cHJvZ3Jlc3NEbGcuc2hvdygnQ29udmVydGluZy4uLicpXG5cdFx0XHRcdGNvbnN0IHJlc3AgPSBhd2FpdCBmb2xkZXIuY29udmVydFRvTVAzKHJvb3REaXIsIG5hbWUpXG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKVxuXG5cdFx0XHRcdGFzeW5jIGZ1bmN0aW9uIG9uUHJvZ3Jlc3MobXNnKSB7XG5cblx0XHRcdFx0XHRpZiAobXNnLmhpc3QgPT0gdHJ1ZSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdwcm9ncmVzcycsIG1zZy5kYXRhKVxuXHRcdFx0XHRcdGNvbnN0IHsgcGVyY2VudCwgZmluaXNoLCBlcnJvciB9ID0gbXNnLmRhdGFcblx0XHRcdFx0XHRpZiAoZXJyb3IpIHtcblx0XHRcdFx0XHRcdHByb2dyZXNzRGxnLmhpZGUoKVxuXHRcdFx0XHRcdFx0YnJva2VyLm9mZlRvcGljKCdicmVpemJvdC5tcDMucHJvZ3Jlc3MnLCBvblByb2dyZXNzKVxuXHRcdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHsgdGl0bGU6ICdFcnJvcicsIGNvbnRlbnQ6IGVycm9yIH0pXG5cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSBpZiAoZmluaXNoID09PSB0cnVlKSB7XG5cdFx0XHRcdFx0XHRhd2FpdCAkJC51dGlsLndhaXQoNTAwKVxuXHRcdFx0XHRcdFx0cHJvZ3Jlc3NEbGcuaGlkZSgpXG5cdFx0XHRcdFx0XHRjb25zdCBpbmZvID0gYXdhaXQgc3J2RmlsZXMuZmlsZUluZm8ocmVzcC5vdXRGaWxlTmFtZSlcblx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ2luZm8nLCBpbmZvKVxuXHRcdFx0XHRcdFx0ZmlsZXMuaW5zZXJ0RmlsZShpbmZvLCBpZHgpXG5cdFx0XHRcdFx0XHRicm9rZXIub2ZmVG9waWMoJ2JyZWl6Ym90Lm1wMy5wcm9ncmVzcycsIG9uUHJvZ3Jlc3MpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0cHJvZ3Jlc3NEbGcuc2V0UGVyY2VudGFnZShwZXJjZW50IC8gMTAwKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRicm9rZXIub25Ub3BpYygnYnJlaXpib3QubXAzLnByb2dyZXNzJywgb25Qcm9ncmVzcylcblxuXG5cdFx0XHR9XG5cdFx0XHRjYXRjaCAocmVzcCkge1xuXHRcdFx0XHRjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7XG5cdFx0XHRcdFx0Y29udGVudDogcmVzcC5yZXNwb25zZVRleHQsXG5cdFx0XHRcdFx0dGl0bGU6ICdFcnJvcidcblx0XHRcdFx0fSlcblx0XHRcdH1cblx0XHR9XG5cblx0XHRhc3luYyBmdW5jdGlvbiByZW5hbWUoZGF0YSkge1xuXHRcdFx0Y29uc29sZS5sb2coZGF0YSlcblx0XHRcdGNvbnN0IHsgcm9vdERpciwgbmFtZSwgaWR4IH0gPSBkYXRhXG5cblx0XHRcdGNvbnN0IG9sZEZpbGVOYW1lID0gbmFtZVxuXHRcdFx0Y29uc3QgbmV3RmlsZU5hbWUgPSBhd2FpdCAkJC51aS5zaG93UHJvbXB0KHsgbGFiZWw6ICdOZXcgbmFtZScsIHRpdGxlOiAnUmVuYW1lJywgdmFsdWU6IG9sZEZpbGVOYW1lIH0pXG5cdFx0XHRjb25zb2xlLmxvZygnbmV3RmlsZU5hbWUnLCBuZXdGaWxlTmFtZSlcblx0XHRcdGlmIChuZXdGaWxlTmFtZSAhPSBudWxsICYmIG5ld0ZpbGVOYW1lICE9IG9sZEZpbGVOYW1lKSB7XG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0Y29uc3QgcmVzcCA9IGF3YWl0IGZvbGRlci5yZW5hbWVGaWxlKHJvb3REaXIsIG9sZEZpbGVOYW1lLCBuZXdGaWxlTmFtZSlcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdyZXNwJywgcmVzcClcblx0XHRcdFx0XHRmaWxlcy51cGRhdGVGaWxlKGlkeCwgcmVzcClcblx0XHRcdFx0fVxuXHRcdFx0XHRjYXRjaCAocmVzcCkge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcClcblx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe1xuXHRcdFx0XHRcdFx0Y29udGVudDogcmVzcC5yZXNwb25zZVRleHQsXG5cdFx0XHRcdFx0XHR0aXRsZTogJ0Vycm9yJ1xuXHRcdFx0XHRcdH0pXG5cblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gcmVsb2FkKCkge1xuXHRcdFx0Y3RybC5zZXREYXRhKHsgc2VsZWN0ZWRGaWxlczogW10sIG9wZXJhdGlvbjogJ25vbmUnLCBuYlNlbGVjdGlvbjogMCB9KVxuXHRcdFx0ZmlsZXMucmVsb2FkKClcblx0XHR9XG5cblx0XHRhc3luYyBmdW5jdGlvbiBnZXRTaGFyaW5nR3JvdXBzKCkge1xuXHRcdFx0c2hhcmluZ0dyb3VwcyA9IGF3YWl0IHNydkZpbGVzLmxpc3QoJy9zaGFyZScsIHsgZm9sZGVyT25seTogdHJ1ZSB9KVxuXHRcdFx0c2hhcmluZ0dyb3VwcyA9IHNoYXJpbmdHcm91cHMubWFwKChmKSA9PiBmLm5hbWUpXG5cdFx0XHQvL2NvbnNvbGUubG9nKCdzaGFyaW5nR3JvdXBzJywgc2hhcmluZ0dyb3Vwcylcblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBcblx0XHQgKiBAcGFyYW0ge0ZpbGV9IGZpbGUgXG5cdFx0ICovXG5cdFx0YXN5bmMgZnVuY3Rpb24gdXBsb2FkRmlsZShmaWxlKSB7XG5cdFx0XHR0cnkge1xuXHRcdFx0XHRjb25zdCBkYXRhID0ge1xuXHRcdFx0XHRcdGZpbGVOYW1lOiBmaWxlLm5hbWUsXG5cdFx0XHRcdFx0cGVyY2VudGFnZTogMFxuXHRcdFx0XHR9XG5cblx0XHRcdFx0Y29uc3QgeyBkb3dubG9hZHMsIHJvb3REaXIgfSA9IGN0cmwubW9kZWxcblx0XHRcdFx0ZG93bmxvYWRzLnB1c2goZGF0YSlcblx0XHRcdFx0Y3RybC51cGRhdGVOb2RlVHJlZSgnZG93bmxvYWRzJylcblx0XHRcdFx0Y29uc29sZS5sb2coJ3VwbG9hZEZpbGUnLCByb290RGlyLCBmaWxlLm5hbWUpXG5cblx0XHRcdFx0YXdhaXQgc3J2RmlsZXMudXBsb2FkRmlsZShmaWxlLCBmaWxlLm5hbWUsIHJvb3REaXIsIGZhbHNlLCBmdW5jdGlvbiAocGVyY2VudENvbXBsZXRlKSB7XG5cdFx0XHRcdFx0ZGF0YS5wZXJjZW50YWdlID0gcGVyY2VudENvbXBsZXRlXG5cdFx0XHRcdFx0Y3RybC51cGRhdGVOb2RlVHJlZSgnZG93bmxvYWRzJylcblx0XHRcdFx0fSlcblx0XHRcdFx0Y29uc29sZS5sb2coJ0Rvd25sb2FkIEZpbmlzaGVkOiAnLCBkYXRhLmZpbGVOYW1lKVxuXHRcdFx0XHRjb25zdCBpZHggPSBkb3dubG9hZHMuaW5kZXhPZihkYXRhKVxuXHRcdFx0XHRkb3dubG9hZHMuc3BsaWNlKGlkeCwgMSlcblx0XHRcdFx0Y3RybC51cGRhdGVOb2RlVHJlZSgnZG93bmxvYWRzJylcblx0XHRcdFx0Y29uc3QgZmlsZUluZm8gPSBhd2FpdCBzcnZGaWxlcy5maWxlSW5mbyhyb290RGlyICsgZGF0YS5maWxlTmFtZSlcblx0XHRcdFx0ZmlsZXMuaW5zZXJ0RmlsZShmaWxlSW5mbylcblx0XHRcdH1cblx0XHRcdGNhdGNoIChyZXNwKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcClcblx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHsgY29udGVudDogcmVzcC5yZXNwb25zZVRleHQsIHRpdGxlOiAnRXJyb3InIH0pXG5cdFx0XHR9XG5cblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBAcGFyYW0ge0JyZWl6Ym90LkNvbnRyb2xzLkZpbGVzLkZpbGVEZXNjW119IGZpbGVOYW1lc1xuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIGRlbGV0ZUZpbGVzKGZpbGVOYW1lcykge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnZGVsZXRlRmlsZXMnLCBmaWxlTmFtZXMpXG5cdFx0XHQkJC51aS5zaG93Q29uZmlybSh7XG5cdFx0XHRcdGNvbnRlbnQ6ICdBcmUgeW91IHN1cmUgPycsXG5cdFx0XHRcdHRpdGxlOiAnRGVsZXRlIGZpbGVzJ1xuXHRcdFx0fSwgYXN5bmMgZnVuY3Rpb24gKCkge1xuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdGNvbnN0IHJlc3AgPSBhd2FpdCBmb2xkZXIucmVtb3ZlRmlsZXMoZmlsZU5hbWVzLm1hcCgoaSkgPT4gaS5maWxlTmFtZSkpXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKVxuXHRcdFx0XHRcdGZpbGVzLnJlbW92ZUZpbGVzKGZpbGVOYW1lcy5tYXAoKGkpID0+IGkuaWR4KSlcblx0XHRcdFx0fVxuXHRcdFx0XHRjYXRjaCAocmVzcCkge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcClcblx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe1xuXHRcdFx0XHRcdFx0Y29udGVudDogcmVzcC5yZXNwb25zZVRleHQsXG5cdFx0XHRcdFx0XHR0aXRsZTogJ0Vycm9yJ1xuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH1cblx0XHRcdH0pXG5cdFx0fVxuXG5cdFx0Y29uc3QgcmVzaXplT2JzZXJ2ZXIgPSBuZXcgUmVzaXplT2JzZXJ2ZXIoZW50cmllcyA9PiB7XG5cdFx0XHRjdHJsLm1vZGVsLmlzTW9iaWxlRGV2aWNlID0gJCQudXRpbC5pc01vYmlsZURldmljZSgpXG5cdFx0XHRjdHJsLnVwZGF0ZU5vZGVUcmVlKCd0b29sYmFyJylcblx0XHR9KVxuXG5cdFx0cmVzaXplT2JzZXJ2ZXIub2JzZXJ2ZShlbHQuZ2V0KDApKTtcblxuXG5cblx0fVxufSk7XG5cblxuXG5cbiIsIi8vQHRzLWNoZWNrXG4kJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYXBwLmZvbGRlcicsIHtcblxuICAgIGRlcHM6IFsnYnJlaXpib3QuaHR0cCcsICdicmVpemJvdC5icm9rZXInXSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7Kn0gY29uZmlnIFxuICAgICAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuSHR0cC5JbnRlcmZhY2V9IGh0dHAgXG4gICAgICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5Ccm9rZXIuSW50ZXJmYWNlfSBicm9rZXIgXG4gICAgICogQHJldHVybnMgXG4gICAgICovXG4gICAgaW5pdDogZnVuY3Rpb24gKGNvbmZpZywgaHR0cCwgYnJva2VyKSB7XG5cblx0XHRsZXQgc3JjSWRcblxuXHRcdGJyb2tlci5vbigncmVhZHknLCAobXNnKSA9PiB7IHNyY0lkID0gbXNnLmNsaWVudElkfSlcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVtb3ZlRmlsZXM6IGZ1bmN0aW9uIChmaWxlTmFtZXMpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnW0ZpbGVTZXJ2aWNlXSByZW1vdmVGaWxlcycsIGZpbGVOYW1lcylcbiAgICAgICAgICAgICAgICByZXR1cm4gaHR0cC5wb3N0KCcvZGVsZXRlJywgZmlsZU5hbWVzKVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgbWtkaXI6IGZ1bmN0aW9uIChmaWxlTmFtZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbRmlsZVNlcnZpY2VdIG1rZGlyJywgZmlsZU5hbWUpXG4gICAgICAgICAgICAgICAgcmV0dXJuIGh0dHAucG9zdCgnL21rZGlyJywgeyBmaWxlTmFtZSB9KVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgbW92ZUZpbGVzOiBmdW5jdGlvbiAoZmlsZU5hbWVzLCBkZXN0UGF0aCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbRmlsZVNlcnZpY2VdIG1vdmVGaWxlcycsIGZpbGVOYW1lcywgZGVzdFBhdGgpXG4gICAgICAgICAgICAgICAgcmV0dXJuIGh0dHAucG9zdCgnL21vdmUnLCB7IGZpbGVOYW1lcywgZGVzdFBhdGggfSlcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIHNoYXJlRmlsZXM6IGZ1bmN0aW9uIChmaWxlTmFtZXMsIGdyb3VwTmFtZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbRmlsZVNlcnZpY2VdIHNoYXJlRmlsZXMnLCBmaWxlTmFtZXMpXG4gICAgICAgICAgICAgICAgcmV0dXJuIGh0dHAucG9zdCgnL21vdmUnLCB7IGZpbGVOYW1lcywgZGVzdFBhdGg6IGAvc2hhcmUvJHtncm91cE5hbWV9YCB9KVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgY29weUZpbGVzOiBmdW5jdGlvbiAoZmlsZU5hbWVzLCBkZXN0UGF0aCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbRmlsZVNlcnZpY2VdIGNvcHlGaWxlcycsIGZpbGVOYW1lcywgZGVzdFBhdGgpXG4gICAgICAgICAgICAgICAgcmV0dXJuIGh0dHAucG9zdCgnL2NvcHknLCB7IGZpbGVOYW1lcywgZGVzdFBhdGggfSlcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIHJlbmFtZUZpbGU6IGZ1bmN0aW9uIChmaWxlUGF0aCwgb2xkRmlsZU5hbWUsIG5ld0ZpbGVOYW1lKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1tGaWxlU2VydmljZV0gcmVuYW1lRmlsZScsIGZpbGVQYXRoLCBvbGRGaWxlTmFtZSwgbmV3RmlsZU5hbWUpXG4gICAgICAgICAgICAgICAgcmV0dXJuIGh0dHAucG9zdCgnL3JlbmFtZScsIHsgZmlsZVBhdGgsIG9sZEZpbGVOYW1lLCBuZXdGaWxlTmFtZSB9KVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgcmVzaXplSW1hZ2U6IGZ1bmN0aW9uIChmaWxlUGF0aCwgZmlsZU5hbWUsIHJlc2l6ZUZvcm1hdCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbRmlsZVNlcnZpY2VdIHJlc2l6ZUltYWdlJywgZmlsZVBhdGgsIGZpbGVOYW1lLCByZXNpemVGb3JtYXQpXG4gICAgICAgICAgICAgICAgcmV0dXJuIGh0dHAucG9zdCgnL3Jlc2l6ZUltYWdlJywgeyBmaWxlUGF0aCwgZmlsZU5hbWUsIHJlc2l6ZUZvcm1hdCB9KVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgY29udmVydFRvTVAzOiBmdW5jdGlvbiAoZmlsZVBhdGgsIGZpbGVOYW1lKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1tGaWxlU2VydmljZV0gY29udmVydFRvTVAzJywgZmlsZVBhdGgsIGZpbGVOYW1lKVxuICAgICAgICAgICAgICAgIHJldHVybiBodHRwLnBvc3QoJy9jb252ZXJ0VG9NUDMnLCB7IGZpbGVQYXRoLCBmaWxlTmFtZSwgc3JjSWQgfSlcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIHppcEZvbGRlcjogZnVuY3Rpb24gKGZvbGRlclBhdGgsIGZvbGRlck5hbWUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnW0ZpbGVTZXJ2aWNlXSB6aXBGb2xkZXInLCBmb2xkZXJQYXRoLCBmb2xkZXJOYW1lKVxuICAgICAgICAgICAgICAgIHJldHVybiBodHRwLnBvc3QoJy96aXBGb2xkZXInLCB7IGZvbGRlclBhdGgsIGZvbGRlck5hbWUsIHNyY0lkIH0pXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICB1bnppcEZpbGU6IGZ1bmN0aW9uIChmb2xkZXJQYXRoLCBmaWxlTmFtZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbRmlsZVNlcnZpY2VdIHVuemlwRmlsZScsIGZvbGRlclBhdGgsIGZpbGVOYW1lKVxuICAgICAgICAgICAgICAgIHJldHVybiBodHRwLnBvc3QoJy91bnppcEZpbGUnLCB7IGZvbGRlclBhdGgsIGZpbGVOYW1lLCBzcmNJZCB9KVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgaW1wb3J0VXJsOiBmdW5jdGlvbihmb2xkZXJQYXRoLCB1cmwpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnW0ZpbGVTZXJ2aWNlXSBpbXBvcnRVcmwnLCBmb2xkZXJQYXRoLCB1cmwpXG4gICAgICAgICAgICAgICAgcmV0dXJuIGh0dHAucG9zdCgnL2ltcG9ydFVybCcsIHsgZm9sZGVyUGF0aCwgc3JjSWQsIHVybCB9KVxuXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfVxuICAgIH1cblxufSk7XG4iXX0=
