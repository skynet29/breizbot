$$.control.registerControl('breizbot.media', {

	deps: ['breizbot.media'], 


	template: {gulp_inject: './media.html'},

	init: function(elt, srvMedia) {


		const ctrl = $$.viewController(elt, {
			
			data: {
				rootDir: '/',
				files: [],
				drives: [],
				errorMsg: '',
				currentDrive: '',
				getSize: function(size) {
					return 'Size : ' + Math.floor(size/1024) + ' Ko'
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
					//console.log('onFileClick', info)
					const data = {
						fileName: info.name,
						rootDir: ctrl.model.rootDir,                       
						isImage: info.isImage,
						cmd
					}

					if ($pager != null) {
						$pager.popPage(data)
					}
					else {
						elt.trigger('fileclick', data)
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
				},

			}

		})

		function loadDrives() {
			srvMedia.drive().then(function(drives) {
				if (drives.length == 0) {
					return
				}
				const currentDrive = drives[0]
				ctrl.setData({drives, currentDrive})
				loadData()
			})
			.catch((err) => {
				ctrl.setData({errorMsg: err.responseText})
			})
		}


		function loadData(rootDir) {
			//console.log('loadData', rootDir)
			if (rootDir == undefined) {
				rootDir = ctrl.model.rootDir
			}
			srvMedia.list(ctrl.model.currentDrive, rootDir).then(function(files) {
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
					files.unshift({name: '..', folder: true})
				}

				ctrl.setData({files, rootDir})

			})		
		}

		loadDrives()

	},

	$iface: 'update()',
	$events: 'fileclick'

});
