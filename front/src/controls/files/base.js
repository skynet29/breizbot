$$.control.registerControl('breizbot.fsbase', {
	props: {
		files: [],
		showThumbnail: true,
		selectMode: false
	},

	template: {gulp_inject: './base.html'},

	init: function(elt, srvFiles) {

		const {
			files,
			showThumbnail,
			selectMode
		} = this.props

		elt.addClass('w3-light-grey')

		const ctrl = $$.viewController(elt, {
			
			data: {
				selectMode: false,
				files,
				showThumbnail,
				selectMode,
				getSize: function(size) {
					let unit = 'octets'
					if (size > 1024) {
						unit = 'Ko'
						size /= 1024
					}

					if (size > 1024) {
						unit = 'Mo'
						size /= 1024
					}

					size = Math.floor(size*10)/10
					return 'Size: ' + size + ' ' + unit
				},

				getDimension: function(d) {
					return `Dimension: ${d.width}x${d.height}`
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
					const idx = $(this).closest('.thumbnail').index()					
					const info = ctrl.model.files[idx]
					//console.log('onFileClick', info)
					elt.trigger('fileclick', info)
				},
				onCheckClick: function(ev) {
					const idx = $(this).closest('.thumbnail').index()					
					const info = ctrl.model.files[idx]
					console.log('onCheckClick', info)
					elt.trigger('checkclick', [info, $(this).getValue()])

				},
				onFolderClick: function(ev) {
					const idx = $(this).closest('.thumbnail').index()					
					const info = ctrl.model.files[idx]
					//console.log('onFolderClick', info)
					elt.trigger('folderclick', info)
				},
				onContextMenu: function(ev, data) {
					const idx = $(this).closest('.thumbnail').index()					
					const info = ctrl.model.files[idx]
					//console.log('onContextMenu', data, info)
					elt.trigger('itemcontextmenu', [data.cmd, info])
				}

			}

		})

		function sortFiles(files) {
			files.sort((a, b) => {
			  if (a.folder && !b.folder) {
			    return -1
			  }
			  if (!a.folder && b.folder) {
			    return 1
			  }
			  return a.name > b.name
			})			
		}

		this.setData = function(data) {
			console.log('[fsbase] setData', data)

			let {files, selectMode, showThumbnail} = data
			if (Array.isArray(files)) {
				sortFiles(files)					
				ctrl.setData({files})
			}
			if (selectMode != undefined && selectMode != ctrl.model.selectMode) {
				ctrl.model.selectMode = selectMode
				ctrl.forceUpdate('files')
			}
			if (showThumbnail != undefined && showThumbnail != ctrl.model.showThumbnail) {
				ctrl.setData({showThumbnail})
			}
		}

		this.getSelFiles = function() {
			const selFiles = []
			elt.find('.check:checked').each(function() {
				const idx = $(this).closest('.thumbnail').index()					
				const info = ctrl.model.files[idx]
				
				selFiles.push(info)
			})
			console.log('selFiles', selFiles)	
			return selFiles		
		}


	},

	$iface: 'update()',
	$events: 'fileclick'

});
