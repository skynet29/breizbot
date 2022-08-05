// @ts-check

$$.control.registerControl('tree', {

	template: { gulp_inject: './tree.html' },

	deps: ['breizbot.files', 'breizbot.friends', 'breizbot.playlists'],

	props: {
	},

	/**
	 * 
	 * @param {Breizbot.Services.Files.Interface} srvFiles
	 * @param {Breizbot.Services.Friends.Interface} srvFriends
	 * @param {Breizbot.Services.Playlists.Interface} srvPlaylists
	 */
	init: function (elt, srvFiles, srvFriends, srvPlaylists) {

		const treeInfo = [
			{ title: 'Home Files', icon: 'fa fa-home w3-text-blue', lazy: true, data: { path: '/' } },
			{ title: 'Files Shared', folder: true, children: [], icon: 'fa fa-share-alt w3-text-blue' },
			{ title: 'Playlists', folder: true, children: [], icon: 'fas fa-compact-disc w3-text-blue' }
		]

		function concatPath(path, fileName) {
			let ret = path
			if (!path.endsWith('/')) {
				ret += '/'
			}
			ret += fileName
			return ret
		}

		const treeOptions = {
			lazyLoad: function (ev, data) {
				const node = data.node
				//console.log('lazyload', node.data)
				data.result = new Promise(async (resolve) => {
					const { path, friendUser } = node.data
					const folders = await srvFiles.list(path, { filterExtension: 'mp3', folderOnly: true }, friendUser)
					//console.log('folders', folders)
					const results = folders.map((f) => {
						return {
							title: f.name,
							data: {
								path: concatPath(path, f.name),
								friendUser
							},
							lazy: true,
							folder: true
						}
					})
					resolve(results)
				})
			}
		}

		const ctrl = $$.viewController(elt, {
			data: {
				treeInfo,
				treeOptions,
			},
			events: {
				onTreeItemSelected: async function (ev, node) {
					//console.log('onTreeItemSelected', node.data)
					const { path, friendUser, playlistName } = node.data
					if (Object.keys(node.data).length == 0) {
						elt.trigger('filechange', { files: [] })
						return
					}


					if (playlistName) {
						const files = await srvPlaylists.getPlaylistSongs(playlistName)
						console.log('files', files)
						const formatedfiles = files
							.filter((f) => f.mp3 && f.mp3.artist)
							.map((f) => {
								const { artist, bpm, title, length } = f.mp3
								const { fileName, friendUser, rootDir } = f.fileInfo
								return {
									url: srvFiles.fileUrl(concatPath(rootDir, fileName), friendUser),
									artist,
									bpm,
									title,
									length
								}
							})
						elt.trigger('filechange', { files: formatedfiles })
					}
					else {
						const files = await srvFiles.list(path, {
							filterExtension: 'mp3',
							filesOnly: true,
							getMP3Info: true
						}, friendUser)

						//console.log('files', files)
						const formatedfiles = files
							.filter((f) => f.mp3 && f.mp3.artist)
							.map((f) => {
								const { artist, bpm, title, length } = f.mp3
								return {
									url: srvFiles.fileUrl(concatPath(path, f.name), friendUser),
									artist,
									bpm,
									title,
									length
								}
							})

						elt.trigger('filechange', { files: formatedfiles })
					}
				}
			}
		})

		async function init() {
			const friends = await srvFriends.getFriends()
			for (const { friendUserName: title } of friends) {
				ctrl.model.treeInfo[1].children.push({
					title,
					icon: 'fa fa-user w3-text-blue',
					data: { friendUser: title, path: '/' },
					lazy: true,
				})
			}
			//console.log('friends', friends)
			const playlists = await srvPlaylists.getPlaylist()
			for (const playlistName of playlists) {
				ctrl.model.treeInfo[2].children.push({
					title: playlistName,
					icon: 'fa fa-music w3-text-blue',
					data: { playlistName }
				})
			}

			ctrl.update()

		}

		init()

	}


});




