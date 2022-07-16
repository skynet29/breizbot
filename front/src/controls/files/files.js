//@ts-check
(function () {

	/**
	 * 
	 * @param {string} name 
	 * @returns 
	 */
	function getIconClass(name) {
		name = name.toLowerCase()
		if (name.endsWith('.pdf')) {
			return 'fa-file-pdf w3-text-red'
		}
		if (name.endsWith('.hdoc')) {
			return 'fa-file-word w3-text-blue'
		}
		if (name.endsWith('.ogg') || name.endsWith('.mp3')) {
			return 'fa-file-audio w3-text-purple'
		}
		if (name.endsWith('.mp4') || name.endsWith('.webm') || name.endsWith('.3gp')) {
			return 'fa-file-video w3-text-orange'
		}
		if (name.endsWith('.zip')) {
			return 'fa-file-archive w3-text-amber'
		}

		return 'fa-file w3-text-blue-grey'
	}

	/**
	 * 
	 * @param {Breizbot.Services.Files.FileInfo[]} files 
	 */
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
			selectionEnabled: false,
			folderSelectionEnabled: true,
			imageOnly: false,
			filterExtension: undefined,
			getMP3Info: false,
			friendUser: '',
			mp3Filters: null,
			menuItems: function (data) {
				return {}
			}
		},

		template: { gulp_inject: './files.html' },

		/**
		 * 
		 * @param {*} elt 
		 * @param {Breizbot.Services.Files.Interface} srvFiles 
		 */
		init: function (elt, srvFiles) {

			const thumbnailSize = '100x?'

			let selected = false

			/**@type {Breizbot.Controls.Files.Props} */
			let {
				selectionEnabled,
				folderSelectionEnabled,
				filterExtension,
				friendUser,
				imageOnly,
				getMP3Info,
				mp3Filters,				
				menuItems
			} = this.props 

			const ctrl = $$.viewController(elt, {

				data: {
					getItems: function (scope) {
						return menuItems(scope.f)
					},
					loading: false,
					selectionEnabled,
					folderSelectionEnabled,
					rootDir: '/',
					files: [],
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
						for (let f in this.mp3Filters) {
							//console.log('filter', f)
							const value = mp3Info[f]
							//console.log('value', value)
							const filterValue = this.mp3Filters[f]
							//console.log('filterValue', filterValue)
							if (filterValue != 'All') {
								ret &= (filterValue === value)
							}
						}
						//console.log('ret', ret)
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

					hasGenre: function (scope) {
						let { genre } = scope.f.mp3
						return genre != undefined && genre != '' && !genre.startsWith('(')
					},

					hasYear: function (scope) {
						let { year } = scope.f.mp3
						return year != undefined && year != ''
					},

					getYear: function (scope) {
						return parseInt(scope.f.mp3.year)
					},

					getThumbnailUrl: function (scope) {
						return srvFiles.fileThumbnailUrl(this.rootDir + scope.f.name, thumbnailSize, friendUser)
					},
					if1: function (scope) {
						return scope.f.name != '..'
					},

					showCheckSelection: function(scope)	{
						let ret = this.selectionEnabled
						if (scope.f.folder)  { ret &= this.folderSelectionEnabled}
						return ret
					},

					if2: function (scope) {
						return !scope.f.folder && !scope.f.isImage && !this.isMP3(scope)
					},
					if3: function (scope) {
						return !scope.f.folder && scope.f.isImage
					},
					class1: function (scope) {
						return `fa fa-4x ${getIconClass(scope.f.name)}`
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

					getDuration: function(scope) {
						if (scope.f.mp3.length) {
							return $$.media.getFormatedTime(scope.f.mp3.length)
						}
						return ''
					}



				},
				events: {
					onPathItem: function (ev) {
						const pathItem = $(this).data('info')
						//console.log('onPathItem', pathItem)
						ev.preventDefault()
						const newDir = pathItem == '' ? '/' : '/' + pathItem + '/'

						ev.stopPropagation()
						elt.trigger('dirchange', { newDir })


						loadData(newDir)
					},

					onContextMenu: async function (ev, data) {
						const { cmd } = data
						const idx = $(this).closest('.thumbnail').index()
						const { name } = ctrl.model.files[idx]

						const { rootDir } = ctrl.model
						ev.stopPropagation()
						elt.trigger('contextmenuItem', { cmd, idx, name, rootDir })

					},

					onFileClick: function (ev) {
						const idx = $(this).closest('.thumbnail').index()
						const info = ctrl.model.getFiles()[idx]
						//console.log('info', info)

						ev.stopPropagation()
						const data = {
							fileName: info.name,
							rootDir: ctrl.model.rootDir,
							isImage: info.isImage,
							mp3: info.mp3
						}

						elt.trigger('fileclick', data)
					},
					onCheckClick: function (ev) {
						const idx = $(this).closest('.thumbnail').index()
						const info = ctrl.model.getFiles()[idx]
						info.checked = $(this).getValue()

						ev.stopPropagation()
						elt.trigger('selchange', { isShareSelected: isShareSelected() })

					},
					onFolderClick: function (ev) {

						const idx = $(this).closest('.thumbnail').index()
						const info = ctrl.model.getFiles()[idx]

						const dirName = info.name
						const newDir = ctrl.model.rootDir + dirName + '/'
						ev.stopPropagation()
						elt.trigger('dirchange', { newDir })
						loadData(newDir)
					}

				}
			})

			async function loadData(rootDir, resetFilters) {
				if (rootDir == undefined) {
					rootDir = ctrl.model.rootDir
				}
				//console.log('loadData', rootDir)
				ctrl.setData({ loading: true })
				const files = await srvFiles.list(rootDir, { filterExtension, imageOnly, getMP3Info }, friendUser)
				//console.log('files', files)

				sortFiles(files)

				if (resetFilters !== false) {
					ctrl.model.mp3Filters = null
				}


				ctrl.setData({
					loading: false,
					files,
					rootDir,
					nbSelection: 0
				})

			}

			loadData()

			function isShareSelected() {
				return ctrl.model.rootDir == '/' &&
					(ctrl.model.files.findIndex((f) => f.name == 'share' && f.folder && f.checked) != -1)

			}

			this.getSelFiles = function () {
				const selFiles = []
				ctrl.model.files.forEach((f, idx) => {
					const { name, checked } = f
					if (checked === true && name != '..') {
						selFiles.push({ fileName: ctrl.model.rootDir + name, idx })
					}
				})
				//console.log('selFiles', selFiles)	
				return selFiles
			}

			this.getSelFileNames = () => {
				return this.getSelFiles().map((f) => f.fileName)
			}

			this.getNbSelFiles = function () {
				return elt.find('.check:checked').length
			}

			this.toggleSelection = function () {
				selected = !selected
				elt.find('.check').prop('checked', selected)
				ctrl.model.files.forEach((f) => { f.checked = selected })
				ctrl.updateArrayValue('files', 'files')
				elt.trigger('selchange', { isShareSelected: isShareSelected() })
			}

			this.getRootDir = function () {
				return ctrl.model.rootDir
			}

			this.insertFile = function (fileInfo, idx) {
				if (idx) {
					ctrl.insertArrayItemAfter('files', idx, fileInfo, 'files')
				}
				else {
					idx = ctrl.model.getFiles().filter((f) => f.folder).length
					//console.log('idx', idx)
					if (idx == 0) { // no folder, insert at the begining
						ctrl.insertArrayItemBefore('files', 0, fileInfo, 'files')
					}
					else { // insert after last folder
						ctrl.insertArrayItemAfter('files', idx - 1, fileInfo, 'files')
					}
				}
				//console.log('files', ctrl.model.files)
				ctrl.updateNode('info')

			}

			this.removeFiles = function (indexes) {
				ctrl.removeArrayItem('files', indexes, 'files')
				ctrl.updateNode('info')
				//console.log('files', ctrl.model.files)

			}

			this.updateFile = function (idx, info) {
				ctrl.updateArrayItem('files', idx, info, 'files')
			}

			this.updateFileInfo = async function (fileName, options) {
				const { files, rootDir } = ctrl.model
				let idx = ctrl.model.getFiles().findIndex((i) => i.name == fileName)
				//console.log('[FileCtrl] updateFile', idx, fileName, options)
				const info = await srvFiles.fileInfo(rootDir + fileName, friendUser, options)
				ctrl.updateArrayItem('files', idx, info)
				idx = files.findIndex((i) => i.name == fileName)
				files[idx] = info
				//console.log('files', files)
			}

			this.getFiles = function () {
				return ctrl.model.files.filter((f) => !f.folder)
			}

			this.getFilteredFiles = function () {
				return ctrl.model.getFiles().filter((f) => !f.folder)
			}

			this.reload = function () {
				//console.log('[FileCtrl] update')
				loadData(undefined, false)
			}

			this.setMP3Filters = function (mp3Filters) {
				ctrl.setData({ mp3Filters })
			}

			this.getMP3Filters = function () {
				return ctrl.model.mp3Filters
			}
		}
	});

})();
