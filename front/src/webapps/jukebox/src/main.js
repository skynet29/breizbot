//@ts-check
$$.control.registerControl('rootPage', {

	template: { gulp_inject: './main.html' },

	deps: ['breizbot.pager', 'breizbot.files'],

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 * @param {Breizbot.Services.Files.Interface} files
	 */
	init: function (elt, pager, files) {

		/**
		 * 
		 * @param {Breizbot.Controls.Files.Interface} iface 
		 */
		function openFilterPage(iface) {
			const mp3Filters = iface.getMP3Filters()
			const files = iface.getFiles()

			pager.pushPage('filterDlg', {
				title: 'Filter',
				props: {
					files,
					mp3Filters
				},
				onReturn: function (filters) {
					//console.log('filters', filters)
					iface.setMP3Filters(filters)
				}
			})
		}

		function openFilePage(title, friendUser) {
			/**@type {Breizbot.Controls.Files.Props} */
			const props = {
				filterExtension: 'mp3',
				getMP3Info: true,
				friendUser
			}

			if (friendUser == '') {
				props.menuItems = function(info) {
					const ret = {}
					if (!info.folder) {
						ret.move = {name: 'Move', icon: 'fas fa-file-export'}
					}
					return ret
				}
			}
			/**@type {Breizbot.Controls.Files.Interface} */
			const fileCtrl = pager.pushPage('breizbot.files', {
				title,
				props,
				buttons: {
					search: {
						title: 'Filter',
						icon: 'fas fa-filter',
						onClick: function () {
							openFilterPage(fileCtrl)
						}
					}
				},
				events: {
					/**
					 * 
					 * @param {Breizbot.Controls.Files.EventData.ContextMenuItem} info 
					 */
					contextmenuItem: function(ev, info) {
						//console.log('contextmenuItem', info)
						const {cmd, name, rootDir} = info
						if (cmd == 'move') {
							pager.pushPage('fileTree', {
								title: 'Select Target folder',
								onReturn: async function(data) {
									console.log('onReturn', data)
									await files.move(rootDir + name, data.path)	
									fileCtrl.reload()								
								}
							})
						}

					},
					/**
					 * 
					 * @param {Breizbot.Controls.Files.EventData.FileClick} info 
					 */
					fileclick: function (ev, info) {
						const { rootDir, fileName } = info
						const files = fileCtrl.getFilteredFiles()
						//console.log('files', files)
						const firstIdx = files.findIndex((f) => f.name == fileName)
						//console.log('firstIdx', firstIdx)
						pager.pushPage('player', {
							title: 'Player',
							props: {
								firstIdx,
								files,
								rootDir,
								friendUser,
								fileCtrl
							}
						})

					}
				}
			})

		}

		const ctrl = $$.viewController(elt, {
			data: {
			},
			events: {
				onDatabase: function() {
					pager.pushPage('database', {
						title: 'Database'
					})
				},
				onHome: function () {
					openFilePage('Home files', '')
				},
				onShare: function () {
					pager.pushPage('breizbot.friends', {
						title: 'Shared files',
						/**@type {Breizbot.Controls.Friends.Props} */
						props: {
							showConnectionState: false
						},
						events: {
							/**
							 * 
							 * @param {Breizbot.Controls.Friends.EventData.FriendClick} data 
							 */
							friendclick: function (ev, data) {
								//console.log('onSelectFriend', data)
								const { userName } = data
								openFilePage(userName, userName)
							}
						}
					})
				},
				onPlaylist: function () {
					//console.log('onPlaylist')
					pager.pushPage('playlist', {
						title: 'Playlist'
					})
				}

			}
		})

	}


});




