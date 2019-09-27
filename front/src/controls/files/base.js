(function(){

function getIconClass(name) {
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

$$.control.registerControl('breizbot.fsbase', {
	props: {
		files: [],
		selectMode: false
	},

	template: {gulp_inject: './base.html'},

	init: function(elt, srvFiles) {

		const {
			files,
			selectMode
		} = this.props

		elt.addClass('w3-light-grey')

		const ctrl = $$.viewController(elt, {
			
			data: {
				selectMode: false,
				files,
				selectMode,
				data1: function() {return {items: this.f.items || {}}},
				if1: function() {
					return this.f.name != '..'
				},
				if2: function() {
					return !this.f.folder && !this.f.isImage
				},
				if3: function() {
					return !this.f.folder && this.f.isImage
				},
				attr1: function() {
					return {class: `fa fa-4x w3-text-blue-grey ${getIconClass(this.f.name)}`}
				},
				getSize: function() {
					let size = this.f.size
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

				getDimension: function() {
					const d = this.f.dimension
					return `Dimension: ${d.width}x${d.height}`
				},


				getDate: function() {
					const date = new Date(this.f.mtime).toLocaleDateString()
					return 'Last Modif: ' + date

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
					//console.log('onCheckClick', info)
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
			  return a.name.localeCompare(b.name)
			})			
		}

		this.setData = function(data) {
			//console.log('[fsbase] setData', data)

			let {files, selectMode, showThumbnail} = data
			if (Array.isArray(files)) {
				sortFiles(files)					
				ctrl.setData({files})
			}
			if (selectMode != undefined && selectMode != ctrl.model.selectMode) {
				ctrl.model.selectMode = selectMode
				elt.find('.check').setVisible(selectMode)
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
			//console.log('selFiles', selFiles)	
			return selFiles		
		}


	},

	$iface: 'update()',
	$events: 'fileclick'

});

})();

