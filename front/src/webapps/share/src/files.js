$$.control.registerControl('filesPage', {
	deps: ['app.share'], 
	props: {
		$pager: null,
		userName: '',
	},

	template: {gulp_inject: './files.html'},

	buttons: [
		{name: 'reload', icon: 'fa fa-sync-alt'}
	],

	init: function(elt, srvFiles) {

		const thumbnailSize = '100x?'

		const {
			$pager,
			userName,
		} = this.props

		const ctrl = $$.viewController(elt, {
			
			data: {
				rootDir: '/',
				files: [],
			},
			events: {
				onFileClick: function(ev, info) {
					console.log('onFileClick', info)

					const fullName = ctrl.model.rootDir + info.name

					const type = $$.util.getFileType(info.name)
					if (type != undefined) {
						$pager.pushPage('viewerPage', {
							title: info.name,
							props: {
								fullName,
								userName
							}
						})
					}					
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
				}

			}

		})


		function loadData(rootDir) {
			//console.log('loadData', rootDir)
			if (rootDir == undefined) {
				rootDir = ctrl.model.rootDir
			}
			srvFiles.list(userName, rootDir).then(function(files) {
				console.log('files', files)
				files.forEach((f) => {
					if (f.isImage) {
						f.thumbnailUrl = srvFiles.fileThumbnailUrl(userName, rootDir + f.name, thumbnailSize)
					}
				})

				if (rootDir != '/') {
					files.unshift({name: '..', folder: true})
				}

				ctrl.setData({files, rootDir})

			})		
		}

		loadData()

		this.onAction = function(cmd) {
			if (cmd == 'reload') {
				loadData()
			}
		}

	}


});
