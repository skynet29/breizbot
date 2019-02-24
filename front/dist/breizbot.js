$$.control.registerControl('breizbot.apps', {

	props: {
		apps: []
	},

	template: "<div bn-each=\"app of apps\" class=\"main\" bn-event=\"click.tile: onTileClick\">			\n	<div class=\"tile w3-btn\" bn-attr=\"class: getClass\" bn-data=\"item: app\">\n		<div bn-show=\"hasIcon\" style=\"margin-bottom: 5px;\">\n			<i bn-attr=\"class: app.props.iconCls\"></i>\n		</div>\n\n		<span bn-text=\"app.props.title\"></span>\n	</div>\n\n</div>",

	init: function(elt) {

		const ctrl = $$.viewController(elt, {
			data: {
				apps: this.props.apps,
				getClass: function() {
					const classes = ['tile', 'w3-btn']
					classes.push(this.app.props.colorCls)
					return classes.join(' ')
				},
				hasIcon: function() {
					return typeof this.app.props.iconCls == 'string'
				}
			},
			events: {
				onTileClick: function(ev) {
					//console.log('onTileClick', $(this).data('item'))
					elt.trigger('appclick', $(this).data('item'))
				}
			}
		})

		this.setApps = function(apps) {
			ctrl.setData({apps})
		}
	}
});


$$.control.registerControl('breizbot.files', {
	deps: ['breizbot.files'], 
	props: {
		toolbar: true,
		imageOnly: false,
		maxUploadSize: 2*1024*2014 // 2 Mo		
	},

	template: "<div class=\"contentPanel\">\n\n	<div class=\"toolbar\">\n		<div bn-control=\"brainjs.controlgroup\">\n			<button \n				title=\"New folder\"\n				bn-event=\"click: onCreateFolder\"\n			><i class=\"fa fa-folder-open\"></i></button>		\n		</div>\n\n		<div bn-control=\"brainjs.controlgroup\">\n			<button \n				title=\"Toggle Select Mode\"\n				bn-event=\"click: onToggleSelMode\"\n			><i class=\"fa fa-check\"></i></button>		\n		</div>\n\n		<div bn-control=\"brainjs.controlgroup\">\n			<button title=\"Delete\"\n				bn-event=\"click: onDeleteFiles\"\n				bn-prop=\"disabled: !$hasSelection\"\n			><i class=\"fa fa-trash\"></i></button>\n\n			<button title=\"Cut\"\n				bn-prop=\"disabled: !$hasSelection\"\n				bn-event=\"click: onCutFiles\"\n			><i class=\"fa fa-cut\"></i></button>	\n\n			<button title=\"Copy\"\n				bn-prop=\"disabled: !$hasSelection\"\n				bn-event=\"click: onCopyFiles\"\n				><i class=\"fa fa-copy\"></i></button>\n\n			<button title=\"Paste\"\n				bn-prop=\"disabled: !$hasSelectedFiles\"\n				bn-event=\"click: onPasteFiles\"\n			><i class=\"fa fa-paste\"></i></button>		\n		</div>\n	</div>\n\n	<div class=\"pathPanel\">\n		Path:&nbsp;<span bn-text=\"rootDir\"></span>\n	</div>\n\n\n	<div bn-each=\"f of files\" class=\"container\" \n	bn-event=\"click.folder: onFolderClick, click.check: onCheckClick, click.file: onFileClick\">\n		\n		<div class=\"thumbnail w3-btn\" bn-data=\"name: f.name\">	\n				<input type=\"checkbox\" bn-show=\"canSelect\" class=\"check w3-check\">		\n				<div bn-show=\"f.folder\" class=\"folder\">\n					<div>\n						<i class=\"fa fa-4x fa-folder-open w3-text-blue-grey\"></i>\n					</div>\n					\n					<span bn-text=\"f.name\"></span>\n				</div>\n				<div bn-show=\"!f.folder\" bn-attr=\"title: getSize\" class=\"file\">\n					<div>\n						<i class=\"fa fa-4x fa-file w3-text-blue-grey\"></i>\n					</div>\n					\n					<span bn-text=\"f.name\"></span>\n				</div>			\n			\n		</div>\n	</div>\n</div>",

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

$$.control.registerControl('breizbot.header', {

	props: {
		userName: 'Unknown',
		showHome: true,
		title: ''
	},

	template: "<div class=\"header w3-teal\">\n	<div>\n		<a bn-show=\"showHome\" class=\"w3-button\" href=\"/\" title=\"Go Home\">\n			<i class=\"fa fa-home fa-lg\"></i>\n		</a>		\n	</div>\n\n	<span bn-text=\"title\"></span>\n	<div bn-control=\"brainjs.contextmenu\" \n		bn-data=\"items: items\" \n		data-trigger=\"left\" \n		class=\"w3-button\" \n		bn-event=\"contextmenuchange: onContextMenu\">\n			<i class=\"fa fa-user fa-lg\"></i>\n			<span bn-text=\"userName\"></span>	    	\n	</div>\n	\n</div>",

	init: function(elt) {

		$$.viewController(elt, {
			data: {
				items: {
					pwd: {name: 'Change password', icon: 'fa-lock'},
					apps: {name: 'Applications', icon: 'fa-th'},
					sep: '------',
					logout: {name: 'Logout', icon: 'fa-power-off'}
				},
				userName: this.props.userName,
				showHome: this.props.showHome,
				title: this.props.title
			},
			events: {
				onContextMenu: function(ev, data) {
					console.log('onContextMenu', data)
					if (data.cmd == 'logout') {
						location.href = '/logout'
					}
					if (data.cmd == 'apps') {
						location.href = '/apps/store'
					}
				}
			}
		})
	}
});

$$.control.registerControl('breizbot.home', {

	deps: ['breizbot.apps'],

	template: "<div bn-control=\"breizbot.apps\" \n	bn-data=\"apps: apps\"\n	bn-event=\"appclick: onAppClick\" \n	style=\"height: 100%\">\n		\n	</div>\n",

	init: function(elt, srvApps) {

		const ctrl = $$.viewController(elt, {
			data: {
				apps: []
			},
			events: {
				onAppClick: function(ev, data) {
					location.href = '/apps/' + data.appName
				}
			}
		})

		srvApps.listMyApp().then((apps) => {
			console.log('apps', apps)
			ctrl.setData({apps})
		})
	}
});

$$.control.registerControl('breizbot.users', {
	deps: ['breizbot.users'],

	template: "<div class=\"main\">\n	<button bn-event=\"click: onAddUser\" class=\"w3-btn w3-blue btnAddUser\">Add User</button>\n	<div bn-control=\"brainjs.table\"\n		bn-event=\"tablecmd: onTableCmd\"\n		bn-data=\"columns: columns, data: data\"></div>	\n</div>\n",

	init: function(elt, users) {



		const dlgAddUser = $$.formDialogController({
			title: 'Add User',
			template: "<div class=\"breizbot-users dlgAddUser\">\n	<input type=\"text\" placeholder=\"username\" name=\"username\" required>\n	<input type=\"text\" placeholder=\"pseudo\" name=\"pseudo\" required>\n	<input type=\"text\" placeholder=\"location\" name=\"location\" required>\n	<input type=\"email\" placeholder=\"email\" name=\"email\" required>	\n</div>\n"
		})

		const ctrl = $$.viewController(elt, {
			data: {
				columns: [
					{name: 'username', label: 'User Name'},
					{name: 'pseudo', label: 'Pseudo'},
					{name: 'location', label: 'Location'},
					{name: 'email', label: 'Email'},
					{label: 'Actions', buttons: [
						{cmd: 'delete', title: 'Delete', icon: 'fa fa-trash'}
					]}
				],
				data: []
			},
			events: {
				onAddUser: function(ev) {
					dlgAddUser.show(function(data) {
						users.add(data).then(getUsers)
					})
				},
				onTableCmd: function(ev, evdata) {
					const {data, cmd} = evdata
					if (cmd == 'delete') {
						$$.ui.showConfirm({title: 'Delete User', content: 'Are you sure ?'}, function() {
							users.remove(data.username).then(getUsers)
						})
					}
				}
			}
		})

		function getUsers() {
			users.list().then((data) => {
				console.log('data', data)
				ctrl.setData({data})
			})			
		}

		getUsers()

	}
});

$$.service.registerService('breizbot.apps', ['brainjs.http'], function(config, http) {


	return {
		listAll: function() {
			return http.get('/api/apps/all')
		},

		listMyApp: function() {
			return http.get('/api/apps/myapp')
		}
		
	}
});

$$.service.registerService('breizbot.files', ['brainjs.http'], function(config, http) {

	return {
		list: function(path, imageOnly, folderOnly) {
			console.log('[FileService] list', path)

			return http.post('/api/files/list', {path, imageOnly, folderOnly})
		},

		fileUrl: function(fileName) {
			return '/api/files/load?fileName=' + fileName
		},

		uploadFile: function(dataUrl, saveAsfileName, destPath) {
			console.log('[FileService] uploadFile', saveAsfileName)
			var blob = $$.util.dataURLtoBlob(dataUrl)
			if (blob == undefined) {
				return Promise.reject('File format not supported')
			}
			//console.log('blob', blob)
			var fd = new FormData()
			fd.append('file', blob, saveAsfileName)
			fd.append('destPath', destPath)
			return http.postFormData('/api/files/save', fd)
		},

		removeFiles: function(fileNames) {
			console.log('[FileService] removeFiles', fileNames)
			return http.post('/api/files/delete', fileNames)
		},

		mkdir: function(fileName) {
			console.log('[FileService] mkdir', fileName)
			return http.post('/api/files/mkdir', {fileName})
		},

		moveFiles: function(fileNames, destPath) {
			console.log('[FileService] moveFiles', fileNames, destPath)
			return http.post('/api/files/move', {fileNames, destPath})
		},

		copyFiles: function(fileNames, destPath) {
			console.log('[FileService] copyFiles', fileNames, destPath)
			return http.post('/api/files/copy', {fileNames, destPath})
		}	
	}

});

$$.service.registerService('breizbot.users', ['brainjs.http'], function(config, http) {


	return {
		list: function() {
			return http.get('/api/users')
		},

		add: function(data) {
			return http.post('/api/users', data)
		},

		remove: function(user) {
			return http.delete(`/api/users/${user}`)
		},

		update: function(user, data) {
			return http.put(`/api/users/${user}`, data)
		},

		get: function(user) {
			return http.get(`/api/users/${user}`)
		},

		activateApp: function(appName, activated) {
			return http.post(`/api/users/activateApp`, {appName, activated})
		}


		
	}
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcHMvYXBwcy5qcyIsImZpbGVzL2ZpbGVzLmpzIiwiaGVhZGVyL2hlYWRlci5qcyIsImhvbWUvaG9tZS5qcyIsInVzZXJzL3VzZXJzLmpzIiwiYXBwcy5qcyIsImZpbGVzLmpzIiwidXNlcnMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN0Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJicmVpemJvdC5qcyIsInNvdXJjZXNDb250ZW50IjpbIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5hcHBzJywge1xuXG5cdHByb3BzOiB7XG5cdFx0YXBwczogW11cblx0fSxcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGJuLWVhY2g9XFxcImFwcCBvZiBhcHBzXFxcIiBjbGFzcz1cXFwibWFpblxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrLnRpbGU6IG9uVGlsZUNsaWNrXFxcIj5cdFx0XHRcXG5cdDxkaXYgY2xhc3M9XFxcInRpbGUgdzMtYnRuXFxcIiBibi1hdHRyPVxcXCJjbGFzczogZ2V0Q2xhc3NcXFwiIGJuLWRhdGE9XFxcIml0ZW06IGFwcFxcXCI+XFxuXHRcdDxkaXYgYm4tc2hvdz1cXFwiaGFzSWNvblxcXCIgc3R5bGU9XFxcIm1hcmdpbi1ib3R0b206IDVweDtcXFwiPlxcblx0XHRcdDxpIGJuLWF0dHI9XFxcImNsYXNzOiBhcHAucHJvcHMuaWNvbkNsc1xcXCI+PC9pPlxcblx0XHQ8L2Rpdj5cXG5cXG5cdFx0PHNwYW4gYm4tdGV4dD1cXFwiYXBwLnByb3BzLnRpdGxlXFxcIj48L3NwYW4+XFxuXHQ8L2Rpdj5cXG5cXG48L2Rpdj5cIixcblxuXHRpbml0OiBmdW5jdGlvbihlbHQpIHtcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0YXBwczogdGhpcy5wcm9wcy5hcHBzLFxuXHRcdFx0XHRnZXRDbGFzczogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Y29uc3QgY2xhc3NlcyA9IFsndGlsZScsICd3My1idG4nXVxuXHRcdFx0XHRcdGNsYXNzZXMucHVzaCh0aGlzLmFwcC5wcm9wcy5jb2xvckNscylcblx0XHRcdFx0XHRyZXR1cm4gY2xhc3Nlcy5qb2luKCcgJylcblx0XHRcdFx0fSxcblx0XHRcdFx0aGFzSWNvbjogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHR5cGVvZiB0aGlzLmFwcC5wcm9wcy5pY29uQ2xzID09ICdzdHJpbmcnXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25UaWxlQ2xpY2s6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25UaWxlQ2xpY2snLCAkKHRoaXMpLmRhdGEoJ2l0ZW0nKSlcblx0XHRcdFx0XHRlbHQudHJpZ2dlcignYXBwY2xpY2snLCAkKHRoaXMpLmRhdGEoJ2l0ZW0nKSlcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHR0aGlzLnNldEFwcHMgPSBmdW5jdGlvbihhcHBzKSB7XG5cdFx0XHRjdHJsLnNldERhdGEoe2FwcHN9KVxuXHRcdH1cblx0fVxufSk7XG5cbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5maWxlcycsIHtcblx0ZGVwczogWydicmVpemJvdC5maWxlcyddLCBcblx0cHJvcHM6IHtcblx0XHR0b29sYmFyOiB0cnVlLFxuXHRcdGltYWdlT25seTogZmFsc2UsXG5cdFx0bWF4VXBsb2FkU2l6ZTogMioxMDI0KjIwMTQgLy8gMiBNb1x0XHRcblx0fSxcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGNsYXNzPVxcXCJjb250ZW50UGFuZWxcXFwiPlxcblxcblx0PGRpdiBjbGFzcz1cXFwidG9vbGJhclxcXCI+XFxuXHRcdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb250cm9sZ3JvdXBcXFwiPlxcblx0XHRcdDxidXR0b24gXFxuXHRcdFx0XHR0aXRsZT1cXFwiTmV3IGZvbGRlclxcXCJcXG5cdFx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25DcmVhdGVGb2xkZXJcXFwiXFxuXHRcdFx0PjxpIGNsYXNzPVxcXCJmYSBmYS1mb2xkZXItb3BlblxcXCI+PC9pPjwvYnV0dG9uPlx0XHRcXG5cdFx0PC9kaXY+XFxuXFxuXHRcdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb250cm9sZ3JvdXBcXFwiPlxcblx0XHRcdDxidXR0b24gXFxuXHRcdFx0XHR0aXRsZT1cXFwiVG9nZ2xlIFNlbGVjdCBNb2RlXFxcIlxcblx0XHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvblRvZ2dsZVNlbE1vZGVcXFwiXFxuXHRcdFx0PjxpIGNsYXNzPVxcXCJmYSBmYS1jaGVja1xcXCI+PC9pPjwvYnV0dG9uPlx0XHRcXG5cdFx0PC9kaXY+XFxuXFxuXHRcdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb250cm9sZ3JvdXBcXFwiPlxcblx0XHRcdDxidXR0b24gdGl0bGU9XFxcIkRlbGV0ZVxcXCJcXG5cdFx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25EZWxldGVGaWxlc1xcXCJcXG5cdFx0XHRcdGJuLXByb3A9XFxcImRpc2FibGVkOiAhJGhhc1NlbGVjdGlvblxcXCJcXG5cdFx0XHQ+PGkgY2xhc3M9XFxcImZhIGZhLXRyYXNoXFxcIj48L2k+PC9idXR0b24+XFxuXFxuXHRcdFx0PGJ1dHRvbiB0aXRsZT1cXFwiQ3V0XFxcIlxcblx0XHRcdFx0Ym4tcHJvcD1cXFwiZGlzYWJsZWQ6ICEkaGFzU2VsZWN0aW9uXFxcIlxcblx0XHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvbkN1dEZpbGVzXFxcIlxcblx0XHRcdD48aSBjbGFzcz1cXFwiZmEgZmEtY3V0XFxcIj48L2k+PC9idXR0b24+XHRcXG5cXG5cdFx0XHQ8YnV0dG9uIHRpdGxlPVxcXCJDb3B5XFxcIlxcblx0XHRcdFx0Ym4tcHJvcD1cXFwiZGlzYWJsZWQ6ICEkaGFzU2VsZWN0aW9uXFxcIlxcblx0XHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvbkNvcHlGaWxlc1xcXCJcXG5cdFx0XHRcdD48aSBjbGFzcz1cXFwiZmEgZmEtY29weVxcXCI+PC9pPjwvYnV0dG9uPlxcblxcblx0XHRcdDxidXR0b24gdGl0bGU9XFxcIlBhc3RlXFxcIlxcblx0XHRcdFx0Ym4tcHJvcD1cXFwiZGlzYWJsZWQ6ICEkaGFzU2VsZWN0ZWRGaWxlc1xcXCJcXG5cdFx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25QYXN0ZUZpbGVzXFxcIlxcblx0XHRcdD48aSBjbGFzcz1cXFwiZmEgZmEtcGFzdGVcXFwiPjwvaT48L2J1dHRvbj5cdFx0XFxuXHRcdDwvZGl2Plxcblx0PC9kaXY+XFxuXFxuXHQ8ZGl2IGNsYXNzPVxcXCJwYXRoUGFuZWxcXFwiPlxcblx0XHRQYXRoOiZuYnNwOzxzcGFuIGJuLXRleHQ9XFxcInJvb3REaXJcXFwiPjwvc3Bhbj5cXG5cdDwvZGl2Plxcblxcblxcblx0PGRpdiBibi1lYWNoPVxcXCJmIG9mIGZpbGVzXFxcIiBjbGFzcz1cXFwiY29udGFpbmVyXFxcIiBcXG5cdGJuLWV2ZW50PVxcXCJjbGljay5mb2xkZXI6IG9uRm9sZGVyQ2xpY2ssIGNsaWNrLmNoZWNrOiBvbkNoZWNrQ2xpY2ssIGNsaWNrLmZpbGU6IG9uRmlsZUNsaWNrXFxcIj5cXG5cdFx0XFxuXHRcdDxkaXYgY2xhc3M9XFxcInRodW1ibmFpbCB3My1idG5cXFwiIGJuLWRhdGE9XFxcIm5hbWU6IGYubmFtZVxcXCI+XHRcXG5cdFx0XHRcdDxpbnB1dCB0eXBlPVxcXCJjaGVja2JveFxcXCIgYm4tc2hvdz1cXFwiY2FuU2VsZWN0XFxcIiBjbGFzcz1cXFwiY2hlY2sgdzMtY2hlY2tcXFwiPlx0XHRcXG5cdFx0XHRcdDxkaXYgYm4tc2hvdz1cXFwiZi5mb2xkZXJcXFwiIGNsYXNzPVxcXCJmb2xkZXJcXFwiPlxcblx0XHRcdFx0XHQ8ZGl2Plxcblx0XHRcdFx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS00eCBmYS1mb2xkZXItb3BlbiB3My10ZXh0LWJsdWUtZ3JleVxcXCI+PC9pPlxcblx0XHRcdFx0XHQ8L2Rpdj5cXG5cdFx0XHRcdFx0XFxuXHRcdFx0XHRcdDxzcGFuIGJuLXRleHQ9XFxcImYubmFtZVxcXCI+PC9zcGFuPlxcblx0XHRcdFx0PC9kaXY+XFxuXHRcdFx0XHQ8ZGl2IGJuLXNob3c9XFxcIiFmLmZvbGRlclxcXCIgYm4tYXR0cj1cXFwidGl0bGU6IGdldFNpemVcXFwiIGNsYXNzPVxcXCJmaWxlXFxcIj5cXG5cdFx0XHRcdFx0PGRpdj5cXG5cdFx0XHRcdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtNHggZmEtZmlsZSB3My10ZXh0LWJsdWUtZ3JleVxcXCI+PC9pPlxcblx0XHRcdFx0XHQ8L2Rpdj5cXG5cdFx0XHRcdFx0XFxuXHRcdFx0XHRcdDxzcGFuIGJuLXRleHQ9XFxcImYubmFtZVxcXCI+PC9zcGFuPlxcblx0XHRcdFx0PC9kaXY+XHRcdFx0XFxuXHRcdFx0XFxuXHRcdDwvZGl2Plxcblx0PC9kaXY+XFxuPC9kaXY+XCIsXG5cblx0aW5pdDogZnVuY3Rpb24oZWx0LCBzcnZGaWxlcykge1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdHJvb3REaXI6ICcvJyxcblx0XHRcdFx0c2VsZWN0TW9kZTogZmFsc2UsXG5cdFx0XHRcdGZpbGVzOiBbXSxcblx0XHRcdFx0c2VsZWN0ZWRGaWxlczogW10sXG5cdFx0XHRcdG9wZXJhdGlvbjogJ25vbmUnLFxuXHRcdFx0XHRnZXRTaXplOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gJ1NpemUgOiAnICsgTWF0aC5mbG9vcih0aGlzLmYuc2l6ZS8xMDI0KSArICcgS28nXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGNhblNlbGVjdDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuZi5uYW1lICE9ICcuLicgJiYgdGhpcy5zZWxlY3RNb2RlXG5cdFx0XHRcdH0sXG5cdFx0XHRcdCRoYXNTZWxlY3Rpb246IGZ1bmN0aW9uKCkge1x0XHRcdFx0XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuc2VsZWN0TW9kZSAmJiBlbHQuZmluZCgnLmNoZWNrOmNoZWNrZWQnKS5sZW5ndGggPiAwXG5cdFx0XHRcdH0sXG5cdFx0XHRcdCRoYXNTZWxlY3RlZEZpbGVzOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5zZWxlY3RlZEZpbGVzLmxlbmd0aCA+IDBcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvbkZpbGVDbGljazogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRjb25zdCBmaWxlTmFtZSA9ICQodGhpcykuY2xvc2VzdCgnLnRodW1ibmFpbCcpLmRhdGEoJ25hbWUnKVxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uRmlsZUNsaWNrJywgZmlsZU5hbWUpXG5cdFx0XHRcdFx0ZWx0LnRyaWdnZXIoJ2ZpbGVjbGljaycsIHtmaWxlTmFtZSwgcm9vdERpcjogY3RybC5tb2RlbC5yb290RGlyfSlcblx0XHRcdFx0fSxcblx0XHRcdFx0b25DaGVja0NsaWNrOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbkNoZWNrQ2xpY2snKVxuXHRcdFx0XHRcdGN0cmwudXBkYXRlKCckaGFzU2VsZWN0aW9uJylcblx0XHRcdFx0fSxcblx0XHRcdFx0b25Gb2xkZXJDbGljazogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRjb25zdCBkaXJOYW1lID0gJCh0aGlzKS5jbG9zZXN0KCcudGh1bWJuYWlsJykuZGF0YSgnbmFtZScpXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uRm9sZGVyQ2xpY2snLCBkaXJOYW1lKVxuXHRcdFx0XHRcdGlmIChkaXJOYW1lID09ICcuLicpIHtcblx0XHRcdFx0XHRcdGNvbnN0IHNwbGl0ID0gY3RybC5tb2RlbC5yb290RGlyLnNwbGl0KCcvJylcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdHNwbGl0LnBvcCgpXG5cdFx0XHRcdFx0XHRzcGxpdC5wb3AoKVx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0bG9hZERhdGEoc3BsaXQuam9pbignLycpICsgJy8nKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRcdGxvYWREYXRhKGN0cmwubW9kZWwucm9vdERpciArIGRpck5hbWUgKyAnLycpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkNyZWF0ZUZvbGRlcjogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0dmFyIHJvb3REaXIgPSBjdHJsLm1vZGVsLnJvb3REaXJcblx0XHRcdFx0XHQkJC51aS5zaG93UHJvbXB0KHtcblx0XHRcdFx0XHRcdGNvbnRlbnQ6ICdGb2xkZXIgbmFtZTonLCBcblx0XHRcdFx0XHRcdHRpdGxlOiAnTmV3IEZvbGRlcidcblx0XHRcdFx0XHR9LCBmdW5jdGlvbihmb2xkZXJOYW1lKSB7XG5cdFx0XHRcdFx0XHRzcnZGaWxlcy5ta2Rpcihyb290RGlyICsgZm9sZGVyTmFtZSlcblx0XHRcdFx0XHRcdC50aGVuKGZ1bmN0aW9uKHJlc3ApIHtcblx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKVxuXHRcdFx0XHRcdFx0XHRsb2FkRGF0YSgpXG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0LmNhdGNoKGZ1bmN0aW9uKHJlc3ApIHtcblx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKVxuXHRcdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe1xuXHRcdFx0XHRcdFx0XHRcdGNvbnRlbnQ6IHJlc3AucmVzcG9uc2VUZXh0LFxuXHRcdFx0XHRcdFx0XHRcdHRpdGxlOiAnRXJyb3InXG5cdFx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XHR9KVx0XG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fSxcblx0XHRcdFx0b25Ub2dnbGVTZWxNb2RlOiBmdW5jdGlvbigpXHR7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uVG9nZ2xlU2VsTW9kZScpXG5cblx0XHRcdFx0XHRjdHJsLnNldERhdGEoe3NlbGVjdE1vZGU6ICFjdHJsLm1vZGVsLnNlbGVjdE1vZGV9KVxuXHRcdFx0XHRcdGN0cmwudXBkYXRlKCdmaWxlcycpXG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0b25EZWxldGVGaWxlczogZnVuY3Rpb24oZXYpIHtcblxuXHRcdFx0XHRcdGNvbnN0IHNlbEZpbGVzID0gZ2V0U2VsRmlsZXMoKVxuXG5cdFx0XHRcdFx0aWYgKHNlbEZpbGVzLmxlbmd0aCA9PSAwKSB7XG5cdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe1xuXHRcdFx0XHRcdFx0XHR0aXRsZTogJ0RlbGV0ZSBmaWxlcycsXG5cdFx0XHRcdFx0XHRcdGNvbnRlbnQ6ICdObyBmaWxlcyBzZWxlY3RlZCdcblx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XHRyZXR1cm5cblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQkJC51aS5zaG93Q29uZmlybSh7XG5cdFx0XHRcdFx0XHRjb250ZW50OiAnQXJlIHlvdSBzdXJlID8nLFxuXHRcdFx0XHRcdFx0dGl0bGU6ICdEZWxldGUgZmlsZXMnXG5cdFx0XHRcdFx0fSwgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRzcnZGaWxlcy5yZW1vdmVGaWxlcyhzZWxGaWxlcylcblx0XHRcdFx0XHRcdC50aGVuKGZ1bmN0aW9uKHJlc3ApIHtcblx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKVxuXHRcdFx0XHRcdFx0XHRsb2FkRGF0YSgpXG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0LmNhdGNoKGZ1bmN0aW9uKHJlc3ApIHtcblx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKVxuXHRcdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe1xuXHRcdFx0XHRcdFx0XHRcdGNvbnRlbnQ6IHJlc3AucmVzcG9uc2VUZXh0LFxuXHRcdFx0XHRcdFx0XHRcdHRpdGxlOiAnRXJyb3InXG5cdFx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XHR9KVx0XHRcdFx0XHRcblx0XHRcdFx0XHR9KVx0XHRcdFx0XHRcblx0XHRcdFx0fSxcblx0XHRcdFx0b25DdXRGaWxlczogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25DdXRGaWxlcycpXG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHtcblx0XHRcdFx0XHRcdHNlbGVjdGVkRmlsZXM6IGdldFNlbEZpbGVzKCksXG5cdFx0XHRcdFx0XHRzZWxlY3RNb2RlOiBmYWxzZSxcblx0XHRcdFx0XHRcdG9wZXJhdGlvbjogJ2N1dCdcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdGN0cmwudXBkYXRlKCdmaWxlcycpXG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0b25Db3B5RmlsZXM6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uQ29weUZpbGVzJylcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoe1xuXHRcdFx0XHRcdFx0c2VsZWN0ZWRGaWxlczogZ2V0U2VsRmlsZXMoKSxcblx0XHRcdFx0XHRcdHNlbGVjdE1vZGU6IGZhbHNlLFxuXHRcdFx0XHRcdFx0b3BlcmF0aW9uOiAnY29weSdcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdGN0cmwudXBkYXRlKCdmaWxlcycpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uUGFzdGVGaWxlczogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25QYXN0ZUZpbGVzJylcblx0XHRcdFx0XHRjb25zdCB7cm9vdERpciwgc2VsZWN0ZWRGaWxlcywgb3BlcmF0aW9ufSA9IGN0cmwubW9kZWxcblx0XHRcdFx0XHRjb25zdCBwcm9taXNlID0gXG5cdFx0XHRcdFx0XHQob3BlcmF0aW9uID09ICdjb3B5JykgPyBzcnZGaWxlcy5jb3B5RmlsZXMoc2VsZWN0ZWRGaWxlcywgcm9vdERpcikgOiBzcnZGaWxlcy5tb3ZlRmlsZXMoc2VsZWN0ZWRGaWxlcywgcm9vdERpcilcblxuXHRcdFx0XHRcdHByb21pc2Vcblx0XHRcdFx0XHQudGhlbihmdW5jdGlvbihyZXNwKSB7XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdFx0XHRjdHJsLnNldERhdGEoe3NlbGVjdGVkRmlsZXM6IFtdLCBvcGVyYXRpb246ICdub25lJ30pXG5cdFx0XHRcdFx0XHRsb2FkRGF0YSgpXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0XHQuY2F0Y2goZnVuY3Rpb24ocmVzcCkge1xuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKVxuXHRcdFx0XHRcdFx0Y3RybC5zZXREYXRhKHtzZWxlY3RlZEZpbGVzOiBbXSwgb3BlcmF0aW9uOiAnbm9uZSd9KVxuXHRcdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHtcblx0XHRcdFx0XHRcdFx0Y29udGVudDogcmVzcC5yZXNwb25zZVRleHQsXG5cdFx0XHRcdFx0XHRcdHRpdGxlOiAnRXJyb3InXG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdH0pXHRcdFx0XHRcdFx0XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdH0pXG5cblx0XHRmdW5jdGlvbiBnZXRTZWxGaWxlcygpIHtcblx0XHRcdGNvbnN0IHNlbEZpbGVzID0gW11cblx0XHRcdGVsdC5maW5kKCcuY2hlY2s6Y2hlY2tlZCcpLmVhY2goZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGNvbnN0IGZpbGVOYW1lID0gJCh0aGlzKS5jbG9zZXN0KCcudGh1bWJuYWlsJykuZGF0YSgnbmFtZScpXG5cdFx0XHRcdHNlbEZpbGVzLnB1c2goY3RybC5tb2RlbC5yb290RGlyICsgZmlsZU5hbWUpXG5cdFx0XHR9KVxuXHRcdFx0Y29uc29sZS5sb2coJ3NlbEZpbGVzJywgc2VsRmlsZXMpXHRcblx0XHRcdHJldHVybiBzZWxGaWxlc1x0XHRcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBsb2FkRGF0YShyb290RGlyKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdsb2FkRGF0YScsIHJvb3REaXIpXG5cdFx0XHRpZiAocm9vdERpciA9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0cm9vdERpciA9IGN0cmwubW9kZWwucm9vdERpclxuXHRcdFx0fVxuXHRcdFx0c3J2RmlsZXMubGlzdChyb290RGlyKS50aGVuKGZ1bmN0aW9uKGZpbGVzKSB7XG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ2ZpbGVzJywgZmlsZXMpXG5cdFx0XHRcdGlmIChyb290RGlyICE9ICcvJykge1xuXHRcdFx0XHRcdGZpbGVzLnVuc2hpZnQoe25hbWU6ICcuLicsIGZvbGRlcjogdHJ1ZX0pXG5cdFx0XHRcdH1cblx0XHRcdFx0Y3RybC5zZXREYXRhKHtmaWxlcywgcm9vdERpciwgc2VsZWN0TW9kZTogZmFsc2V9KVxuXG5cdFx0XHR9KVx0XHRcblx0XHR9XG5cblx0XHRsb2FkRGF0YSgpXG5cblx0fVxuXG59KTtcbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdicmVpemJvdC5oZWFkZXInLCB7XG5cblx0cHJvcHM6IHtcblx0XHR1c2VyTmFtZTogJ1Vua25vd24nLFxuXHRcdHNob3dIb21lOiB0cnVlLFxuXHRcdHRpdGxlOiAnJ1xuXHR9LFxuXG5cdHRlbXBsYXRlOiBcIjxkaXYgY2xhc3M9XFxcImhlYWRlciB3My10ZWFsXFxcIj5cXG5cdDxkaXY+XFxuXHRcdDxhIGJuLXNob3c9XFxcInNob3dIb21lXFxcIiBjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiBocmVmPVxcXCIvXFxcIiB0aXRsZT1cXFwiR28gSG9tZVxcXCI+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLWhvbWUgZmEtbGdcXFwiPjwvaT5cXG5cdFx0PC9hPlx0XHRcXG5cdDwvZGl2Plxcblxcblx0PHNwYW4gYm4tdGV4dD1cXFwidGl0bGVcXFwiPjwvc3Bhbj5cXG5cdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb250ZXh0bWVudVxcXCIgXFxuXHRcdGJuLWRhdGE9XFxcIml0ZW1zOiBpdGVtc1xcXCIgXFxuXHRcdGRhdGEtdHJpZ2dlcj1cXFwibGVmdFxcXCIgXFxuXHRcdGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIFxcblx0XHRibi1ldmVudD1cXFwiY29udGV4dG1lbnVjaGFuZ2U6IG9uQ29udGV4dE1lbnVcXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS11c2VyIGZhLWxnXFxcIj48L2k+XFxuXHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwidXNlck5hbWVcXFwiPjwvc3Bhbj5cdCAgICBcdFxcblx0PC9kaXY+XFxuXHRcXG48L2Rpdj5cIixcblxuXHRpbml0OiBmdW5jdGlvbihlbHQpIHtcblxuXHRcdCQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRpdGVtczoge1xuXHRcdFx0XHRcdHB3ZDoge25hbWU6ICdDaGFuZ2UgcGFzc3dvcmQnLCBpY29uOiAnZmEtbG9jayd9LFxuXHRcdFx0XHRcdGFwcHM6IHtuYW1lOiAnQXBwbGljYXRpb25zJywgaWNvbjogJ2ZhLXRoJ30sXG5cdFx0XHRcdFx0c2VwOiAnLS0tLS0tJyxcblx0XHRcdFx0XHRsb2dvdXQ6IHtuYW1lOiAnTG9nb3V0JywgaWNvbjogJ2ZhLXBvd2VyLW9mZid9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHVzZXJOYW1lOiB0aGlzLnByb3BzLnVzZXJOYW1lLFxuXHRcdFx0XHRzaG93SG9tZTogdGhpcy5wcm9wcy5zaG93SG9tZSxcblx0XHRcdFx0dGl0bGU6IHRoaXMucHJvcHMudGl0bGVcblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25Db250ZXh0TWVudTogZnVuY3Rpb24oZXYsIGRhdGEpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25Db250ZXh0TWVudScsIGRhdGEpXG5cdFx0XHRcdFx0aWYgKGRhdGEuY21kID09ICdsb2dvdXQnKSB7XG5cdFx0XHRcdFx0XHRsb2NhdGlvbi5ocmVmID0gJy9sb2dvdXQnXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmIChkYXRhLmNtZCA9PSAnYXBwcycpIHtcblx0XHRcdFx0XHRcdGxvY2F0aW9uLmhyZWYgPSAnL2FwcHMvc3RvcmUnXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcblx0fVxufSk7XG4iLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3QuaG9tZScsIHtcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LmFwcHMnXSxcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGJuLWNvbnRyb2w9XFxcImJyZWl6Ym90LmFwcHNcXFwiIFxcblx0Ym4tZGF0YT1cXFwiYXBwczogYXBwc1xcXCJcXG5cdGJuLWV2ZW50PVxcXCJhcHBjbGljazogb25BcHBDbGlja1xcXCIgXFxuXHRzdHlsZT1cXFwiaGVpZ2h0OiAxMDAlXFxcIj5cXG5cdFx0XFxuXHQ8L2Rpdj5cXG5cIixcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIHNydkFwcHMpIHtcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0YXBwczogW11cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25BcHBDbGljazogZnVuY3Rpb24oZXYsIGRhdGEpIHtcblx0XHRcdFx0XHRsb2NhdGlvbi5ocmVmID0gJy9hcHBzLycgKyBkYXRhLmFwcE5hbWVcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHRzcnZBcHBzLmxpc3RNeUFwcCgpLnRoZW4oKGFwcHMpID0+IHtcblx0XHRcdGNvbnNvbGUubG9nKCdhcHBzJywgYXBwcylcblx0XHRcdGN0cmwuc2V0RGF0YSh7YXBwc30pXG5cdFx0fSlcblx0fVxufSk7XG4iLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYnJlaXpib3QudXNlcnMnLCB7XG5cdGRlcHM6IFsnYnJlaXpib3QudXNlcnMnXSxcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGNsYXNzPVxcXCJtYWluXFxcIj5cXG5cdDxidXR0b24gYm4tZXZlbnQ9XFxcImNsaWNrOiBvbkFkZFVzZXJcXFwiIGNsYXNzPVxcXCJ3My1idG4gdzMtYmx1ZSBidG5BZGRVc2VyXFxcIj5BZGQgVXNlcjwvYnV0dG9uPlxcblx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLnRhYmxlXFxcIlxcblx0XHRibi1ldmVudD1cXFwidGFibGVjbWQ6IG9uVGFibGVDbWRcXFwiXFxuXHRcdGJuLWRhdGE9XFxcImNvbHVtbnM6IGNvbHVtbnMsIGRhdGE6IGRhdGFcXFwiPjwvZGl2Plx0XFxuPC9kaXY+XFxuXCIsXG5cblx0aW5pdDogZnVuY3Rpb24oZWx0LCB1c2Vycykge1xuXG5cblxuXHRcdGNvbnN0IGRsZ0FkZFVzZXIgPSAkJC5mb3JtRGlhbG9nQ29udHJvbGxlcih7XG5cdFx0XHR0aXRsZTogJ0FkZCBVc2VyJyxcblx0XHRcdHRlbXBsYXRlOiBcIjxkaXYgY2xhc3M9XFxcImJyZWl6Ym90LXVzZXJzIGRsZ0FkZFVzZXJcXFwiPlxcblx0PGlucHV0IHR5cGU9XFxcInRleHRcXFwiIHBsYWNlaG9sZGVyPVxcXCJ1c2VybmFtZVxcXCIgbmFtZT1cXFwidXNlcm5hbWVcXFwiIHJlcXVpcmVkPlxcblx0PGlucHV0IHR5cGU9XFxcInRleHRcXFwiIHBsYWNlaG9sZGVyPVxcXCJwc2V1ZG9cXFwiIG5hbWU9XFxcInBzZXVkb1xcXCIgcmVxdWlyZWQ+XFxuXHQ8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgcGxhY2Vob2xkZXI9XFxcImxvY2F0aW9uXFxcIiBuYW1lPVxcXCJsb2NhdGlvblxcXCIgcmVxdWlyZWQ+XFxuXHQ8aW5wdXQgdHlwZT1cXFwiZW1haWxcXFwiIHBsYWNlaG9sZGVyPVxcXCJlbWFpbFxcXCIgbmFtZT1cXFwiZW1haWxcXFwiIHJlcXVpcmVkPlx0XFxuPC9kaXY+XFxuXCJcblx0XHR9KVxuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRjb2x1bW5zOiBbXG5cdFx0XHRcdFx0e25hbWU6ICd1c2VybmFtZScsIGxhYmVsOiAnVXNlciBOYW1lJ30sXG5cdFx0XHRcdFx0e25hbWU6ICdwc2V1ZG8nLCBsYWJlbDogJ1BzZXVkbyd9LFxuXHRcdFx0XHRcdHtuYW1lOiAnbG9jYXRpb24nLCBsYWJlbDogJ0xvY2F0aW9uJ30sXG5cdFx0XHRcdFx0e25hbWU6ICdlbWFpbCcsIGxhYmVsOiAnRW1haWwnfSxcblx0XHRcdFx0XHR7bGFiZWw6ICdBY3Rpb25zJywgYnV0dG9uczogW1xuXHRcdFx0XHRcdFx0e2NtZDogJ2RlbGV0ZScsIHRpdGxlOiAnRGVsZXRlJywgaWNvbjogJ2ZhIGZhLXRyYXNoJ31cblx0XHRcdFx0XHRdfVxuXHRcdFx0XHRdLFxuXHRcdFx0XHRkYXRhOiBbXVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvbkFkZFVzZXI6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0ZGxnQWRkVXNlci5zaG93KGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdFx0XHRcdHVzZXJzLmFkZChkYXRhKS50aGVuKGdldFVzZXJzKVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uVGFibGVDbWQ6IGZ1bmN0aW9uKGV2LCBldmRhdGEpIHtcblx0XHRcdFx0XHRjb25zdCB7ZGF0YSwgY21kfSA9IGV2ZGF0YVxuXHRcdFx0XHRcdGlmIChjbWQgPT0gJ2RlbGV0ZScpIHtcblx0XHRcdFx0XHRcdCQkLnVpLnNob3dDb25maXJtKHt0aXRsZTogJ0RlbGV0ZSBVc2VyJywgY29udGVudDogJ0FyZSB5b3Ugc3VyZSA/J30sIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHR1c2Vycy5yZW1vdmUoZGF0YS51c2VybmFtZSkudGhlbihnZXRVc2Vycylcblx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdGZ1bmN0aW9uIGdldFVzZXJzKCkge1xuXHRcdFx0dXNlcnMubGlzdCgpLnRoZW4oKGRhdGEpID0+IHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ2RhdGEnLCBkYXRhKVxuXHRcdFx0XHRjdHJsLnNldERhdGEoe2RhdGF9KVxuXHRcdFx0fSlcdFx0XHRcblx0XHR9XG5cblx0XHRnZXRVc2VycygpXG5cblx0fVxufSk7XG4iLCIkJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYnJlaXpib3QuYXBwcycsIFsnYnJhaW5qcy5odHRwJ10sIGZ1bmN0aW9uKGNvbmZpZywgaHR0cCkge1xuXG5cblx0cmV0dXJuIHtcblx0XHRsaXN0QWxsOiBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiBodHRwLmdldCgnL2FwaS9hcHBzL2FsbCcpXG5cdFx0fSxcblxuXHRcdGxpc3RNeUFwcDogZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gaHR0cC5nZXQoJy9hcGkvYXBwcy9teWFwcCcpXG5cdFx0fVxuXHRcdFxuXHR9XG59KTtcbiIsIiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC5maWxlcycsIFsnYnJhaW5qcy5odHRwJ10sIGZ1bmN0aW9uKGNvbmZpZywgaHR0cCkge1xuXG5cdHJldHVybiB7XG5cdFx0bGlzdDogZnVuY3Rpb24ocGF0aCwgaW1hZ2VPbmx5LCBmb2xkZXJPbmx5KSB7XG5cdFx0XHRjb25zb2xlLmxvZygnW0ZpbGVTZXJ2aWNlXSBsaXN0JywgcGF0aClcblxuXHRcdFx0cmV0dXJuIGh0dHAucG9zdCgnL2FwaS9maWxlcy9saXN0Jywge3BhdGgsIGltYWdlT25seSwgZm9sZGVyT25seX0pXG5cdFx0fSxcblxuXHRcdGZpbGVVcmw6IGZ1bmN0aW9uKGZpbGVOYW1lKSB7XG5cdFx0XHRyZXR1cm4gJy9hcGkvZmlsZXMvbG9hZD9maWxlTmFtZT0nICsgZmlsZU5hbWVcblx0XHR9LFxuXG5cdFx0dXBsb2FkRmlsZTogZnVuY3Rpb24oZGF0YVVybCwgc2F2ZUFzZmlsZU5hbWUsIGRlc3RQYXRoKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnW0ZpbGVTZXJ2aWNlXSB1cGxvYWRGaWxlJywgc2F2ZUFzZmlsZU5hbWUpXG5cdFx0XHR2YXIgYmxvYiA9ICQkLnV0aWwuZGF0YVVSTHRvQmxvYihkYXRhVXJsKVxuXHRcdFx0aWYgKGJsb2IgPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdHJldHVybiBQcm9taXNlLnJlamVjdCgnRmlsZSBmb3JtYXQgbm90IHN1cHBvcnRlZCcpXG5cdFx0XHR9XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdibG9iJywgYmxvYilcblx0XHRcdHZhciBmZCA9IG5ldyBGb3JtRGF0YSgpXG5cdFx0XHRmZC5hcHBlbmQoJ2ZpbGUnLCBibG9iLCBzYXZlQXNmaWxlTmFtZSlcblx0XHRcdGZkLmFwcGVuZCgnZGVzdFBhdGgnLCBkZXN0UGF0aClcblx0XHRcdHJldHVybiBodHRwLnBvc3RGb3JtRGF0YSgnL2FwaS9maWxlcy9zYXZlJywgZmQpXG5cdFx0fSxcblxuXHRcdHJlbW92ZUZpbGVzOiBmdW5jdGlvbihmaWxlTmFtZXMpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdbRmlsZVNlcnZpY2VdIHJlbW92ZUZpbGVzJywgZmlsZU5hbWVzKVxuXHRcdFx0cmV0dXJuIGh0dHAucG9zdCgnL2FwaS9maWxlcy9kZWxldGUnLCBmaWxlTmFtZXMpXG5cdFx0fSxcblxuXHRcdG1rZGlyOiBmdW5jdGlvbihmaWxlTmFtZSkge1xuXHRcdFx0Y29uc29sZS5sb2coJ1tGaWxlU2VydmljZV0gbWtkaXInLCBmaWxlTmFtZSlcblx0XHRcdHJldHVybiBodHRwLnBvc3QoJy9hcGkvZmlsZXMvbWtkaXInLCB7ZmlsZU5hbWV9KVxuXHRcdH0sXG5cblx0XHRtb3ZlRmlsZXM6IGZ1bmN0aW9uKGZpbGVOYW1lcywgZGVzdFBhdGgpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdbRmlsZVNlcnZpY2VdIG1vdmVGaWxlcycsIGZpbGVOYW1lcywgZGVzdFBhdGgpXG5cdFx0XHRyZXR1cm4gaHR0cC5wb3N0KCcvYXBpL2ZpbGVzL21vdmUnLCB7ZmlsZU5hbWVzLCBkZXN0UGF0aH0pXG5cdFx0fSxcblxuXHRcdGNvcHlGaWxlczogZnVuY3Rpb24oZmlsZU5hbWVzLCBkZXN0UGF0aCkge1xuXHRcdFx0Y29uc29sZS5sb2coJ1tGaWxlU2VydmljZV0gY29weUZpbGVzJywgZmlsZU5hbWVzLCBkZXN0UGF0aClcblx0XHRcdHJldHVybiBodHRwLnBvc3QoJy9hcGkvZmlsZXMvY29weScsIHtmaWxlTmFtZXMsIGRlc3RQYXRofSlcblx0XHR9XHRcblx0fVxuXG59KTtcbiIsIiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdicmVpemJvdC51c2VycycsIFsnYnJhaW5qcy5odHRwJ10sIGZ1bmN0aW9uKGNvbmZpZywgaHR0cCkge1xuXG5cblx0cmV0dXJuIHtcblx0XHRsaXN0OiBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiBodHRwLmdldCgnL2FwaS91c2VycycpXG5cdFx0fSxcblxuXHRcdGFkZDogZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0cmV0dXJuIGh0dHAucG9zdCgnL2FwaS91c2VycycsIGRhdGEpXG5cdFx0fSxcblxuXHRcdHJlbW92ZTogZnVuY3Rpb24odXNlcikge1xuXHRcdFx0cmV0dXJuIGh0dHAuZGVsZXRlKGAvYXBpL3VzZXJzLyR7dXNlcn1gKVxuXHRcdH0sXG5cblx0XHR1cGRhdGU6IGZ1bmN0aW9uKHVzZXIsIGRhdGEpIHtcblx0XHRcdHJldHVybiBodHRwLnB1dChgL2FwaS91c2Vycy8ke3VzZXJ9YCwgZGF0YSlcblx0XHR9LFxuXG5cdFx0Z2V0OiBmdW5jdGlvbih1c2VyKSB7XG5cdFx0XHRyZXR1cm4gaHR0cC5nZXQoYC9hcGkvdXNlcnMvJHt1c2VyfWApXG5cdFx0fSxcblxuXHRcdGFjdGl2YXRlQXBwOiBmdW5jdGlvbihhcHBOYW1lLCBhY3RpdmF0ZWQpIHtcblx0XHRcdHJldHVybiBodHRwLnBvc3QoYC9hcGkvdXNlcnMvYWN0aXZhdGVBcHBgLCB7YXBwTmFtZSwgYWN0aXZhdGVkfSlcblx0XHR9XG5cblxuXHRcdFxuXHR9XG59KTtcbiJdfQ==
