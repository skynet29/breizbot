(function () {

	function getTime(duration) {
		const d = new Date(duration * 1000)
		const v = d.getMinutes() + d.getSeconds() / 100
		return v.toFixed(2).replace('.', ':')
	}


	$$.control.registerControl('player', {

		template: { gulp_inject: './player.html' },

		deps: ['breizbot.files', 'breizbot.http', 'breizbot.pager'],

		props: {
			rootDir: '',
			files: [],
			firstIdx: 0,
			friendUser: '',
			fileCtrl: null,
			isPlaylist: false
		},

		init: function (elt, filesSrv, http, pager) {

			const { rootDir, files, firstIdx, friendUser, fileCtrl, isPlaylist } = this.props

			let shuffleIndexes = null
			let playlist = []
			pager.setButtonVisible({ playlist: !isPlaylist })

			const ctrl = $$.viewController(elt, {
				data: {
					idx: firstIdx,
					nbFiles: files.length,
					src: getFileUrl(firstIdx),
					name: getName(firstIdx),
					title: getTitle(firstIdx),
					artist: getArtist(firstIdx),
					genre: getGenre(firstIdx),
					year: getYear(firstIdx),
					volume: 0,
					duration: 0,
					curTime: 0,
					playing: false,
					isFirst: function () {
						return (this.idx == 0)
					},
					isLast: function () {
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
						ctrl.setData({ duration: Math.floor(this.duration), volume: audio.volume })
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
					},

					onEnded: next,

					onPrev: prev,

					onNext: next

				}
			})

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
					}
					return
				}

				let { idx, nbFiles } = ctrl.model
				if (idx < nbFiles - 1) {
					setIndex(idx + 1)
				}
			}

			function setIndex(idx) {
				ctrl.setData({
					src: getFileUrl(idx),
					title: getTitle(idx),
					name: getName(idx),
					artist: getArtist(idx),
					genre: getGenre(idx),
					year: getYear(idx),
					idx
				})
			}

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
				playlist = await http.post('/getPlaylist')
				//console.log('playlist', playlist)
			}

			getPlaylist()

			this.getButtons = function () {
				return {
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
									const ret = await http.post('/addSong', { name, fileInfo, checkExists: true })
									if (!ret) {
										$$.ui.showAlert({ title: 'Error', content: 'Playlist already exists' })
									}
									else {
										await getPlaylist()
									}
								}
							}
							else {
								await http.post('/addSong', { name: cmd, fileInfo, checkExists: false })
							}
						}
					},
					editInfo: {
						visible: !isPlaylist,
						title: 'Edit Info',
						icon: 'fa fa-edit',
						onClick: function () {
							const { idx, name } = ctrl.model
							pager.pushPage('editDlg', {
								title: 'Edit MP3 Info',
								props: {
									mp3: files[idx].mp3,
									fileName: name
								},
								onReturn: async function (tags) {
									//console.group('onReturn', tags)
									files[idx].mp3 = tags
									ctrl.setData(tags)
									await http.post('/saveInfo', {
										filePath: rootDir + name,
										friendUser,
										tags
									})
									await fileCtrl.updateFileInfo(name, { getMP3Info: true })
								}
							})

						}
					}
				}
			}

		}


	});

})();



