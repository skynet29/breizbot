//@ts-check
(function () {

	/**
	 * 
	 * @param {{name: string, folder: boolean}} f
	 * @returns 
	 */
	function getIconClass(f) {
		let { name, folder } = f
		name = name.toLowerCase()
		if (folder) {
			return 'fa-folder-open w3-text-deep-orange'
		}
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

	$$.control.registerControl('breizbot.filelist', {
		deps: ['breizbot.files'],
		props: {
			selectionEnabled: false,
			filterExtension: undefined,
			getMP3Info: false,
			friendUser: '',
			mp3Filters: null,
		},

		template: { gulp_inject: './filelist.html' },

		/**
		 * 
		 * @param {*} elt 
		 * @param {Breizbot.Services.Files.Interface} srvFiles 
		 */
		init: function (elt, srvFiles) {


			/**@type {Breizbot.Controls.Files.Props} */
			let {
				selectionEnabled,
				filterExtension,
				friendUser,
				getMP3Info,
				mp3Filters,
			} = this.props

			const ctrl = $$.viewController(elt, {

				data: {
					loading: false,
					selectionEnabled,
					rootDir: '/',
					files: [],
					mp3Filters,

					getHeader: function () {
						const data = []
						data.push('')
						data.push('Name')
						if (getMP3Info) {
							data.push('Title')
							data.push('Artist')
						}
						else {
							data.push('Size')
							data.push('Last Modif')
						}
						return data.map((e) => `<th>${e}</th>`).join('')
					},
					getItem: function (scope) {
						const data = []
						data.push(`<i class="fa fa-2x ${getIconClass(scope.f)}"></i>`)
						data.push(scope.f.name)
						if (getMP3Info) {
							data.push(this.getTitle(scope))
							data.push(this.getArtist(scope))
						}
						else {
							data.push(this.getSize(scope))
							data.push(this.getDate(scope))
						}
						return data.map((e) => `<td>${e}</td>`).join('')

					},
					getIconClass: function (scope) {
						return { class: 'fa fa-lg ' + getIconClass(scope.f) }
					},

					getArtist: function (scope) {
						const { mp3 } = scope.f
						if (mp3 != undefined && mp3.artist) {
							return mp3.artist
						}
						return ''
					},

					getTitle: function (scope) {
						const { mp3 } = scope.f
						if (mp3 != undefined && mp3.title) {
							return mp3.title
						}
						return ''
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

					getSize: function (scope) {
						if (scope.f.folder) {
							return ''
						}
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
						return size + ' ' + unit
					},

					getDate: function (scope) {
						return new Date(scope.f.mtime).toLocaleDateString()

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

					onItemClick: function (ev) {
						ev.stopPropagation()

						const idx = $(this).index()
						console.log('idx', idx)
						const info = ctrl.model.getFiles()[idx]
						console.log('info', info)
						if (info.folder) {
							const dirName = info.name
							const newDir = ctrl.model.rootDir + dirName + '/'
							elt.trigger('dirchange', { newDir })
							loadData(newDir)

						}
						else {
							if (selectionEnabled) {
								$(this).closest('tbody').find('.active').removeClass('active')
								$(this).addClass('active')
							}

							const data = {
								fileName: info.name,
								rootDir: ctrl.model.rootDir,
								isImage: info.isImage,
								mp3: info.mp3
							}

							elt.trigger('fileclick', data)
						}

					}
				}
			})

			/**@type {JQuery} */
			const files = ctrl.scope.files

			async function loadData(rootDir, resetFilters) {
				if (rootDir == undefined) {
					rootDir = ctrl.model.rootDir
				}
				//console.log('loadData', rootDir)
				ctrl.setData({ loading: true })
				const files = await srvFiles.list(rootDir, { filterExtension, getMP3Info }, friendUser)
				//console.log('files', files)

				sortFiles(files)

				if (resetFilters !== false) {
					ctrl.model.mp3Filters = null
				}


				ctrl.setData({
					loading: false,
					files,
					rootDir
				})

				if (selectionEnabled) {
					ctrl.scope.files.find('.item').eq(0).addClass('active')
				}

			}

			loadData()


			this.getRootDir = function () {
				return ctrl.model.rootDir
			}

			this.enterSelFolder = function() {
				const selElt = files.find('.active')
				const idx = selElt.index()
				console.log('enterSelFolder', idx)
				const info = ctrl.model.getFiles()[idx]
				console.log('info', info)
				if (info.folder) {
					const dirName = info.name
					const newDir = ctrl.model.rootDir + dirName + '/'
					elt.trigger('dirchange', { newDir })
					loadData(newDir)

				}

			}

			this.selUp = function () {
				const selElt = files.find('.active')
				const idx = selElt.index()
				//console.log('selUp', idx)
				if (idx > 0) {
					selElt.removeClass('active')
					const items = files.find('.item')
					items.eq(idx - 1).addClass('active')
					if (idx -1 > 0) {
						items.eq(idx - 2).get(0).scrollIntoViewIfNeeded()
					}
					else {
						items.eq(idx - 1).get(0).scrollIntoViewIfNeeded()
					}
					//selElt.get(0).scrollIntoView()
				}
			}

			this.selDown = function () {
				const selElt = files.find('.active')
				const idx = selElt.index()
				//console.log('selDown', idx)
				if (idx < ctrl.model.files.length - 1) {
					selElt.removeClass('active')
					files.find('.item').eq(idx + 1).addClass('active').get(0).scrollIntoView(false)
				}
			}

			this.getSelFile = function () {
				const idx = ctrl.scope.files.find('.active').index()
				//console.log('idx', idx)
				if (idx < 0) return null
				const { mp3, name } = ctrl.model.getFiles()[idx]
				const url = srvFiles.fileUrl(ctrl.model.rootDir + name, friendUser)
				return { name, mp3, url }

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
