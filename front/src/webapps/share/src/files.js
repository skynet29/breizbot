$$.control.registerControl('filesPage', {
	deps: ['breizbot.share'], 
	props: {
		$pager: null,
		userName: '',
		showThumbnail: true,
		thumbnailSize: '?x100'	
	},

	template: {gulp_inject: './files.html'},

	buttons: [
		{name: 'reload', icon: 'fa fa-sync-alt'}
	],

	init: function(elt, srvFiles) {

		const {
			$pager,
			userName,
			showThumbnail,
			thumbnailSize
		} = this.props

		const ctrl = $$.viewController(elt, {
			
			data: {
				rootDir: '/',
				files: [],
				showThumbnail,
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
				onFileClick: function(ev) {

					const info = $(this).closest('.thumbnail').data('info')
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
