//@ts-check

$$.control.registerControl('player', {

	template: { gulp_inject: './player.html' },

	deps: ['breizbot.files', 'app.jukebox', 'breizbot.pager'],

	props: {
		rootDir: '',
		files: [],
		firstIdx: 0,
		friendUser: '',
		fileCtrl: null,
		isPlaylist: false,
		worker: null
	},

	/**
	 * 
	 * @param {Breizbot.Services.Files.Interface} filesSrv 
	 * @param {AppJukebox.Interface} srvApp 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 */
	init: function (elt, filesSrv, srvApp, pager) {

		/**@type {{
		 * rootDir: string, 
		 * files: Breizbot.Services.Files.FileInfo[] | AppJukebox.PlaylistInfo[], 
		 * firstIdx: number,
		 * friendUser: string,
		 * fileCtrl: Breizbot.Controls.Files.Interface,
		 * isPlaylist: boolean,
		 * }} */
		const { rootDir, files, firstIdx, friendUser, fileCtrl, isPlaylist } = this.props

		const getTime = $$.media.getFormatedTime

		let shuffleIndexes = null
		let playlist = []
		pager.setButtonVisible({ playlist: !isPlaylist })

		const ctrl = $$.viewController(elt, {
			data: {
				idx: firstIdx,
				nbFiles: files.length,
				src: '#',
				name: '',
				title: '',
				artist: '',
				genre: '',
				year: 0,
				volume: 0,
				duration: 0,
				curTime: 0,
				playing: false,
				isFirst: function () {
					if (shuffleIndexes != null) {
						return true
					}
					return (this.idx == 0)
				},
				isLast: function () {
					if (shuffleIndexes != null) {
						return (shuffleIndexes.length == 0)
					}
					return (this.idx == this.nbFiles - 1)
				},
				getTimeInfo: function () {
					return `${getTime(this.curTime)} / ${getTime(this.duration)}`
				}

			},
			events: {
				onVolumeChange: function (ev, value) {
					audio.volume = value
				},
				onLoad: function () {
					//console.log('duration', this.duration)
					ctrl.setData({ duration: Math.floor(audio.duration), volume: audio.volume })
				},

				onTimeUpdate: function () {
					ctrl.setData({ curTime: this.currentTime })
				},

				onPlaying: function () {
					//console.log('onPlaying')
					ctrl.setData({ playing: true })
				},

				onPaused: function () {
					//console.log('onPaused')
					ctrl.setData({ playing: false })
				},

				onPlay: function () {
					audio.play()
				},

				onPause: function () {
					audio.pause()
				},

				onSliderChange: function (ev, value) {
					//console.log('onSliderChange', value)
					audio.currentTime = value
				},

				onShuffleChange: function (ev, isActivated) {
					//console.log('onShuffleChange', value)
					if (isActivated) {
						shuffleIndexes = $$.util.knuthShuffle(ctrl.model.nbFiles)
						//console.log('shuffleIndexes', shuffleIndexes)
					}
					else {
						shuffleIndexes = null
					}
					ctrl.update()
				},

				onEnded: next,

				onPrev: prev,

				onNext: next

			}
		})

		setIndex(firstIdx)

		function isFirst() {
			if (shuffleIndexes != null) {
				return true
			}
			return (ctrl.model.idx == 0)
		}

		function isLast() {
			if (shuffleIndexes != null) {
				return (shuffleIndexes.length == 0)
			}
			return (ctrl.model.idx == ctrl.model.nbFiles - 1)
		}

		function prev() {
			let { idx } = ctrl.model
			if (idx > 0) {
				setIndex(idx - 1)
			}
		}

		function next() {
			if (shuffleIndexes != null) {
				if (shuffleIndexes.length > 0) {
					setIndex(shuffleIndexes.pop())
					//console.log('shuffleIndexes', shuffleIndexes.length)
				}
				return
			}

			let { idx, nbFiles } = ctrl.model
			if (idx < nbFiles - 1) {
				setIndex(idx + 1)
			}
		}

		function setIndex(idx) {
			//console.log('setIndex', idx)
			ctrl.setData({
				src: getFileUrl(idx),
				title: getTitle(idx),
				name: getName(idx),
				artist: getArtist(idx),
				genre: getGenre(idx),
				year: getYear(idx),
				idx
			})
			if (navigator.mediaSession) {
				navigator.mediaSession.metadata = new MediaMetadata({
					title: getTitle(idx),
					artist: getArtist(idx)
				})

				navigator.mediaSession.setActionHandler('previoustrack', isFirst() ? null : prev)
				navigator.mediaSession.setActionHandler('nexttrack', isLast() ? null : next)


			}
		}

		/**@type {HTMLAudioElement} */
		const audio = ctrl.scope.audio.get(0)

		function getName(idx) {
			return (isPlaylist) ? files[idx].fileInfo.fileName : files[idx].name
		}

		function getTitle(idx) {
			return files[idx].mp3.title || ''
		}

		function getArtist(idx) {
			return files[idx].mp3.artist || ''
		}

		function getGenre(idx) {
			return files[idx].mp3.genre || ''
		}

		function getYear(idx) {
			return files[idx].mp3.year || ''
		}

		function getFileUrl(idx) {
			if (isPlaylist) {
				const { rootDir, fileName, friendUser } = files[idx].fileInfo
				return filesSrv.fileUrl(rootDir + fileName, friendUser)
			}
			return filesSrv.fileUrl(rootDir + files[idx].name, friendUser)
		}

		async function getPlaylist() {
			//console.log('getPlaylist')
			playlist = await srvApp.getPlaylist()
			//console.log('playlist', playlist)
		}

		getPlaylist()

		this.getButtons = function () {
			const ret = {
				playlist: {
					visible: !isPlaylist,
					title: 'Add to playlist',
					icon: 'fas fa-star',
					items: function () {

						const ret = {
							new: { name: 'Add to new playlist' }
						}

						if (playlist.length != 0) {
							ret.sep = '------'
						}

						playlist.forEach((name) => {
							ret[name] = { name }
						})
						return ret
					},
					onClick: async function (cmd) {
						console.log('onClick', cmd)
						const fileInfo = { rootDir, friendUser, fileName: ctrl.model.name }

						if (cmd == 'new') {
							const name = await $$.ui.showPrompt({ title: 'Add Playlist', label: 'Name:' })
							if (name != null) {
								const ret = await srvApp.addSong(name, fileInfo, true)
								if (!ret) {
									$$.ui.showAlert({ title: 'Error', content: 'Playlist already exists' })
								}
								else {
									await getPlaylist()
								}
							}
						}
						else {
							await srvApp.addSong(cmd, fileInfo, false)
						}
					}
				}
			}

			if (friendUser === '') {
				ret.editInfo = {
					visible: !isPlaylist,
					title: 'Edit Info',
					icon: 'fa fa-edit',
					onClick: function () {
						const { idx, name } = ctrl.model
						const mp3 = files[idx].mp3
						mp3.length = ctrl.model.duration
						pager.pushPage('editDlg', {
							title: 'Edit MP3 Info',
							props: {
								mp3: files[idx].mp3,
								fileName: name,
								url: ctrl.model.src,
							},
							onReturn: async function (tags) {
								//console.group('onReturn', tags)
								files[idx].mp3 = tags
								ctrl.setData(tags)
								await srvApp.saveInfo(rootDir + name, friendUser, tags)
								await fileCtrl.updateFileInfo(name, { getMP3Info: true })
							}
						})

					}
				}

			}

			return ret
		}

	}


});




