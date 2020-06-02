$$.control.registerControl('editDlg', {

    template: "<form bn-event=\"submit: onSubmit\" bn-form=\"mp3\">\n    <label>Title</label>\n    <input type=\"text\" name=\"title\" required>\n    <label>Artist</label>\n    <input type=\"text\" name=\"artist\" required>\n    <label>Genre</label>\n    <input type=\"text\" name=\"genre\">\n    <label>Year</label>\n    <input type=\"number\" name=\"year\">\n\n\n    <input type=\"submit\" hidden bn-bind=\"submit\">\n</form>\n\n<div class=\"toolbar\">\n    <button type=\"button\" title=\"Find Info\" bn-event=\"click: onFindInfo\" class=\"w3-btn w3-blue w3-circle\">\n        <i class=\"fa fa-search\"></i>\n    </button>\n    \n</div>\n",

    deps: ['breizbot.http', 'breizbot.pager'],

    props: {
        mp3: {},
        fileName: ''
    },

    init: function(elt, http, pager) {

        const {mp3, fileName} = this.props

        const ctrl = $$.viewController(elt, {
            data: {
                mp3
            },
            events: {
                onFindInfo: async function() {
					const data = await http.post('/search', {
						query: fileName.replace('.mp3', ''),
					})
                    console.log(data)
                    if (data && data.title) {
                        $.extend(ctrl.model.mp3, data)
                        ctrl.update()
                    }
                    else {
                        $$.ui.showAlert({title: 'MP3 Information', content: 'No information found !'})
                    }                    
                },
                onSubmit: function(ev) {
                    ev.preventDefault()
                    const data = $(this).getFormData()

                    pager.popPage(data)

                }
            }
        })

        this.getButtons = function() {
            return {
                ok: {
                    title: 'Apply',
                    icon: 'fa fa-check',
                    onClick: function() {
                        ctrl.scope.submit.click()
                    }
                }
            }
        }
    }
})

$$.control.registerControl('filterDlg', {

    template: "<form bn-event=\"submit: onSubmit\">\n\n    <label>Genre</label>\n    <div bn-control=\"brainjs.combobox\" bn-data=\"{items: genres}\" bn-val=\"selectedGenre\" bn-event=\"comboboxchange: onGenreChange\" name=\"genre\"></div>    \n\n    <label>Artist</label>\n    <div bn-control=\"brainjs.combobox\" bn-data=\"{items: artists}\" bn-val=\"selectedArtist\" bn-update=\"comboboxchange\" name=\"artist\"></div>    \n\n\n    <input type=\"submit\" hidden bn-bind=\"submit\">\n</form>\n",

    deps: ['breizbot.pager'],

    props: {
        files: [],
        mp3Filters: null
    },

    init: function (elt, pager) {

        let { files, mp3Filters } = this.props

        mp3Filters = mp3Filters || {}


        const selectedGenre = mp3Filters.genre || 'All'
        const selectedArtist = mp3Filters.artist || 'All'

        console.log('selectedArtist', selectedArtist)
        console.log('selectedGenre', selectedGenre)

        function getGenres() {
            let genres = {}

            files.forEach((f) => {
                if (f.mp3) {
                    const { genre } = f.mp3
                    if (genre && !genre.startsWith('(')) {
                        if (genres[genre]) {
                            genres[genre]++
                        }
                        else {
                            genres[genre] = 1
                        }
                    }
                }
            })

            genres = Object.keys(genres).sort().map((genre) => {
                const nbTitle = genres[genre]
                return (nbTitle == 1) ?
                    { value: genre, label: genre } :
                    { value: genre, label: `${genre} (${nbTitle})` }
            })
            genres.unshift({ value: 'All', label: 'All', style: 'font-weight: bold;' })

            return genres
        }


        function getArtists(genre) {
            let artists = {}

            files.forEach((f) => {
                if (f.mp3 && (genre == 'All' || f.mp3.genre == genre)) {
                    const { artist } = f.mp3
                    if (artist) {
                        if (artists[artist]) {
                            artists[artist]++
                        }
                        else {
                            artists[artist] = 1
                        }
                    }
                }
            })
            artists = Object.keys(artists).sort().map((artist) => {
                const nbTitle = artists[artist]
                return (nbTitle == 1) ?
                    { value: artist, label: artist } :
                    { value: artist, label: `${artist} (${nbTitle})` }
            })
            artists.unshift({ value: 'All', label: 'All', style: 'font-weight: bold;' })
            return artists
        }





        const ctrl = $$.viewController(elt, {
            data: {
                artists: getArtists(selectedGenre),
                genres: getGenres(),
                selectedArtist,
                selectedGenre
            },
            events: {
                onGenreChange: function(ev) {
                    const genre = $(this).getValue()
                    //console.log('onGenreChange', genre)
                    ctrl.setData({artists: getArtists(genre)})
                },
                onSubmit: function (ev) {
                    ev.preventDefault()
                    pager.popPage($(this).getFormData())

                }
            }
        })

        this.getButtons = function () {
            return {
                apply: {
                    title: 'Apply',
                    icon: 'fa fa-check',
                    onClick: function () {
                        ctrl.scope.submit.click()
                    }
                }
            }
        }

    }
})
$$.control.registerControl('rootPage', {

	template: "<p>Select a file system</p>\n\n<ul class=\"w3-ul w3-border w3-white\">\n	<li class=\"w3-bar\" bn-event=\"click: onHome\">\n		<div class=\"w3-bar-item\">\n			<i class=\"fa fa-home fa-2x fa-fw w3-text-blue\"></i>\n			<span>Your home files</span>\n		</div>\n	</li>\n\n	<li class=\"w3-bar\" bn-event=\"click: onShare\">\n		<div class=\"w3-bar-item\">\n			<i class=\"fa fa-share-alt fa-2x fa-fw w3-text-blue\"></i>\n			<span>Files shared by your friends</span>\n		</div>\n	</li>\n\n	<li class=\"w3-bar\" bn-event=\"click: onPlaylist\">\n		<div class=\"w3-bar-item\">\n			<i class=\"fa fa-music fa-2x fa-fw w3-text-blue\"></i>\n			<span>Your Playlists</span>\n		</div>\n	</li>\n\n</ul>	",

	deps: ['breizbot.pager'],

	init: function (elt, pager) {

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
			pager.pushPage('breizbot.files', {
				title,
				props: {
					filterExtension: '.mp3',
					getMP3Info: true,
					friendUser
				},
				buttons: {
					search: {
						title: 'Filter',
						icon: 'fa fa-search',
						onClick: function () {
							openFilterPage(this)
						}
					}
				},
				events: {
					fileclick: function (ev, info) {
						console.log('info', info)
						const { rootDir, fileName } = info
						const iface = $(this).iface()
						const files = iface.getFilteredFiles()
						//console.log('files', files)
						const firstIdx = files.findIndex((f) => f.name == fileName)
						console.log('firstIdx', firstIdx)
						pager.pushPage('player', {
							title: 'Player',
							props: {
								firstIdx,
								files,
								rootDir,
								friendUser,
								fileCtrl: iface
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
				onHome: function () {
					openFilePage('Home files', '')
				},
				onShare: function () {
					pager.pushPage('breizbot.friends', {
						title: 'Shared files',
						props: {
							showConnectionState: false
						},
						events: {
							friendclick: function (ev, data) {
								//console.log('onSelectFriend', data)
								const { userName } = data
								openFilePage(userName, userName)
							}
						}
					})
				},
				onPlaylist: function() {
					//console.log('onPlaylist')
					pager.pushPage('playlist', {
						title: 'Playlist'
					})
				}

			}
		})

	}


});





(function () {

	function getTime(duration) {
		const d = new Date(duration * 1000)
		const v = d.getMinutes() + d.getSeconds() / 100
		return v.toFixed(2).replace('.', ':')
	}


	$$.control.registerControl('player', {

		template: "<div class=\"info\">\n	<div class=\"title\" bn-show=\"!title\">\n		<strong>FileName:</strong>\n		<span bn-text=\"name\"></span>\n	</div>\n	<div class=\"title\" bn-show=\"title\">\n		<strong>Title:</strong>\n		<span bn-text=\"title\"></span>\n	</div>\n	<div class=\"title\" bn-show=\"artist\">\n		<strong>Artist:</strong>\n		<span bn-text=\"artist\"></span>\n	</div>\n	<div class=\"title\" bn-show=\"genre\">\n		<strong>Genre:</strong>\n		<span bn-text=\"genre\"></span>\n	</div>\n	<div class=\"title\" bn-show=\"year\">\n		<strong>Year:</strong>\n		<span bn-text=\"year\"></span>\n	</div>\n</div>\n<div class=\"toolbar\">\n	<button bn-prop=\"{disabled: isFirst}\" bn-event=\"click: onPrev\" class=\"w3-btn w3-blue\" title=\"Previous\">\n		<i class=\"fa fa-lg fa-step-backward\"></i>\n	</button>\n\n	<button bn-show=\"!playing\" bn-event=\"click: onPlay\" class=\"w3-btn w3-blue\" title=\"Play\">\n		<i class=\"fa fa-lg fa-play\"></i>\n	</button>\n\n	<button bn-show=\"playing\" bn-event=\"click: onPause\" class=\"w3-btn w3-blue\" title=\"Pause\">\n		<i class=\"fa fa-lg fa-pause\"></i>\n	</button>\n\n	<button bn-prop=\"{disabled: isLast}\" bn-event=\"click: onNext\" class=\"w3-btn w3-blue\" title=\"Next\">\n		<i class=\"fa fa-lg fa-step-forward\"></i>\n	</button>\n\n</div>\n\n<div class=\"toolbar2\">\n	<i class=\"fas fa-random fa-lg w3-text-blue shuffle\"></i>\n	<div bn-control=\"brainjs.flipswitch\" bn-event=\"flipswitchchange: onShuffleChange\">\n\n	</div>\n	<i class=\"fas fa-lg fa-volume-down w3-text-blue volume\"></i>\n	<div bn-control=\"brainjs.slider\" bn-data=\"{min: 0, max:1, step: 0.1}\" bn-event=\"input: onVolumeChange\"\n		bn-val=\"volume\" class=\"volulmeSlider\"></div>\n</div>\n\n\n<div class=\"slider\">\n	<span bn-text=\"getTimeInfo\"></span>\n	<div bn-control=\"brainjs.slider\" bn-data=\"{max: duration}\" bn-event=\"input: onSliderChange\" bn-val=\"curTime\">\n	</div>\n\n</div>\n\n<audio bn-attr=\"{src}\" bn-bind=\"audio\" autoplay=\"\"\n	bn-event=\"canplay: onLoad, timeupdate: onTimeUpdate, playing: onPlaying, pause: onPaused, ended: onEnded\">\n</audio>",

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
			pager.setButtonVisible({playlist: !isPlaylist})

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
					onVolumeChange: function(ev, value) {
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
					const {rootDir, fileName, friendUser} = files[idx].fileInfo
					return filesSrv.fileUrl(rootDir + fileName, friendUser)
				}
				return filesSrv.fileUrl(rootDir + files[idx].name, friendUser)
			}

			async function getPlaylist() {
				//console.log('getPlaylist')
				playlist  = await http.post('/getPlaylist')
				//console.log('playlist', playlist)
			}

			getPlaylist()

			this.getButtons = function () {
				return {
					playlist: {
						visible: !isPlaylist,
						title: 'Add to playlist',
						icon: 'fas fa-star',
						items: function() {

							const ret = {
								new: {name: 'Add to new playlist'}
							}

							if (playlist.length != 0) {
								ret.sep = '------'
							}

							playlist.forEach((name) => {
								ret[name] = {name}
							})
							return ret
						},
						onClick: async function(cmd) {
							console.log('onClick', cmd)
							const fileInfo = {rootDir, friendUser, fileName: ctrl.model.name}
							
							if (cmd == 'new') {
								const name = await $$.ui.showPrompt({title: 'Add Playlist', label: 'Name:'})
								console.log('name', name)
								const ret = await http.post('/addSong', {name, fileInfo, checkExists:true})
								console.log('ret', ret)
								if (!ret) {
									$$.ui.showAlert({title: 'Error', content: 'Playlist already exists'})
								}
								else {
									await getPlaylist()
								}
							}
							else {
								await http.post('/addSong', {name: cmd, fileInfo, checkExists:false})
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
									await fileCtrl.updateFile(name, { getMP3Info: true })
								}
							})

						}
					}
				}
			}

		}


	});

})();




$$.control.registerControl('playlist', {
    deps: ['breizbot.http', 'breizbot.pager'],

    template: "<div class=\"toolbar\" bn-show=\"hasPlaylist\">\n    <div class=\"left\">\n        <span>Playlist</span>\n        <div \n            bn-control=\"brainjs.combobox\"\n            bn-data=\"{items: playlist}\"\n            bn-event=\"comboboxchange: onPlaylistChange\"\n        ></div>\n    \n    </div>\n    <div class=\"right\">\n        <span bn-text=\"nbSongs\"></span>&nbsp;Songs\n    </div>\n</div>\n<div bn-show=\"!hasPlaylist\" class=\"message\">\n    You have no playlist\n</div>\n\n<div class=\"scrollPanel\">\n    <div bn-each=\"songs\" bn-iter=\"f\" bn-event=\"click.item: onItemClick\">\n        <div class=\"w3-card-2 item\">\n            <div>Title:&nbsp;<strong bn-text=\"$scope.f.mp3.title\"></strong></div>\n\n            <div>Artist:&nbsp;<strong bn-text=\"$scope.f.mp3.artist\"></strong></div>\n            <div bn-show=\"hasGenre\">Genre:&nbsp;<strong bn-text=\"$scope.f.mp3.genre\"></strong></div>\n            <div bn-show=\"hasYear\"> Year:&nbsp;<strong bn-text=\"getYear\"></strong></div>\n        </div>\n    </div>\n</div>",

    init: function (elt, http, pager) {

        const ctrl = $$.viewController(elt, {
            data: {
                playlist: [],
                songs: [],
                nbSongs: function () {
                    return this.songs.length
                },
                hasPlaylist: function () {
                    return this.playlist.length != 0
                },
                hasGenre: function (scope) {
                    let { genre } = scope.f.mp3
                    return genre != undefined && genre != '' && !genre.startsWith('(')
                },

                hasYear: function (scope) {
                    let { year } = scope.f.mp3
                    return year != undefined && year != ''
                },

                getYear: function (scope) {
                    return parseInt(scope.f.mp3.year)
                }
            },
            events: {
                onItemClick: function (ev) {
                    const idx = $(this).index()
                    //console.log('onItemClick', idx)
                },
                onPlaylistChange: async function (ev) {
                    const playlist = $(this).getValue()
                    //console.log('onPlaylistChange', playlist)
                    await getPlaylistSongs(playlist)
                }
            }

        })

        async function getPlaylist() {
            //console.log('getPlaylist')
            const playlist = await http.post('/getPlaylist')
            //console.log('playlist', playlist)
            ctrl.setData({ playlist })
            if (playlist.length != 0) {
                await getPlaylistSongs(playlist[0])
                //console.log('songs', songs)
            }
        }

        async function getPlaylistSongs(name) {
            const songs = await http.post('/getPlaylistSongs', { name })
            ctrl.setData({ songs })
            pager.setButtonVisible({ play: songs.length != 0 })
        }

        getPlaylist()

        this.getButtons = function () {
            return {
                play: {
                    visible: false,
                    title: 'Play',
                    icon: 'fa fa-play',
                    onClick: function () {
                        pager.pushPage('player', {
                            props: {
                                title: 'Player',
                                isPlaylist: true,
                                files: ctrl.model.songs
                            }
                        })
                    }

                }
            }
        }

    }
})
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImVkaXREbGcuanMiLCJmaWx0ZXIuanMiLCJtYWluLmpzIiwicGxheWVyLmpzIiwicGxheWxpc3QuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3ZEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDNUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6UUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJhcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnZWRpdERsZycsIHtcblxuICAgIHRlbXBsYXRlOiBcIjxmb3JtIGJuLWV2ZW50PVxcXCJzdWJtaXQ6IG9uU3VibWl0XFxcIiBibi1mb3JtPVxcXCJtcDNcXFwiPlxcbiAgICA8bGFiZWw+VGl0bGU8L2xhYmVsPlxcbiAgICA8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgbmFtZT1cXFwidGl0bGVcXFwiIHJlcXVpcmVkPlxcbiAgICA8bGFiZWw+QXJ0aXN0PC9sYWJlbD5cXG4gICAgPGlucHV0IHR5cGU9XFxcInRleHRcXFwiIG5hbWU9XFxcImFydGlzdFxcXCIgcmVxdWlyZWQ+XFxuICAgIDxsYWJlbD5HZW5yZTwvbGFiZWw+XFxuICAgIDxpbnB1dCB0eXBlPVxcXCJ0ZXh0XFxcIiBuYW1lPVxcXCJnZW5yZVxcXCI+XFxuICAgIDxsYWJlbD5ZZWFyPC9sYWJlbD5cXG4gICAgPGlucHV0IHR5cGU9XFxcIm51bWJlclxcXCIgbmFtZT1cXFwieWVhclxcXCI+XFxuXFxuXFxuICAgIDxpbnB1dCB0eXBlPVxcXCJzdWJtaXRcXFwiIGhpZGRlbiBibi1iaW5kPVxcXCJzdWJtaXRcXFwiPlxcbjwvZm9ybT5cXG5cXG48ZGl2IGNsYXNzPVxcXCJ0b29sYmFyXFxcIj5cXG4gICAgPGJ1dHRvbiB0eXBlPVxcXCJidXR0b25cXFwiIHRpdGxlPVxcXCJGaW5kIEluZm9cXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25GaW5kSW5mb1xcXCIgY2xhc3M9XFxcInczLWJ0biB3My1ibHVlIHczLWNpcmNsZVxcXCI+XFxuICAgICAgICA8aSBjbGFzcz1cXFwiZmEgZmEtc2VhcmNoXFxcIj48L2k+XFxuICAgIDwvYnV0dG9uPlxcbiAgICBcXG48L2Rpdj5cXG5cIixcblxuICAgIGRlcHM6IFsnYnJlaXpib3QuaHR0cCcsICdicmVpemJvdC5wYWdlciddLFxuXG4gICAgcHJvcHM6IHtcbiAgICAgICAgbXAzOiB7fSxcbiAgICAgICAgZmlsZU5hbWU6ICcnXG4gICAgfSxcblxuICAgIGluaXQ6IGZ1bmN0aW9uKGVsdCwgaHR0cCwgcGFnZXIpIHtcblxuICAgICAgICBjb25zdCB7bXAzLCBmaWxlTmFtZX0gPSB0aGlzLnByb3BzXG5cbiAgICAgICAgY29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgIG1wM1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGV2ZW50czoge1xuICAgICAgICAgICAgICAgIG9uRmluZEluZm86IGFzeW5jIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGNvbnN0IGRhdGEgPSBhd2FpdCBodHRwLnBvc3QoJy9zZWFyY2gnLCB7XG5cdFx0XHRcdFx0XHRxdWVyeTogZmlsZU5hbWUucmVwbGFjZSgnLm1wMycsICcnKSxcblx0XHRcdFx0XHR9KVxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKVxuICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YSAmJiBkYXRhLnRpdGxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkLmV4dGVuZChjdHJsLm1vZGVsLm1wMywgZGF0YSlcbiAgICAgICAgICAgICAgICAgICAgICAgIGN0cmwudXBkYXRlKClcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICQkLnVpLnNob3dBbGVydCh7dGl0bGU6ICdNUDMgSW5mb3JtYXRpb24nLCBjb250ZW50OiAnTm8gaW5mb3JtYXRpb24gZm91bmQgISd9KVxuICAgICAgICAgICAgICAgICAgICB9ICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9uU3VibWl0OiBmdW5jdGlvbihldikge1xuICAgICAgICAgICAgICAgICAgICBldi5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGEgPSAkKHRoaXMpLmdldEZvcm1EYXRhKClcblxuICAgICAgICAgICAgICAgICAgICBwYWdlci5wb3BQYWdlKGRhdGEpXG5cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG5cbiAgICAgICAgdGhpcy5nZXRCdXR0b25zID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIG9rOiB7XG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnQXBwbHknLFxuICAgICAgICAgICAgICAgICAgICBpY29uOiAnZmEgZmEtY2hlY2snLFxuICAgICAgICAgICAgICAgICAgICBvbkNsaWNrOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN0cmwuc2NvcGUuc3VibWl0LmNsaWNrKClcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn0pIiwiXG4kJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnZmlsdGVyRGxnJywge1xuXG4gICAgdGVtcGxhdGU6IFwiPGZvcm0gYm4tZXZlbnQ9XFxcInN1Ym1pdDogb25TdWJtaXRcXFwiPlxcblxcbiAgICA8bGFiZWw+R2VucmU8L2xhYmVsPlxcbiAgICA8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29tYm9ib3hcXFwiIGJuLWRhdGE9XFxcIntpdGVtczogZ2VucmVzfVxcXCIgYm4tdmFsPVxcXCJzZWxlY3RlZEdlbnJlXFxcIiBibi1ldmVudD1cXFwiY29tYm9ib3hjaGFuZ2U6IG9uR2VucmVDaGFuZ2VcXFwiIG5hbWU9XFxcImdlbnJlXFxcIj48L2Rpdj4gICAgXFxuXFxuICAgIDxsYWJlbD5BcnRpc3Q8L2xhYmVsPlxcbiAgICA8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29tYm9ib3hcXFwiIGJuLWRhdGE9XFxcIntpdGVtczogYXJ0aXN0c31cXFwiIGJuLXZhbD1cXFwic2VsZWN0ZWRBcnRpc3RcXFwiIGJuLXVwZGF0ZT1cXFwiY29tYm9ib3hjaGFuZ2VcXFwiIG5hbWU9XFxcImFydGlzdFxcXCI+PC9kaXY+ICAgIFxcblxcblxcbiAgICA8aW5wdXQgdHlwZT1cXFwic3VibWl0XFxcIiBoaWRkZW4gYm4tYmluZD1cXFwic3VibWl0XFxcIj5cXG48L2Zvcm0+XFxuXCIsXG5cbiAgICBkZXBzOiBbJ2JyZWl6Ym90LnBhZ2VyJ10sXG5cbiAgICBwcm9wczoge1xuICAgICAgICBmaWxlczogW10sXG4gICAgICAgIG1wM0ZpbHRlcnM6IG51bGxcbiAgICB9LFxuXG4gICAgaW5pdDogZnVuY3Rpb24gKGVsdCwgcGFnZXIpIHtcblxuICAgICAgICBsZXQgeyBmaWxlcywgbXAzRmlsdGVycyB9ID0gdGhpcy5wcm9wc1xuXG4gICAgICAgIG1wM0ZpbHRlcnMgPSBtcDNGaWx0ZXJzIHx8IHt9XG5cblxuICAgICAgICBjb25zdCBzZWxlY3RlZEdlbnJlID0gbXAzRmlsdGVycy5nZW5yZSB8fCAnQWxsJ1xuICAgICAgICBjb25zdCBzZWxlY3RlZEFydGlzdCA9IG1wM0ZpbHRlcnMuYXJ0aXN0IHx8ICdBbGwnXG5cbiAgICAgICAgY29uc29sZS5sb2coJ3NlbGVjdGVkQXJ0aXN0Jywgc2VsZWN0ZWRBcnRpc3QpXG4gICAgICAgIGNvbnNvbGUubG9nKCdzZWxlY3RlZEdlbnJlJywgc2VsZWN0ZWRHZW5yZSlcblxuICAgICAgICBmdW5jdGlvbiBnZXRHZW5yZXMoKSB7XG4gICAgICAgICAgICBsZXQgZ2VucmVzID0ge31cblxuICAgICAgICAgICAgZmlsZXMuZm9yRWFjaCgoZikgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChmLm1wMykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB7IGdlbnJlIH0gPSBmLm1wM1xuICAgICAgICAgICAgICAgICAgICBpZiAoZ2VucmUgJiYgIWdlbnJlLnN0YXJ0c1dpdGgoJygnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGdlbnJlc1tnZW5yZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnZW5yZXNbZ2VucmVdKytcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdlbnJlc1tnZW5yZV0gPSAxXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICBnZW5yZXMgPSBPYmplY3Qua2V5cyhnZW5yZXMpLnNvcnQoKS5tYXAoKGdlbnJlKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgbmJUaXRsZSA9IGdlbnJlc1tnZW5yZV1cbiAgICAgICAgICAgICAgICByZXR1cm4gKG5iVGl0bGUgPT0gMSkgP1xuICAgICAgICAgICAgICAgICAgICB7IHZhbHVlOiBnZW5yZSwgbGFiZWw6IGdlbnJlIH0gOlxuICAgICAgICAgICAgICAgICAgICB7IHZhbHVlOiBnZW5yZSwgbGFiZWw6IGAke2dlbnJlfSAoJHtuYlRpdGxlfSlgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBnZW5yZXMudW5zaGlmdCh7IHZhbHVlOiAnQWxsJywgbGFiZWw6ICdBbGwnLCBzdHlsZTogJ2ZvbnQtd2VpZ2h0OiBib2xkOycgfSlcblxuICAgICAgICAgICAgcmV0dXJuIGdlbnJlc1xuICAgICAgICB9XG5cblxuICAgICAgICBmdW5jdGlvbiBnZXRBcnRpc3RzKGdlbnJlKSB7XG4gICAgICAgICAgICBsZXQgYXJ0aXN0cyA9IHt9XG5cbiAgICAgICAgICAgIGZpbGVzLmZvckVhY2goKGYpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZi5tcDMgJiYgKGdlbnJlID09ICdBbGwnIHx8IGYubXAzLmdlbnJlID09IGdlbnJlKSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB7IGFydGlzdCB9ID0gZi5tcDNcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFydGlzdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFydGlzdHNbYXJ0aXN0XSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFydGlzdHNbYXJ0aXN0XSsrXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcnRpc3RzW2FydGlzdF0gPSAxXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgYXJ0aXN0cyA9IE9iamVjdC5rZXlzKGFydGlzdHMpLnNvcnQoKS5tYXAoKGFydGlzdCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5iVGl0bGUgPSBhcnRpc3RzW2FydGlzdF1cbiAgICAgICAgICAgICAgICByZXR1cm4gKG5iVGl0bGUgPT0gMSkgP1xuICAgICAgICAgICAgICAgICAgICB7IHZhbHVlOiBhcnRpc3QsIGxhYmVsOiBhcnRpc3QgfSA6XG4gICAgICAgICAgICAgICAgICAgIHsgdmFsdWU6IGFydGlzdCwgbGFiZWw6IGAke2FydGlzdH0gKCR7bmJUaXRsZX0pYCB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgYXJ0aXN0cy51bnNoaWZ0KHsgdmFsdWU6ICdBbGwnLCBsYWJlbDogJ0FsbCcsIHN0eWxlOiAnZm9udC13ZWlnaHQ6IGJvbGQ7JyB9KVxuICAgICAgICAgICAgcmV0dXJuIGFydGlzdHNcbiAgICAgICAgfVxuXG5cblxuXG5cbiAgICAgICAgY29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgIGFydGlzdHM6IGdldEFydGlzdHMoc2VsZWN0ZWRHZW5yZSksXG4gICAgICAgICAgICAgICAgZ2VucmVzOiBnZXRHZW5yZXMoKSxcbiAgICAgICAgICAgICAgICBzZWxlY3RlZEFydGlzdCxcbiAgICAgICAgICAgICAgICBzZWxlY3RlZEdlbnJlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZXZlbnRzOiB7XG4gICAgICAgICAgICAgICAgb25HZW5yZUNoYW5nZTogZnVuY3Rpb24oZXYpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZ2VucmUgPSAkKHRoaXMpLmdldFZhbHVlKClcbiAgICAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnb25HZW5yZUNoYW5nZScsIGdlbnJlKVxuICAgICAgICAgICAgICAgICAgICBjdHJsLnNldERhdGEoe2FydGlzdHM6IGdldEFydGlzdHMoZ2VucmUpfSlcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9uU3VibWl0OiBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgICAgICAgICAgZXYucHJldmVudERlZmF1bHQoKVxuICAgICAgICAgICAgICAgICAgICBwYWdlci5wb3BQYWdlKCQodGhpcykuZ2V0Rm9ybURhdGEoKSlcblxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcblxuICAgICAgICB0aGlzLmdldEJ1dHRvbnMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGFwcGx5OiB7XG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnQXBwbHknLFxuICAgICAgICAgICAgICAgICAgICBpY29uOiAnZmEgZmEtY2hlY2snLFxuICAgICAgICAgICAgICAgICAgICBvbkNsaWNrOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdHJsLnNjb3BlLnN1Ym1pdC5jbGljaygpXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgIH1cbn0pIiwiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ3Jvb3RQYWdlJywge1xuXG5cdHRlbXBsYXRlOiBcIjxwPlNlbGVjdCBhIGZpbGUgc3lzdGVtPC9wPlxcblxcbjx1bCBjbGFzcz1cXFwidzMtdWwgdzMtYm9yZGVyIHczLXdoaXRlXFxcIj5cXG5cdDxsaSBjbGFzcz1cXFwidzMtYmFyXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uSG9tZVxcXCI+XFxuXHRcdDxkaXYgY2xhc3M9XFxcInczLWJhci1pdGVtXFxcIj5cXG5cdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtaG9tZSBmYS0yeCBmYS1mdyB3My10ZXh0LWJsdWVcXFwiPjwvaT5cXG5cdFx0XHQ8c3Bhbj5Zb3VyIGhvbWUgZmlsZXM8L3NwYW4+XFxuXHRcdDwvZGl2Plxcblx0PC9saT5cXG5cXG5cdDxsaSBjbGFzcz1cXFwidzMtYmFyXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uU2hhcmVcXFwiPlxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJ3My1iYXItaXRlbVxcXCI+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLXNoYXJlLWFsdCBmYS0yeCBmYS1mdyB3My10ZXh0LWJsdWVcXFwiPjwvaT5cXG5cdFx0XHQ8c3Bhbj5GaWxlcyBzaGFyZWQgYnkgeW91ciBmcmllbmRzPC9zcGFuPlxcblx0XHQ8L2Rpdj5cXG5cdDwvbGk+XFxuXFxuXHQ8bGkgY2xhc3M9XFxcInczLWJhclxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvblBsYXlsaXN0XFxcIj5cXG5cdFx0PGRpdiBjbGFzcz1cXFwidzMtYmFyLWl0ZW1cXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1tdXNpYyBmYS0yeCBmYS1mdyB3My10ZXh0LWJsdWVcXFwiPjwvaT5cXG5cdFx0XHQ8c3Bhbj5Zb3VyIFBsYXlsaXN0czwvc3Bhbj5cXG5cdFx0PC9kaXY+XFxuXHQ8L2xpPlxcblxcbjwvdWw+XHRcIixcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LnBhZ2VyJ10sXG5cblx0aW5pdDogZnVuY3Rpb24gKGVsdCwgcGFnZXIpIHtcblxuXHRcdGZ1bmN0aW9uIG9wZW5GaWx0ZXJQYWdlKGlmYWNlKSB7XG5cdFx0XHRjb25zdCBtcDNGaWx0ZXJzID0gaWZhY2UuZ2V0TVAzRmlsdGVycygpXG5cdFx0XHRjb25zdCBmaWxlcyA9IGlmYWNlLmdldEZpbGVzKClcblxuXHRcdFx0cGFnZXIucHVzaFBhZ2UoJ2ZpbHRlckRsZycsIHtcblx0XHRcdFx0dGl0bGU6ICdGaWx0ZXInLFxuXHRcdFx0XHRwcm9wczoge1xuXHRcdFx0XHRcdGZpbGVzLFxuXHRcdFx0XHRcdG1wM0ZpbHRlcnNcblx0XHRcdFx0fSxcblx0XHRcdFx0b25SZXR1cm46IGZ1bmN0aW9uIChmaWx0ZXJzKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnZmlsdGVycycsIGZpbHRlcnMpXG5cdFx0XHRcdFx0aWZhY2Uuc2V0TVAzRmlsdGVycyhmaWx0ZXJzKVxuXHRcdFx0XHR9XG5cdFx0XHR9KVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIG9wZW5GaWxlUGFnZSh0aXRsZSwgZnJpZW5kVXNlcikge1xuXHRcdFx0cGFnZXIucHVzaFBhZ2UoJ2JyZWl6Ym90LmZpbGVzJywge1xuXHRcdFx0XHR0aXRsZSxcblx0XHRcdFx0cHJvcHM6IHtcblx0XHRcdFx0XHRmaWx0ZXJFeHRlbnNpb246ICcubXAzJyxcblx0XHRcdFx0XHRnZXRNUDNJbmZvOiB0cnVlLFxuXHRcdFx0XHRcdGZyaWVuZFVzZXJcblx0XHRcdFx0fSxcblx0XHRcdFx0YnV0dG9uczoge1xuXHRcdFx0XHRcdHNlYXJjaDoge1xuXHRcdFx0XHRcdFx0dGl0bGU6ICdGaWx0ZXInLFxuXHRcdFx0XHRcdFx0aWNvbjogJ2ZhIGZhLXNlYXJjaCcsXG5cdFx0XHRcdFx0XHRvbkNsaWNrOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRcdG9wZW5GaWx0ZXJQYWdlKHRoaXMpXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRldmVudHM6IHtcblx0XHRcdFx0XHRmaWxlY2xpY2s6IGZ1bmN0aW9uIChldiwgaW5mbykge1xuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ2luZm8nLCBpbmZvKVxuXHRcdFx0XHRcdFx0Y29uc3QgeyByb290RGlyLCBmaWxlTmFtZSB9ID0gaW5mb1xuXHRcdFx0XHRcdFx0Y29uc3QgaWZhY2UgPSAkKHRoaXMpLmlmYWNlKClcblx0XHRcdFx0XHRcdGNvbnN0IGZpbGVzID0gaWZhY2UuZ2V0RmlsdGVyZWRGaWxlcygpXG5cdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdmaWxlcycsIGZpbGVzKVxuXHRcdFx0XHRcdFx0Y29uc3QgZmlyc3RJZHggPSBmaWxlcy5maW5kSW5kZXgoKGYpID0+IGYubmFtZSA9PSBmaWxlTmFtZSlcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdmaXJzdElkeCcsIGZpcnN0SWR4KVxuXHRcdFx0XHRcdFx0cGFnZXIucHVzaFBhZ2UoJ3BsYXllcicsIHtcblx0XHRcdFx0XHRcdFx0dGl0bGU6ICdQbGF5ZXInLFxuXHRcdFx0XHRcdFx0XHRwcm9wczoge1xuXHRcdFx0XHRcdFx0XHRcdGZpcnN0SWR4LFxuXHRcdFx0XHRcdFx0XHRcdGZpbGVzLFxuXHRcdFx0XHRcdFx0XHRcdHJvb3REaXIsXG5cdFx0XHRcdFx0XHRcdFx0ZnJpZW5kVXNlcixcblx0XHRcdFx0XHRcdFx0XHRmaWxlQ3RybDogaWZhY2Vcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSlcblxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSlcblxuXHRcdH1cblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25Ib21lOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0b3BlbkZpbGVQYWdlKCdIb21lIGZpbGVzJywgJycpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uU2hhcmU6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRwYWdlci5wdXNoUGFnZSgnYnJlaXpib3QuZnJpZW5kcycsIHtcblx0XHRcdFx0XHRcdHRpdGxlOiAnU2hhcmVkIGZpbGVzJyxcblx0XHRcdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0XHRcdHNob3dDb25uZWN0aW9uU3RhdGU6IGZhbHNlXG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdFx0XHRcdGZyaWVuZGNsaWNrOiBmdW5jdGlvbiAoZXYsIGRhdGEpIHtcblx0XHRcdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblNlbGVjdEZyaWVuZCcsIGRhdGEpXG5cdFx0XHRcdFx0XHRcdFx0Y29uc3QgeyB1c2VyTmFtZSB9ID0gZGF0YVxuXHRcdFx0XHRcdFx0XHRcdG9wZW5GaWxlUGFnZSh1c2VyTmFtZSwgdXNlck5hbWUpXG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvblBsYXlsaXN0OiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblBsYXlsaXN0Jylcblx0XHRcdFx0XHRwYWdlci5wdXNoUGFnZSgncGxheWxpc3QnLCB7XG5cdFx0XHRcdFx0XHR0aXRsZTogJ1BsYXlsaXN0J1xuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH1cblxuXHRcdFx0fVxuXHRcdH0pXG5cblx0fVxuXG5cbn0pO1xuXG5cblxuXG4iLCIoZnVuY3Rpb24gKCkge1xuXG5cdGZ1bmN0aW9uIGdldFRpbWUoZHVyYXRpb24pIHtcblx0XHRjb25zdCBkID0gbmV3IERhdGUoZHVyYXRpb24gKiAxMDAwKVxuXHRcdGNvbnN0IHYgPSBkLmdldE1pbnV0ZXMoKSArIGQuZ2V0U2Vjb25kcygpIC8gMTAwXG5cdFx0cmV0dXJuIHYudG9GaXhlZCgyKS5yZXBsYWNlKCcuJywgJzonKVxuXHR9XG5cblxuXHQkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgncGxheWVyJywge1xuXG5cdFx0dGVtcGxhdGU6IFwiPGRpdiBjbGFzcz1cXFwiaW5mb1xcXCI+XFxuXHQ8ZGl2IGNsYXNzPVxcXCJ0aXRsZVxcXCIgYm4tc2hvdz1cXFwiIXRpdGxlXFxcIj5cXG5cdFx0PHN0cm9uZz5GaWxlTmFtZTo8L3N0cm9uZz5cXG5cdFx0PHNwYW4gYm4tdGV4dD1cXFwibmFtZVxcXCI+PC9zcGFuPlxcblx0PC9kaXY+XFxuXHQ8ZGl2IGNsYXNzPVxcXCJ0aXRsZVxcXCIgYm4tc2hvdz1cXFwidGl0bGVcXFwiPlxcblx0XHQ8c3Ryb25nPlRpdGxlOjwvc3Ryb25nPlxcblx0XHQ8c3BhbiBibi10ZXh0PVxcXCJ0aXRsZVxcXCI+PC9zcGFuPlxcblx0PC9kaXY+XFxuXHQ8ZGl2IGNsYXNzPVxcXCJ0aXRsZVxcXCIgYm4tc2hvdz1cXFwiYXJ0aXN0XFxcIj5cXG5cdFx0PHN0cm9uZz5BcnRpc3Q6PC9zdHJvbmc+XFxuXHRcdDxzcGFuIGJuLXRleHQ9XFxcImFydGlzdFxcXCI+PC9zcGFuPlxcblx0PC9kaXY+XFxuXHQ8ZGl2IGNsYXNzPVxcXCJ0aXRsZVxcXCIgYm4tc2hvdz1cXFwiZ2VucmVcXFwiPlxcblx0XHQ8c3Ryb25nPkdlbnJlOjwvc3Ryb25nPlxcblx0XHQ8c3BhbiBibi10ZXh0PVxcXCJnZW5yZVxcXCI+PC9zcGFuPlxcblx0PC9kaXY+XFxuXHQ8ZGl2IGNsYXNzPVxcXCJ0aXRsZVxcXCIgYm4tc2hvdz1cXFwieWVhclxcXCI+XFxuXHRcdDxzdHJvbmc+WWVhcjo8L3N0cm9uZz5cXG5cdFx0PHNwYW4gYm4tdGV4dD1cXFwieWVhclxcXCI+PC9zcGFuPlxcblx0PC9kaXY+XFxuPC9kaXY+XFxuPGRpdiBjbGFzcz1cXFwidG9vbGJhclxcXCI+XFxuXHQ8YnV0dG9uIGJuLXByb3A9XFxcIntkaXNhYmxlZDogaXNGaXJzdH1cXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25QcmV2XFxcIiBjbGFzcz1cXFwidzMtYnRuIHczLWJsdWVcXFwiIHRpdGxlPVxcXCJQcmV2aW91c1xcXCI+XFxuXHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1sZyBmYS1zdGVwLWJhY2t3YXJkXFxcIj48L2k+XFxuXHQ8L2J1dHRvbj5cXG5cXG5cdDxidXR0b24gYm4tc2hvdz1cXFwiIXBsYXlpbmdcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25QbGF5XFxcIiBjbGFzcz1cXFwidzMtYnRuIHczLWJsdWVcXFwiIHRpdGxlPVxcXCJQbGF5XFxcIj5cXG5cdFx0PGkgY2xhc3M9XFxcImZhIGZhLWxnIGZhLXBsYXlcXFwiPjwvaT5cXG5cdDwvYnV0dG9uPlxcblxcblx0PGJ1dHRvbiBibi1zaG93PVxcXCJwbGF5aW5nXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uUGF1c2VcXFwiIGNsYXNzPVxcXCJ3My1idG4gdzMtYmx1ZVxcXCIgdGl0bGU9XFxcIlBhdXNlXFxcIj5cXG5cdFx0PGkgY2xhc3M9XFxcImZhIGZhLWxnIGZhLXBhdXNlXFxcIj48L2k+XFxuXHQ8L2J1dHRvbj5cXG5cXG5cdDxidXR0b24gYm4tcHJvcD1cXFwie2Rpc2FibGVkOiBpc0xhc3R9XFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uTmV4dFxcXCIgY2xhc3M9XFxcInczLWJ0biB3My1ibHVlXFxcIiB0aXRsZT1cXFwiTmV4dFxcXCI+XFxuXHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1sZyBmYS1zdGVwLWZvcndhcmRcXFwiPjwvaT5cXG5cdDwvYnV0dG9uPlxcblxcbjwvZGl2PlxcblxcbjxkaXYgY2xhc3M9XFxcInRvb2xiYXIyXFxcIj5cXG5cdDxpIGNsYXNzPVxcXCJmYXMgZmEtcmFuZG9tIGZhLWxnIHczLXRleHQtYmx1ZSBzaHVmZmxlXFxcIj48L2k+XFxuXHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuZmxpcHN3aXRjaFxcXCIgYm4tZXZlbnQ9XFxcImZsaXBzd2l0Y2hjaGFuZ2U6IG9uU2h1ZmZsZUNoYW5nZVxcXCI+XFxuXFxuXHQ8L2Rpdj5cXG5cdDxpIGNsYXNzPVxcXCJmYXMgZmEtbGcgZmEtdm9sdW1lLWRvd24gdzMtdGV4dC1ibHVlIHZvbHVtZVxcXCI+PC9pPlxcblx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLnNsaWRlclxcXCIgYm4tZGF0YT1cXFwie21pbjogMCwgbWF4OjEsIHN0ZXA6IDAuMX1cXFwiIGJuLWV2ZW50PVxcXCJpbnB1dDogb25Wb2x1bWVDaGFuZ2VcXFwiXFxuXHRcdGJuLXZhbD1cXFwidm9sdW1lXFxcIiBjbGFzcz1cXFwidm9sdWxtZVNsaWRlclxcXCI+PC9kaXY+XFxuPC9kaXY+XFxuXFxuXFxuPGRpdiBjbGFzcz1cXFwic2xpZGVyXFxcIj5cXG5cdDxzcGFuIGJuLXRleHQ9XFxcImdldFRpbWVJbmZvXFxcIj48L3NwYW4+XFxuXHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuc2xpZGVyXFxcIiBibi1kYXRhPVxcXCJ7bWF4OiBkdXJhdGlvbn1cXFwiIGJuLWV2ZW50PVxcXCJpbnB1dDogb25TbGlkZXJDaGFuZ2VcXFwiIGJuLXZhbD1cXFwiY3VyVGltZVxcXCI+XFxuXHQ8L2Rpdj5cXG5cXG48L2Rpdj5cXG5cXG48YXVkaW8gYm4tYXR0cj1cXFwie3NyY31cXFwiIGJuLWJpbmQ9XFxcImF1ZGlvXFxcIiBhdXRvcGxheT1cXFwiXFxcIlxcblx0Ym4tZXZlbnQ9XFxcImNhbnBsYXk6IG9uTG9hZCwgdGltZXVwZGF0ZTogb25UaW1lVXBkYXRlLCBwbGF5aW5nOiBvblBsYXlpbmcsIHBhdXNlOiBvblBhdXNlZCwgZW5kZWQ6IG9uRW5kZWRcXFwiPlxcbjwvYXVkaW8+XCIsXG5cblx0XHRkZXBzOiBbJ2JyZWl6Ym90LmZpbGVzJywgJ2JyZWl6Ym90Lmh0dHAnLCAnYnJlaXpib3QucGFnZXInXSxcblxuXHRcdHByb3BzOiB7XG5cdFx0XHRyb290RGlyOiAnJyxcblx0XHRcdGZpbGVzOiBbXSxcblx0XHRcdGZpcnN0SWR4OiAwLFxuXHRcdFx0ZnJpZW5kVXNlcjogJycsXG5cdFx0XHRmaWxlQ3RybDogbnVsbCxcblx0XHRcdGlzUGxheWxpc3Q6IGZhbHNlXG5cdFx0fSxcblxuXHRcdGluaXQ6IGZ1bmN0aW9uIChlbHQsIGZpbGVzU3J2LCBodHRwLCBwYWdlcikge1xuXG5cdFx0XHRjb25zdCB7IHJvb3REaXIsIGZpbGVzLCBmaXJzdElkeCwgZnJpZW5kVXNlciwgZmlsZUN0cmwsIGlzUGxheWxpc3QgfSA9IHRoaXMucHJvcHNcblxuXHRcdFx0bGV0IHNodWZmbGVJbmRleGVzID0gbnVsbFxuXHRcdFx0bGV0IHBsYXlsaXN0ID0gW11cblx0XHRcdHBhZ2VyLnNldEJ1dHRvblZpc2libGUoe3BsYXlsaXN0OiAhaXNQbGF5bGlzdH0pXG5cblx0XHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdFx0ZGF0YToge1xuXHRcdFx0XHRcdGlkeDogZmlyc3RJZHgsXG5cdFx0XHRcdFx0bmJGaWxlczogZmlsZXMubGVuZ3RoLFxuXHRcdFx0XHRcdHNyYzogZ2V0RmlsZVVybChmaXJzdElkeCksXG5cdFx0XHRcdFx0bmFtZTogZ2V0TmFtZShmaXJzdElkeCksXG5cdFx0XHRcdFx0dGl0bGU6IGdldFRpdGxlKGZpcnN0SWR4KSxcblx0XHRcdFx0XHRhcnRpc3Q6IGdldEFydGlzdChmaXJzdElkeCksXG5cdFx0XHRcdFx0Z2VucmU6IGdldEdlbnJlKGZpcnN0SWR4KSxcblx0XHRcdFx0XHR5ZWFyOiBnZXRZZWFyKGZpcnN0SWR4KSxcblx0XHRcdFx0XHR2b2x1bWU6IDAsXG5cdFx0XHRcdFx0ZHVyYXRpb246IDAsXG5cdFx0XHRcdFx0Y3VyVGltZTogMCxcblx0XHRcdFx0XHRwbGF5aW5nOiBmYWxzZSxcblx0XHRcdFx0XHRpc0ZpcnN0OiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gKHRoaXMuaWR4ID09IDApXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRpc0xhc3Q6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdHJldHVybiAodGhpcy5pZHggPT0gdGhpcy5uYkZpbGVzIC0gMSlcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGdldFRpbWVJbmZvOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gYCR7Z2V0VGltZSh0aGlzLmN1clRpbWUpfSAvICR7Z2V0VGltZSh0aGlzLmR1cmF0aW9uKX1gXG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRcdG9uVm9sdW1lQ2hhbmdlOiBmdW5jdGlvbihldiwgdmFsdWUpIHtcblx0XHRcdFx0XHRcdGF1ZGlvLnZvbHVtZSA9IHZhbHVlXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRvbkxvYWQ6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ2R1cmF0aW9uJywgdGhpcy5kdXJhdGlvbilcblx0XHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7IGR1cmF0aW9uOiBNYXRoLmZsb29yKHRoaXMuZHVyYXRpb24pLCB2b2x1bWU6IGF1ZGlvLnZvbHVtZSB9KVxuXHRcdFx0XHRcdH0sXG5cblx0XHRcdFx0XHRvblRpbWVVcGRhdGU6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7IGN1clRpbWU6IHRoaXMuY3VycmVudFRpbWUgfSlcblx0XHRcdFx0XHR9LFxuXG5cdFx0XHRcdFx0b25QbGF5aW5nOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblBsYXlpbmcnKVxuXHRcdFx0XHRcdFx0Y3RybC5zZXREYXRhKHsgcGxheWluZzogdHJ1ZSB9KVxuXHRcdFx0XHRcdH0sXG5cblx0XHRcdFx0XHRvblBhdXNlZDogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25QYXVzZWQnKVxuXHRcdFx0XHRcdFx0Y3RybC5zZXREYXRhKHsgcGxheWluZzogZmFsc2UgfSlcblx0XHRcdFx0XHR9LFxuXG5cdFx0XHRcdFx0b25QbGF5OiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRhdWRpby5wbGF5KClcblx0XHRcdFx0XHR9LFxuXG5cdFx0XHRcdFx0b25QYXVzZTogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0YXVkaW8ucGF1c2UoKVxuXHRcdFx0XHRcdH0sXG5cblx0XHRcdFx0XHRvblNsaWRlckNoYW5nZTogZnVuY3Rpb24gKGV2LCB2YWx1ZSkge1xuXHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25TbGlkZXJDaGFuZ2UnLCB2YWx1ZSlcblx0XHRcdFx0XHRcdGF1ZGlvLmN1cnJlbnRUaW1lID0gdmFsdWVcblx0XHRcdFx0XHR9LFxuXG5cdFx0XHRcdFx0b25TaHVmZmxlQ2hhbmdlOiBmdW5jdGlvbiAoZXYsIGlzQWN0aXZhdGVkKSB7XG5cdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblNodWZmbGVDaGFuZ2UnLCB2YWx1ZSlcblx0XHRcdFx0XHRcdGlmIChpc0FjdGl2YXRlZCkge1xuXHRcdFx0XHRcdFx0XHRzaHVmZmxlSW5kZXhlcyA9ICQkLnV0aWwua251dGhTaHVmZmxlKGN0cmwubW9kZWwubmJGaWxlcylcblx0XHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnc2h1ZmZsZUluZGV4ZXMnLCBzaHVmZmxlSW5kZXhlcylcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRzaHVmZmxlSW5kZXhlcyA9IG51bGxcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9LFxuXG5cdFx0XHRcdFx0b25FbmRlZDogbmV4dCxcblxuXHRcdFx0XHRcdG9uUHJldjogcHJldixcblxuXHRcdFx0XHRcdG9uTmV4dDogbmV4dFxuXG5cdFx0XHRcdH1cblx0XHRcdH0pXG5cblx0XHRcdGZ1bmN0aW9uIHByZXYoKSB7XG5cdFx0XHRcdGxldCB7IGlkeCB9ID0gY3RybC5tb2RlbFxuXHRcdFx0XHRpZiAoaWR4ID4gMCkge1xuXHRcdFx0XHRcdHNldEluZGV4KGlkeCAtIDEpXG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0ZnVuY3Rpb24gbmV4dCgpIHtcblx0XHRcdFx0aWYgKHNodWZmbGVJbmRleGVzICE9IG51bGwpIHtcblx0XHRcdFx0XHRpZiAoc2h1ZmZsZUluZGV4ZXMubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRcdFx0c2V0SW5kZXgoc2h1ZmZsZUluZGV4ZXMucG9wKCkpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHJldHVyblxuXHRcdFx0XHR9XG5cblx0XHRcdFx0bGV0IHsgaWR4LCBuYkZpbGVzIH0gPSBjdHJsLm1vZGVsXG5cdFx0XHRcdGlmIChpZHggPCBuYkZpbGVzIC0gMSkge1xuXHRcdFx0XHRcdHNldEluZGV4KGlkeCArIDEpXG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0ZnVuY3Rpb24gc2V0SW5kZXgoaWR4KSB7XG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7XG5cdFx0XHRcdFx0c3JjOiBnZXRGaWxlVXJsKGlkeCksXG5cdFx0XHRcdFx0dGl0bGU6IGdldFRpdGxlKGlkeCksXG5cdFx0XHRcdFx0bmFtZTogZ2V0TmFtZShpZHgpLFxuXHRcdFx0XHRcdGFydGlzdDogZ2V0QXJ0aXN0KGlkeCksXG5cdFx0XHRcdFx0Z2VucmU6IGdldEdlbnJlKGlkeCksXG5cdFx0XHRcdFx0eWVhcjogZ2V0WWVhcihpZHgpLFxuXHRcdFx0XHRcdGlkeFxuXHRcdFx0XHR9KVxuXHRcdFx0fVxuXG5cdFx0XHRjb25zdCBhdWRpbyA9IGN0cmwuc2NvcGUuYXVkaW8uZ2V0KDApXG5cblx0XHRcdGZ1bmN0aW9uIGdldE5hbWUoaWR4KSB7XG5cdFx0XHRcdHJldHVybiAoaXNQbGF5bGlzdCkgPyBmaWxlc1tpZHhdLmZpbGVJbmZvLmZpbGVOYW1lIDogZmlsZXNbaWR4XS5uYW1lXG5cdFx0XHR9XG5cblx0XHRcdGZ1bmN0aW9uIGdldFRpdGxlKGlkeCkge1xuXHRcdFx0XHRyZXR1cm4gZmlsZXNbaWR4XS5tcDMudGl0bGUgfHwgJydcblx0XHRcdH1cblxuXHRcdFx0ZnVuY3Rpb24gZ2V0QXJ0aXN0KGlkeCkge1xuXHRcdFx0XHRyZXR1cm4gZmlsZXNbaWR4XS5tcDMuYXJ0aXN0IHx8ICcnXG5cdFx0XHR9XG5cblx0XHRcdGZ1bmN0aW9uIGdldEdlbnJlKGlkeCkge1xuXHRcdFx0XHRyZXR1cm4gZmlsZXNbaWR4XS5tcDMuZ2VucmUgfHwgJydcblx0XHRcdH1cblxuXHRcdFx0ZnVuY3Rpb24gZ2V0WWVhcihpZHgpIHtcblx0XHRcdFx0cmV0dXJuIGZpbGVzW2lkeF0ubXAzLnllYXIgfHwgJydcblx0XHRcdH1cblxuXHRcdFx0ZnVuY3Rpb24gZ2V0RmlsZVVybChpZHgpIHtcblx0XHRcdFx0aWYgKGlzUGxheWxpc3QpIHtcblx0XHRcdFx0XHRjb25zdCB7cm9vdERpciwgZmlsZU5hbWUsIGZyaWVuZFVzZXJ9ID0gZmlsZXNbaWR4XS5maWxlSW5mb1xuXHRcdFx0XHRcdHJldHVybiBmaWxlc1Nydi5maWxlVXJsKHJvb3REaXIgKyBmaWxlTmFtZSwgZnJpZW5kVXNlcilcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gZmlsZXNTcnYuZmlsZVVybChyb290RGlyICsgZmlsZXNbaWR4XS5uYW1lLCBmcmllbmRVc2VyKVxuXHRcdFx0fVxuXG5cdFx0XHRhc3luYyBmdW5jdGlvbiBnZXRQbGF5bGlzdCgpIHtcblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnZ2V0UGxheWxpc3QnKVxuXHRcdFx0XHRwbGF5bGlzdCAgPSBhd2FpdCBodHRwLnBvc3QoJy9nZXRQbGF5bGlzdCcpXG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ3BsYXlsaXN0JywgcGxheWxpc3QpXG5cdFx0XHR9XG5cblx0XHRcdGdldFBsYXlsaXN0KClcblxuXHRcdFx0dGhpcy5nZXRCdXR0b25zID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdHBsYXlsaXN0OiB7XG5cdFx0XHRcdFx0XHR2aXNpYmxlOiAhaXNQbGF5bGlzdCxcblx0XHRcdFx0XHRcdHRpdGxlOiAnQWRkIHRvIHBsYXlsaXN0Jyxcblx0XHRcdFx0XHRcdGljb246ICdmYXMgZmEtc3RhcicsXG5cdFx0XHRcdFx0XHRpdGVtczogZnVuY3Rpb24oKSB7XG5cblx0XHRcdFx0XHRcdFx0Y29uc3QgcmV0ID0ge1xuXHRcdFx0XHRcdFx0XHRcdG5ldzoge25hbWU6ICdBZGQgdG8gbmV3IHBsYXlsaXN0J31cblx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdGlmIChwbGF5bGlzdC5sZW5ndGggIT0gMCkge1xuXHRcdFx0XHRcdFx0XHRcdHJldC5zZXAgPSAnLS0tLS0tJ1xuXHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0cGxheWxpc3QuZm9yRWFjaCgobmFtZSkgPT4ge1xuXHRcdFx0XHRcdFx0XHRcdHJldFtuYW1lXSA9IHtuYW1lfVxuXHRcdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0XHRyZXR1cm4gcmV0XG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0b25DbGljazogYXN5bmMgZnVuY3Rpb24oY21kKSB7XG5cdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbkNsaWNrJywgY21kKVxuXHRcdFx0XHRcdFx0XHRjb25zdCBmaWxlSW5mbyA9IHtyb290RGlyLCBmcmllbmRVc2VyLCBmaWxlTmFtZTogY3RybC5tb2RlbC5uYW1lfVxuXHRcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdFx0aWYgKGNtZCA9PSAnbmV3Jykge1xuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IG5hbWUgPSBhd2FpdCAkJC51aS5zaG93UHJvbXB0KHt0aXRsZTogJ0FkZCBQbGF5bGlzdCcsIGxhYmVsOiAnTmFtZTonfSlcblx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygnbmFtZScsIG5hbWUpXG5cdFx0XHRcdFx0XHRcdFx0Y29uc3QgcmV0ID0gYXdhaXQgaHR0cC5wb3N0KCcvYWRkU29uZycsIHtuYW1lLCBmaWxlSW5mbywgY2hlY2tFeGlzdHM6dHJ1ZX0pXG5cdFx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ3JldCcsIHJldClcblx0XHRcdFx0XHRcdFx0XHRpZiAoIXJldCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHt0aXRsZTogJ0Vycm9yJywgY29udGVudDogJ1BsYXlsaXN0IGFscmVhZHkgZXhpc3RzJ30pXG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdFx0YXdhaXQgZ2V0UGxheWxpc3QoKVxuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRhd2FpdCBodHRwLnBvc3QoJy9hZGRTb25nJywge25hbWU6IGNtZCwgZmlsZUluZm8sIGNoZWNrRXhpc3RzOmZhbHNlfSlcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0ZWRpdEluZm86IHtcblx0XHRcdFx0XHRcdHZpc2libGU6ICFpc1BsYXlsaXN0LFxuXHRcdFx0XHRcdFx0dGl0bGU6ICdFZGl0IEluZm8nLFxuXHRcdFx0XHRcdFx0aWNvbjogJ2ZhIGZhLWVkaXQnLFxuXHRcdFx0XHRcdFx0b25DbGljazogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0XHRjb25zdCB7IGlkeCwgbmFtZSB9ID0gY3RybC5tb2RlbFxuXHRcdFx0XHRcdFx0XHRwYWdlci5wdXNoUGFnZSgnZWRpdERsZycsIHtcblx0XHRcdFx0XHRcdFx0XHR0aXRsZTogJ0VkaXQgTVAzIEluZm8nLFxuXHRcdFx0XHRcdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0XHRcdFx0XHRtcDM6IGZpbGVzW2lkeF0ubXAzLFxuXHRcdFx0XHRcdFx0XHRcdFx0ZmlsZU5hbWU6IG5hbWVcblx0XHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHRcdG9uUmV0dXJuOiBhc3luYyBmdW5jdGlvbiAodGFncykge1xuXHRcdFx0XHRcdFx0XHRcdFx0Ly9jb25zb2xlLmdyb3VwKCdvblJldHVybicsIHRhZ3MpXG5cdFx0XHRcdFx0XHRcdFx0XHRmaWxlc1tpZHhdLm1wMyA9IHRhZ3Ncblx0XHRcdFx0XHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh0YWdzKVxuXHRcdFx0XHRcdFx0XHRcdFx0YXdhaXQgaHR0cC5wb3N0KCcvc2F2ZUluZm8nLCB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdGZpbGVQYXRoOiByb290RGlyICsgbmFtZSxcblx0XHRcdFx0XHRcdFx0XHRcdFx0ZnJpZW5kVXNlcixcblx0XHRcdFx0XHRcdFx0XHRcdFx0dGFnc1xuXHRcdFx0XHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRcdFx0XHRcdGF3YWl0IGZpbGVDdHJsLnVwZGF0ZUZpbGUobmFtZSwgeyBnZXRNUDNJbmZvOiB0cnVlIH0pXG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9KVxuXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHR9XG5cblxuXHR9KTtcblxufSkoKTtcblxuXG5cbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdwbGF5bGlzdCcsIHtcbiAgICBkZXBzOiBbJ2JyZWl6Ym90Lmh0dHAnLCAnYnJlaXpib3QucGFnZXInXSxcblxuICAgIHRlbXBsYXRlOiBcIjxkaXYgY2xhc3M9XFxcInRvb2xiYXJcXFwiIGJuLXNob3c9XFxcImhhc1BsYXlsaXN0XFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwibGVmdFxcXCI+XFxuICAgICAgICA8c3Bhbj5QbGF5bGlzdDwvc3Bhbj5cXG4gICAgICAgIDxkaXYgXFxuICAgICAgICAgICAgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb21ib2JveFxcXCJcXG4gICAgICAgICAgICBibi1kYXRhPVxcXCJ7aXRlbXM6IHBsYXlsaXN0fVxcXCJcXG4gICAgICAgICAgICBibi1ldmVudD1cXFwiY29tYm9ib3hjaGFuZ2U6IG9uUGxheWxpc3RDaGFuZ2VcXFwiXFxuICAgICAgICA+PC9kaXY+XFxuICAgIFxcbiAgICA8L2Rpdj5cXG4gICAgPGRpdiBjbGFzcz1cXFwicmlnaHRcXFwiPlxcbiAgICAgICAgPHNwYW4gYm4tdGV4dD1cXFwibmJTb25nc1xcXCI+PC9zcGFuPiZuYnNwO1NvbmdzXFxuICAgIDwvZGl2PlxcbjwvZGl2PlxcbjxkaXYgYm4tc2hvdz1cXFwiIWhhc1BsYXlsaXN0XFxcIiBjbGFzcz1cXFwibWVzc2FnZVxcXCI+XFxuICAgIFlvdSBoYXZlIG5vIHBsYXlsaXN0XFxuPC9kaXY+XFxuXFxuPGRpdiBjbGFzcz1cXFwic2Nyb2xsUGFuZWxcXFwiPlxcbiAgICA8ZGl2IGJuLWVhY2g9XFxcInNvbmdzXFxcIiBibi1pdGVyPVxcXCJmXFxcIiBibi1ldmVudD1cXFwiY2xpY2suaXRlbTogb25JdGVtQ2xpY2tcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwidzMtY2FyZC0yIGl0ZW1cXFwiPlxcbiAgICAgICAgICAgIDxkaXY+VGl0bGU6Jm5ic3A7PHN0cm9uZyBibi10ZXh0PVxcXCIkc2NvcGUuZi5tcDMudGl0bGVcXFwiPjwvc3Ryb25nPjwvZGl2PlxcblxcbiAgICAgICAgICAgIDxkaXY+QXJ0aXN0OiZuYnNwOzxzdHJvbmcgYm4tdGV4dD1cXFwiJHNjb3BlLmYubXAzLmFydGlzdFxcXCI+PC9zdHJvbmc+PC9kaXY+XFxuICAgICAgICAgICAgPGRpdiBibi1zaG93PVxcXCJoYXNHZW5yZVxcXCI+R2VucmU6Jm5ic3A7PHN0cm9uZyBibi10ZXh0PVxcXCIkc2NvcGUuZi5tcDMuZ2VucmVcXFwiPjwvc3Ryb25nPjwvZGl2PlxcbiAgICAgICAgICAgIDxkaXYgYm4tc2hvdz1cXFwiaGFzWWVhclxcXCI+IFllYXI6Jm5ic3A7PHN0cm9uZyBibi10ZXh0PVxcXCJnZXRZZWFyXFxcIj48L3N0cm9uZz48L2Rpdj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICA8L2Rpdj5cXG48L2Rpdj5cIixcblxuICAgIGluaXQ6IGZ1bmN0aW9uIChlbHQsIGh0dHAsIHBhZ2VyKSB7XG5cbiAgICAgICAgY29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgIHBsYXlsaXN0OiBbXSxcbiAgICAgICAgICAgICAgICBzb25nczogW10sXG4gICAgICAgICAgICAgICAgbmJTb25nczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5zb25ncy5sZW5ndGhcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGhhc1BsYXlsaXN0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnBsYXlsaXN0Lmxlbmd0aCAhPSAwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBoYXNHZW5yZTogZnVuY3Rpb24gKHNjb3BlKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCB7IGdlbnJlIH0gPSBzY29wZS5mLm1wM1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2VucmUgIT0gdW5kZWZpbmVkICYmIGdlbnJlICE9ICcnICYmICFnZW5yZS5zdGFydHNXaXRoKCcoJylcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgaGFzWWVhcjogZnVuY3Rpb24gKHNjb3BlKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCB7IHllYXIgfSA9IHNjb3BlLmYubXAzXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB5ZWFyICE9IHVuZGVmaW5lZCAmJiB5ZWFyICE9ICcnXG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGdldFllYXI6IGZ1bmN0aW9uIChzY29wZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VJbnQoc2NvcGUuZi5tcDMueWVhcilcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZXZlbnRzOiB7XG4gICAgICAgICAgICAgICAgb25JdGVtQ2xpY2s6IGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpZHggPSAkKHRoaXMpLmluZGV4KClcbiAgICAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnb25JdGVtQ2xpY2snLCBpZHgpXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvblBsYXlsaXN0Q2hhbmdlOiBhc3luYyBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcGxheWxpc3QgPSAkKHRoaXMpLmdldFZhbHVlKClcbiAgICAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnb25QbGF5bGlzdENoYW5nZScsIHBsYXlsaXN0KVxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBnZXRQbGF5bGlzdFNvbmdzKHBsYXlsaXN0KVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICB9KVxuXG4gICAgICAgIGFzeW5jIGZ1bmN0aW9uIGdldFBsYXlsaXN0KCkge1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnZ2V0UGxheWxpc3QnKVxuICAgICAgICAgICAgY29uc3QgcGxheWxpc3QgPSBhd2FpdCBodHRwLnBvc3QoJy9nZXRQbGF5bGlzdCcpXG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdwbGF5bGlzdCcsIHBsYXlsaXN0KVxuICAgICAgICAgICAgY3RybC5zZXREYXRhKHsgcGxheWxpc3QgfSlcbiAgICAgICAgICAgIGlmIChwbGF5bGlzdC5sZW5ndGggIT0gMCkge1xuICAgICAgICAgICAgICAgIGF3YWl0IGdldFBsYXlsaXN0U29uZ3MocGxheWxpc3RbMF0pXG4gICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnc29uZ3MnLCBzb25ncylcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGFzeW5jIGZ1bmN0aW9uIGdldFBsYXlsaXN0U29uZ3MobmFtZSkge1xuICAgICAgICAgICAgY29uc3Qgc29uZ3MgPSBhd2FpdCBodHRwLnBvc3QoJy9nZXRQbGF5bGlzdFNvbmdzJywgeyBuYW1lIH0pXG4gICAgICAgICAgICBjdHJsLnNldERhdGEoeyBzb25ncyB9KVxuICAgICAgICAgICAgcGFnZXIuc2V0QnV0dG9uVmlzaWJsZSh7IHBsYXk6IHNvbmdzLmxlbmd0aCAhPSAwIH0pXG4gICAgICAgIH1cblxuICAgICAgICBnZXRQbGF5bGlzdCgpXG5cbiAgICAgICAgdGhpcy5nZXRCdXR0b25zID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBwbGF5OiB7XG4gICAgICAgICAgICAgICAgICAgIHZpc2libGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ1BsYXknLFxuICAgICAgICAgICAgICAgICAgICBpY29uOiAnZmEgZmEtcGxheScsXG4gICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhZ2VyLnB1c2hQYWdlKCdwbGF5ZXInLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcHM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICdQbGF5ZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc1BsYXlsaXN0OiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxlczogY3RybC5tb2RlbC5zb25nc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgfVxufSkiXX0=
