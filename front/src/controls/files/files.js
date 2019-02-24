$$.control.registerControl('breizbot.files', {
	deps: ['breizbot.files'], 
	props: {
		toolbar: true,
		imageOnly: false,
		maxUploadSize: 2*1024*2014 // 2 Mo		
	},

	template: {gulp_inject: './files.html'},

	init: function(elt, srvFiles) {

		const ctrl = $$.viewController(elt, {
			
			data: {
				rootDir: '/',
				selectMode: false,
				files: [],
				selectedFiles: [],
				operation: 'none',
				getSize: function() {
					return 'Size : ' + Math.floor(this.f.size/1024) + ' Ko'
				},
				canSelect: function() {
					return this.f.name != '..' && this.selectMode
				},
				$hasSelection: function() {				
					return this.selectMode && elt.find('.check:checked').length > 0
				},
				$hasSelectedFiles: function() {
					return this.selectedFiles.length > 0
				}
			},
			events: {
				onFileClick: function(ev) {
					const fileName = $(this).closest('.thumbnail').data('name')
					//console.log('onFileClick', fileName)
					elt.trigger('fileclick', {fileName, rootDir: ctrl.model.rootDir})
				},
				onCheckClick: function(ev) {
					console.log('onCheckClick')
					ctrl.update('$hasSelection')
				},
				onFolderClick: function(ev) {
					const dirName = $(this).closest('.thumbnail').data('name')
					console.log('onFolderClick', dirName)
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
				onCreateFolder: function() {
					var rootDir = ctrl.model.rootDir
					$$.ui.showPrompt({
						content: 'Folder name:', 
						title: 'New Folder'
					}, function(folderName) {
						srvFiles.mkdir(rootDir + folderName)
						.then(function(resp) {
							console.log('resp', resp)
							loadData()
						})
						.catch(function(resp) {
							console.log('resp', resp)
							$$.ui.showAlert({
								content: resp.responseText,
								title: 'Error'
							})
						})	
					})
				},
				onToggleSelMode: function()	{
					console.log('onToggleSelMode')

					ctrl.setData({selectMode: !ctrl.model.selectMode})
					ctrl.update('files')
				},

				onDeleteFiles: function(ev) {

					const selFiles = getSelFiles()

					if (selFiles.length == 0) {
						$$.ui.showAlert({
							title: 'Delete files',
							content: 'No files selected'
						})
						return
					}

					$$.ui.showConfirm({
						content: 'Are you sure ?',
						title: 'Delete files'
					}, function() {
						srvFiles.removeFiles(selFiles)
						.then(function(resp) {
							console.log('resp', resp)
							loadData()
						})
						.catch(function(resp) {
							console.log('resp', resp)
							$$.ui.showAlert({
								content: resp.responseText,
								title: 'Error'
							})
						})					
					})					
				},
				onCutFiles: function(ev) {
					console.log('onCutFiles')
					ctrl.setData({
						selectedFiles: getSelFiles(),
						selectMode: false,
						operation: 'cut'
					})
					ctrl.update('files')
				},

				onCopyFiles: function(ev) {
					console.log('onCopyFiles')
					ctrl.setData({
						selectedFiles: getSelFiles(),
						selectMode: false,
						operation: 'copy'
					})
					ctrl.update('files')
				},
				onPasteFiles: function(ev) {
					console.log('onPasteFiles')
					const {rootDir, selectedFiles, operation} = ctrl.model
					const promise = 
						(operation == 'copy') ? srvFiles.copyFiles(selectedFiles, rootDir) : srvFiles.moveFiles(selectedFiles, rootDir)

					promise
					.then(function(resp) {
						console.log('resp', resp)
						ctrl.setData({selectedFiles: [], operation: 'none'})
						loadData()
					})
					.catch(function(resp) {
						console.log('resp', resp)
						ctrl.setData({selectedFiles: [], operation: 'none'})
						$$.ui.showAlert({
							content: resp.responseText,
							title: 'Error'
						})
					})						
				}
			}

		})

		function getSelFiles() {
			const selFiles = []
			elt.find('.check:checked').each(function() {
				const fileName = $(this).closest('.thumbnail').data('name')
				selFiles.push(ctrl.model.rootDir + fileName)
			})
			console.log('selFiles', selFiles)	
			return selFiles		
		}

		function loadData(rootDir) {
			//console.log('loadData', rootDir)
			if (rootDir == undefined) {
				rootDir = ctrl.model.rootDir
			}
			srvFiles.list(rootDir).then(function(files) {
				//console.log('files', files)
				if (rootDir != '/') {
					files.unshift({name: '..', folder: true})
				}
				ctrl.setData({files, rootDir, selectMode: false})

			})		
		}

		loadData()

	}

});
