$$.control.registerControl('app.media', {

	deps: ['app.media', 'breizbot.broker'],


	template: { gulp_inject: './media.html' },

	init: function (elt, srvMedia, broker) {


		const ctrl = $$.viewController(elt, {

			data: {
				rootDir: '/',
				files: [],
				drives: [],
				errorMsg: 'Homebox is not connected',
				currentDrive: '',
				showNoDevicesConnected: function () {
					return this.errorMsg == '' && !this.hasDrive()
				},
				hasDrive: function () {
					return this.drives.length > 0
				},
				getSize: function (size) {
					let unit = 'Ko'
					size /= 1024
					if (size > 1024) {
						unit = 'Mo'
						size /= 1024
					}
					return 'Size : ' + Math.floor(size) + ' ' + unit
				},
				getClass: function (scope) {
					const { name } = scope.f
					return `fa fa-4x w3-text-blue-grey ${this.getIconClass(name)}`
				},
				getTitle: function (scope) {
					const { name, size } = scope.f
					return name + '\n' + this.getSize(size)
				},
				getShortName: function (scope) {
					return scope.f.name.slice(0, 20)
				},

				getIconClass: function (name) {
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
				onFileClick: function (ev) {
					const idx = $(this).closest('.thumbnail').index()
					console.log('idx', idx)
					const info = ctrl.model.files[idx]
					console.log('onFileClick', info)
					const data = {
						driveName: ctrl.model.currentDrive,
						fileName: info.name,
						rootDir: ctrl.model.rootDir

					}

					elt.trigger('fileclick', data)
				},

				onFolderClick: function (ev) {
					const idx = $(this).closest('.thumbnail').index()
					console.log('idx', idx)
					const info = ctrl.model.files[idx]
					console.log('onFolderClick', info)

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

			}

		})

		function loadDrives() {
			console.log('loadDrives')
			srvMedia.drive().then(function (drives) {
				console.log('drives', drives)
				if (drives.length == 0) {
					ctrl.setData({ drives: [], errorMsg: 'No USB drive connected to your homebox' })
					return
				}
				const currentDrive = drives[0]
				ctrl.setData({ drives, currentDrive, errorMsg: '' })
				loadData()
			})
				.catch((err) => {
					ctrl.setData({ errorMsg: err.responseText })
				})
		}


		function loadData(rootDir) {
			//console.log('loadData', rootDir)
			if (rootDir == undefined) {
				rootDir = ctrl.model.rootDir
			}
			srvMedia.list(ctrl.model.currentDrive, rootDir).then(function (files) {
				console.log('files', files)

				files.sort((a, b) => {
					if (a.folder && !b.folder) {
						return -1
					}
					if (!a.folder && b.folder) {
						return 1
					}
					return a.name > b.name
				})

				if (rootDir != '/') {
					files.unshift({ name: '..', folder: true })
				}

				ctrl.setData({ files, rootDir })

			})
		}

		broker.register('homebox.launcher.status', async (msg) => {
			console.log('launcherStatus', msg.data.media)
			const { media } = msg.data
			if (media) {
				if (media.state == 'run') {
					await $$.util.wait(1000)
					loadDrives()
				}
				else {
					ctrl.setData({ errorMsg: 'Media service is not running', drives: [] })
				}
			}
		})

		broker.register('breizbot.homebox.status', (msg) => {
			console.log('breizbot.homebox.status', msg.data)
			const { connected } = msg.data
			if (!connected) {
				ctrl.setData({ errorMsg: 'Homebox is not connected', drives: [] })
			}
		})


	}


});
