//@ts-check

$$.control.registerControl('player', {

	template: { gulp_inject: './player.html' },

	deps: ['breizbot.files', 'app.jukebox', 'breizbot.pager'],

	props: {
		files: [],
		firstIdx: 0,
		fileCtrl: null,
		canEdit: false,
		canAddToPlaylist: false

	},

	/**
	 * 
	 * @param {Breizbot.Services.Files.Interface} filesSrv 
	 * @param {AppJukebox.Interface} srvApp 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 */
	init: function (elt, filesSrv, srvApp, pager) {


		/**@type {AppJukebox.PlayerInfo[]} */
		const files = this.props.files

		/**@type {Breizbot.Controls.Files.Interface} */
		const fileCtrl = this.props.fileCtrl

		//console.log('files', files)
		

		const { firstIdx, canEdit, canAddToPlaylist } = this.props

		const getTime = $$.media.getFormatedTime

		let shuffleIndexes = null
		let playlist = []
		//pager.setButtonVisible({ playlist: !isPlaylist })

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
			console.log('setIndex', idx, files[idx])
			const {fileName, mp3} = files[idx]
			ctrl.setData({
				src: getFileUrl(idx),
				title: mp3.title,
				name: fileName,
				artist: mp3.artist,
				genre: mp3.genre,
				year: mp3.year,
				idx
			})
			if (navigator.mediaSession) {
				navigator.mediaSession.metadata = new MediaMetadata({
					title: ctrl.model.title,
					artist: ctrl.model.artist
				})

				navigator.mediaSession.setActionHandler('previoustrack', isFirst() ? null : prev)
				navigator.mediaSession.setActionHandler('nexttrack', isLast() ? null : next)


			}
		}

		/**@type {HTMLAudioElement} */
		const audio = ctrl.scope.audio.get(0)


		function getFileUrl(idx) {

			return filesSrv.fileUrl($$.path.getFullPath(files[idx].rootDir, files[idx].fileName), files[idx].friendUser)
		}

		async function getPlaylist() {
			//console.log('getPlaylist')
			playlist = await srvApp.getPlaylist()
			//console.log('playlist', playlist)
		}

		getPlaylist()

		this.getButtons = function () {
			const ret = {}


			if (canAddToPlaylist) {
				ret.playlist = {
					title: 'Add to playlist',
					icon: 'fas fa-star',
					items: function () {

						const ret = {
							$new: { name: 'Add to new playlist' }
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
						//console.log('onClick', cmd)
						const {fileName, rootDir, friendUser} = files[ctrl.model.idx]
						
						const fileInfo = { fileName, rootDir, friendUser }

						if (cmd == '$new') {
							const name = await $$.ui.showPrompt({ title: 'Add Playlist', label: 'Name:' })
							if (name != null) {
								const ret = await srvApp.addSong(name, fileInfo, true)
								if (!ret) {
									$$.ui.showAlert({ title: 'Error', content: 'Playlist already exists' })
								}
								else {
									$.notify(`song added to playlst '${name}'`, 'success')
									await getPlaylist()
								}
							}
						}
						else {
							await srvApp.addSong(cmd, fileInfo, false)
							$.notify(`song added to playlst '${cmd}'`, 'success')
						}
					}
				}
			}

			if (canEdit) {
				ret.editInfo = {
					//visible: !isPlaylist,
					title: 'Edit Info',
					icon: 'fa fa-edit',
					onClick: function () {
						const { idx } = ctrl.model
						const {mp3, fileName, rootDir, friendUser} = files[idx]
						mp3.length = ctrl.model.duration
						pager.pushPage('editDlg', {
							title: 'Edit MP3 Info',
							props: {
								mp3,
								fileName: name,
								url: ctrl.model.src,
							},
							onReturn: async function (tags) {
								console.group('onReturn', tags)
								files[idx].mp3 = tags
								ctrl.setData(tags)
								await srvApp.saveInfo(rootDir + fileName, friendUser, tags)
								await fileCtrl.updateFileInfo(fileName, { getMP3Info: true })
							}
						})

					}
				}

			}

			return ret
		}

	}


});




