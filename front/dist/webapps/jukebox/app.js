$$.control.registerControl('editDlg', {

    template: "<form bn-event=\"submit: onSubmit\">\n    <label>Title</label>\n    <input type=\"text\" bn-val=\"title\" bn-update=\"input\" required>\n    <label>Artist</label>\n    <input type=\"text\" bn-val=\"artist\" bn-update=\"input\" required>\n\n\n    <input type=\"submit\" hidden bn-bind=\"submit\">\n</form>\n\n<div class=\"toolbar\">\n    <button type=\"button\" title=\"Find Info\" bn-event=\"click: onFindInfo\" class=\"w3-btn w3-blue w3-circle\">\n        <i class=\"fa fa-search\"></i>\n    </button>\n    \n</div>\n",

    deps: ['breizbot.http', 'breizbot.pager'],

    props: {
        data: {},
        fileName: ''
    },

    init: function(elt, http, pager) {

        const {data, fileName} = this.props

        const ctrl = $$.viewController(elt, {
            data: {
               title: data.title,
               artist: data.artist 
            },
            events: {
                onFindInfo: async function() {
					const data = await http.post('/search', {
						query: fileName.replace('.mp3', ''),
					})
                    console.log(data)
                    if (data && data.title) {
                        ctrl.setData({
                            title: data.title,
                            artist: data.artist 
                        })
                    }
                    else {
                        $$.ui.showAlert({title: 'MP3 Information', content: 'No information found !'})
                    }                    
                },
                onSubmit: function(ev) {
                    ev.preventDefault()

                    const {title, artist} = ctrl.model
                    pager.popPage({title, artist})

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

	template: "<p>Select a file system</p>\n\n<ul class=\"w3-ul w3-border w3-white\">\n	<li class=\"w3-bar\" bn-event=\"click: onHome\">\n		<div class=\"w3-bar-item\">\n			<i class=\"fa fa-home fa-2x fa-fw w3-text-blue\"></i>\n			<span>Your home files</span>\n		</div>\n	</li>\n\n	<li class=\"w3-bar\" bn-event=\"click: onShare\">\n		<div class=\"w3-bar-item\">\n			<i class=\"fa fa-share-alt fa-2x fa-fw w3-text-blue\"></i>\n			<span>Files shared by your friends</span>\n		</div>\n	</li>\n</ul>	",

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
						console.log('files', files)
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

		template: "<div class=\"title\" bn-show=\"!title\">\n	<strong>FileName:&nbsp;</strong>\n	<span bn-text=\"name\"></span>\n</div>\n<div class=\"title\" bn-show=\"title\">\n	<strong>Title:&nbsp;</strong>\n	<span bn-text=\"title\"></span>\n</div>\n<div class=\"title\" bn-show=\"artist\">\n	<strong>Artist:&nbsp;</strong>\n	<span bn-text=\"artist\"></span>\n</div>\n<div class=\"title\" bn-show=\"genre\">\n	<strong>Genre:&nbsp;</strong>\n	<span bn-text=\"genre\"></span>\n</div>\n<div class=\"title\" bn-show=\"year\">\n	<strong>Year:&nbsp;</strong>\n	<span bn-text=\"year\"></span>\n</div>\n<div class=\"toolbar\">\n		<button bn-prop=\"{disabled: isFirst}\" bn-event=\"click: onPrev\" class=\"w3-btn w3-blue\" title=\"Previous\">\n			<i class=\"fa fa-lg fa-step-backward\"></i>\n		</button>\n		\n		<button bn-show=\"!playing\" bn-event=\"click: onPlay\" class=\"w3-btn w3-blue\" title=\"Play\">\n			<i class=\"fa fa-lg fa-play\"></i>\n		</button>\n		\n		<button bn-show=\"playing\" bn-event=\"click: onPause\" class=\"w3-btn w3-blue\" title=\"Pause\">\n			<i class=\"fa fa-lg fa-pause\"></i>\n		</button>\n		\n		<button bn-prop=\"{disabled: isLast}\" bn-event=\"click: onNext\" class=\"w3-btn w3-blue\" title=\"Next\">\n			<i class=\"fa fa-lg fa-step-forward\"></i>\n		</button>	\n\n</div>\n\n<div class=\"shuffle\">\n	<span>Shuffle</span>\n	<div \n		bn-control=\"brainjs.flipswitch\"\n		bn-event=\"flipswitchchange: onShuffleChange\"\n		>\n		\n	</div>			\n</div>\n\n\n<div class=\"slider\">\n	<span bn-text=\"getTimeInfo\"></span>\n	<div bn-control=\"brainjs.slider\" \n		bn-data=\"{max: duration}\"\n		bn-event=\"input: onSliderChange\" 		 \n		bn-val=\"curTime\">		\n	</div>\n	\n</div>\n\n<audio \n	bn-attr=\"{src}\" \n	bn-bind=\"audio\"\n	autoplay=\"\" \n	bn-event=\"canplay: onLoad, timeupdate: onTimeUpdate, playing: onPlaying, pause: onPaused, ended: onEnded\">		\n</audio>\n",

		deps: ['breizbot.files', 'breizbot.http', 'breizbot.pager'],

		props: {
			rootDir: '',
			files: [],
			firstIdx: 0,
			friendUser: '',
			fileCtrl: null
		},

		init: function (elt, filesSrv, http, pager) {

			const { rootDir, files, firstIdx, friendUser, fileCtrl } = this.props

			let shuffleIndexes = null

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
					onLoad: function () {
						//console.log('duration', this.duration)
						ctrl.setData({ duration: Math.floor(this.duration) })
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
				return files[idx].name
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
				return filesSrv.fileUrl(rootDir + files[idx].name, friendUser)
			}

			this.getButtons = function () {
				return {
					editInfo: {
						title: 'Edit Info',
						icon: 'fa fa-edit',
						onClick: function () {
							const { idx, name } = ctrl.model
							pager.pushPage('editDlg', {
								title: 'Edit MP3 Info',
								props: {
									data: files[idx].mp3,
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




//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImVkaXREbGcuanMiLCJmaWx0ZXIuanMiLCJtYWluLmpzIiwicGxheWVyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3RIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3RHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImFwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdlZGl0RGxnJywge1xuXG4gICAgdGVtcGxhdGU6IFwiPGZvcm0gYm4tZXZlbnQ9XFxcInN1Ym1pdDogb25TdWJtaXRcXFwiPlxcbiAgICA8bGFiZWw+VGl0bGU8L2xhYmVsPlxcbiAgICA8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgYm4tdmFsPVxcXCJ0aXRsZVxcXCIgYm4tdXBkYXRlPVxcXCJpbnB1dFxcXCIgcmVxdWlyZWQ+XFxuICAgIDxsYWJlbD5BcnRpc3Q8L2xhYmVsPlxcbiAgICA8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgYm4tdmFsPVxcXCJhcnRpc3RcXFwiIGJuLXVwZGF0ZT1cXFwiaW5wdXRcXFwiIHJlcXVpcmVkPlxcblxcblxcbiAgICA8aW5wdXQgdHlwZT1cXFwic3VibWl0XFxcIiBoaWRkZW4gYm4tYmluZD1cXFwic3VibWl0XFxcIj5cXG48L2Zvcm0+XFxuXFxuPGRpdiBjbGFzcz1cXFwidG9vbGJhclxcXCI+XFxuICAgIDxidXR0b24gdHlwZT1cXFwiYnV0dG9uXFxcIiB0aXRsZT1cXFwiRmluZCBJbmZvXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uRmluZEluZm9cXFwiIGNsYXNzPVxcXCJ3My1idG4gdzMtYmx1ZSB3My1jaXJjbGVcXFwiPlxcbiAgICAgICAgPGkgY2xhc3M9XFxcImZhIGZhLXNlYXJjaFxcXCI+PC9pPlxcbiAgICA8L2J1dHRvbj5cXG4gICAgXFxuPC9kaXY+XFxuXCIsXG5cbiAgICBkZXBzOiBbJ2JyZWl6Ym90Lmh0dHAnLCAnYnJlaXpib3QucGFnZXInXSxcblxuICAgIHByb3BzOiB7XG4gICAgICAgIGRhdGE6IHt9LFxuICAgICAgICBmaWxlTmFtZTogJydcbiAgICB9LFxuXG4gICAgaW5pdDogZnVuY3Rpb24oZWx0LCBodHRwLCBwYWdlcikge1xuXG4gICAgICAgIGNvbnN0IHtkYXRhLCBmaWxlTmFtZX0gPSB0aGlzLnByb3BzXG5cbiAgICAgICAgY29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgdGl0bGU6IGRhdGEudGl0bGUsXG4gICAgICAgICAgICAgICBhcnRpc3Q6IGRhdGEuYXJ0aXN0IFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGV2ZW50czoge1xuICAgICAgICAgICAgICAgIG9uRmluZEluZm86IGFzeW5jIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGNvbnN0IGRhdGEgPSBhd2FpdCBodHRwLnBvc3QoJy9zZWFyY2gnLCB7XG5cdFx0XHRcdFx0XHRxdWVyeTogZmlsZU5hbWUucmVwbGFjZSgnLm1wMycsICcnKSxcblx0XHRcdFx0XHR9KVxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKVxuICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YSAmJiBkYXRhLnRpdGxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdHJsLnNldERhdGEoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlOiBkYXRhLnRpdGxlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFydGlzdDogZGF0YS5hcnRpc3QgXG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgJCQudWkuc2hvd0FsZXJ0KHt0aXRsZTogJ01QMyBJbmZvcm1hdGlvbicsIGNvbnRlbnQ6ICdObyBpbmZvcm1hdGlvbiBmb3VuZCAhJ30pXG4gICAgICAgICAgICAgICAgICAgIH0gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb25TdWJtaXQ6IGZ1bmN0aW9uKGV2KSB7XG4gICAgICAgICAgICAgICAgICAgIGV2LnByZXZlbnREZWZhdWx0KClcblxuICAgICAgICAgICAgICAgICAgICBjb25zdCB7dGl0bGUsIGFydGlzdH0gPSBjdHJsLm1vZGVsXG4gICAgICAgICAgICAgICAgICAgIHBhZ2VyLnBvcFBhZ2Uoe3RpdGxlLCBhcnRpc3R9KVxuXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuXG4gICAgICAgIHRoaXMuZ2V0QnV0dG9ucyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBvazoge1xuICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ0FwcGx5JyxcbiAgICAgICAgICAgICAgICAgICAgaWNvbjogJ2ZhIGZhLWNoZWNrJyxcbiAgICAgICAgICAgICAgICAgICAgb25DbGljazogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdHJsLnNjb3BlLnN1Ym1pdC5jbGljaygpXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59KSIsIlxuJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2ZpbHRlckRsZycsIHtcblxuICAgIHRlbXBsYXRlOiBcIjxmb3JtIGJuLWV2ZW50PVxcXCJzdWJtaXQ6IG9uU3VibWl0XFxcIj5cXG5cXG4gICAgPGxhYmVsPkdlbnJlPC9sYWJlbD5cXG4gICAgPGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbWJvYm94XFxcIiBibi1kYXRhPVxcXCJ7aXRlbXM6IGdlbnJlc31cXFwiIGJuLXZhbD1cXFwic2VsZWN0ZWRHZW5yZVxcXCIgYm4tZXZlbnQ9XFxcImNvbWJvYm94Y2hhbmdlOiBvbkdlbnJlQ2hhbmdlXFxcIiBuYW1lPVxcXCJnZW5yZVxcXCI+PC9kaXY+ICAgIFxcblxcbiAgICA8bGFiZWw+QXJ0aXN0PC9sYWJlbD5cXG4gICAgPGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbWJvYm94XFxcIiBibi1kYXRhPVxcXCJ7aXRlbXM6IGFydGlzdHN9XFxcIiBibi12YWw9XFxcInNlbGVjdGVkQXJ0aXN0XFxcIiBibi11cGRhdGU9XFxcImNvbWJvYm94Y2hhbmdlXFxcIiBuYW1lPVxcXCJhcnRpc3RcXFwiPjwvZGl2PiAgICBcXG5cXG5cXG4gICAgPGlucHV0IHR5cGU9XFxcInN1Ym1pdFxcXCIgaGlkZGVuIGJuLWJpbmQ9XFxcInN1Ym1pdFxcXCI+XFxuPC9mb3JtPlxcblwiLFxuXG4gICAgZGVwczogWydicmVpemJvdC5wYWdlciddLFxuXG4gICAgcHJvcHM6IHtcbiAgICAgICAgZmlsZXM6IFtdLFxuICAgICAgICBtcDNGaWx0ZXJzOiBudWxsXG4gICAgfSxcblxuICAgIGluaXQ6IGZ1bmN0aW9uIChlbHQsIHBhZ2VyKSB7XG5cbiAgICAgICAgbGV0IHsgZmlsZXMsIG1wM0ZpbHRlcnMgfSA9IHRoaXMucHJvcHNcblxuICAgICAgICBtcDNGaWx0ZXJzID0gbXAzRmlsdGVycyB8fCB7fVxuXG5cbiAgICAgICAgY29uc3Qgc2VsZWN0ZWRHZW5yZSA9IG1wM0ZpbHRlcnMuZ2VucmUgfHwgJ0FsbCdcbiAgICAgICAgY29uc3Qgc2VsZWN0ZWRBcnRpc3QgPSBtcDNGaWx0ZXJzLmFydGlzdCB8fCAnQWxsJ1xuXG4gICAgICAgIGNvbnNvbGUubG9nKCdzZWxlY3RlZEFydGlzdCcsIHNlbGVjdGVkQXJ0aXN0KVxuICAgICAgICBjb25zb2xlLmxvZygnc2VsZWN0ZWRHZW5yZScsIHNlbGVjdGVkR2VucmUpXG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0R2VucmVzKCkge1xuICAgICAgICAgICAgbGV0IGdlbnJlcyA9IHt9XG5cbiAgICAgICAgICAgIGZpbGVzLmZvckVhY2goKGYpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZi5tcDMpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBnZW5yZSB9ID0gZi5tcDNcbiAgICAgICAgICAgICAgICAgICAgaWYgKGdlbnJlICYmICFnZW5yZS5zdGFydHNXaXRoKCcoJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChnZW5yZXNbZ2VucmVdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2VucmVzW2dlbnJlXSsrXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnZW5yZXNbZ2VucmVdID0gMVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgZ2VucmVzID0gT2JqZWN0LmtleXMoZ2VucmVzKS5zb3J0KCkubWFwKChnZW5yZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5iVGl0bGUgPSBnZW5yZXNbZ2VucmVdXG4gICAgICAgICAgICAgICAgcmV0dXJuIChuYlRpdGxlID09IDEpID9cbiAgICAgICAgICAgICAgICAgICAgeyB2YWx1ZTogZ2VucmUsIGxhYmVsOiBnZW5yZSB9IDpcbiAgICAgICAgICAgICAgICAgICAgeyB2YWx1ZTogZ2VucmUsIGxhYmVsOiBgJHtnZW5yZX0gKCR7bmJUaXRsZX0pYCB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgZ2VucmVzLnVuc2hpZnQoeyB2YWx1ZTogJ0FsbCcsIGxhYmVsOiAnQWxsJywgc3R5bGU6ICdmb250LXdlaWdodDogYm9sZDsnIH0pXG5cbiAgICAgICAgICAgIHJldHVybiBnZW5yZXNcbiAgICAgICAgfVxuXG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0QXJ0aXN0cyhnZW5yZSkge1xuICAgICAgICAgICAgbGV0IGFydGlzdHMgPSB7fVxuXG4gICAgICAgICAgICBmaWxlcy5mb3JFYWNoKChmKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGYubXAzICYmIChnZW5yZSA9PSAnQWxsJyB8fCBmLm1wMy5nZW5yZSA9PSBnZW5yZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBhcnRpc3QgfSA9IGYubXAzXG4gICAgICAgICAgICAgICAgICAgIGlmIChhcnRpc3QpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcnRpc3RzW2FydGlzdF0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcnRpc3RzW2FydGlzdF0rK1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXJ0aXN0c1thcnRpc3RdID0gMVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIGFydGlzdHMgPSBPYmplY3Qua2V5cyhhcnRpc3RzKS5zb3J0KCkubWFwKChhcnRpc3QpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBuYlRpdGxlID0gYXJ0aXN0c1thcnRpc3RdXG4gICAgICAgICAgICAgICAgcmV0dXJuIChuYlRpdGxlID09IDEpID9cbiAgICAgICAgICAgICAgICAgICAgeyB2YWx1ZTogYXJ0aXN0LCBsYWJlbDogYXJ0aXN0IH0gOlxuICAgICAgICAgICAgICAgICAgICB7IHZhbHVlOiBhcnRpc3QsIGxhYmVsOiBgJHthcnRpc3R9ICgke25iVGl0bGV9KWAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIGFydGlzdHMudW5zaGlmdCh7IHZhbHVlOiAnQWxsJywgbGFiZWw6ICdBbGwnLCBzdHlsZTogJ2ZvbnQtd2VpZ2h0OiBib2xkOycgfSlcbiAgICAgICAgICAgIHJldHVybiBhcnRpc3RzXG4gICAgICAgIH1cblxuXG5cblxuXG4gICAgICAgIGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICBhcnRpc3RzOiBnZXRBcnRpc3RzKHNlbGVjdGVkR2VucmUpLFxuICAgICAgICAgICAgICAgIGdlbnJlczogZ2V0R2VucmVzKCksXG4gICAgICAgICAgICAgICAgc2VsZWN0ZWRBcnRpc3QsXG4gICAgICAgICAgICAgICAgc2VsZWN0ZWRHZW5yZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGV2ZW50czoge1xuICAgICAgICAgICAgICAgIG9uR2VucmVDaGFuZ2U6IGZ1bmN0aW9uKGV2KSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGdlbnJlID0gJCh0aGlzKS5nZXRWYWx1ZSgpXG4gICAgICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ29uR2VucmVDaGFuZ2UnLCBnZW5yZSlcbiAgICAgICAgICAgICAgICAgICAgY3RybC5zZXREYXRhKHthcnRpc3RzOiBnZXRBcnRpc3RzKGdlbnJlKX0pXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvblN1Ym1pdDogZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICAgICAgICAgIGV2LnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgICAgICAgICAgICAgcGFnZXIucG9wUGFnZSgkKHRoaXMpLmdldEZvcm1EYXRhKCkpXG5cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG5cbiAgICAgICAgdGhpcy5nZXRCdXR0b25zID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBhcHBseToge1xuICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ0FwcGx5JyxcbiAgICAgICAgICAgICAgICAgICAgaWNvbjogJ2ZhIGZhLWNoZWNrJyxcbiAgICAgICAgICAgICAgICAgICAgb25DbGljazogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY3RybC5zY29wZS5zdWJtaXQuY2xpY2soKVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICB9XG59KSIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdyb290UGFnZScsIHtcblxuXHR0ZW1wbGF0ZTogXCI8cD5TZWxlY3QgYSBmaWxlIHN5c3RlbTwvcD5cXG5cXG48dWwgY2xhc3M9XFxcInczLXVsIHczLWJvcmRlciB3My13aGl0ZVxcXCI+XFxuXHQ8bGkgY2xhc3M9XFxcInczLWJhclxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvbkhvbWVcXFwiPlxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJ3My1iYXItaXRlbVxcXCI+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLWhvbWUgZmEtMnggZmEtZncgdzMtdGV4dC1ibHVlXFxcIj48L2k+XFxuXHRcdFx0PHNwYW4+WW91ciBob21lIGZpbGVzPC9zcGFuPlxcblx0XHQ8L2Rpdj5cXG5cdDwvbGk+XFxuXFxuXHQ8bGkgY2xhc3M9XFxcInczLWJhclxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvblNoYXJlXFxcIj5cXG5cdFx0PGRpdiBjbGFzcz1cXFwidzMtYmFyLWl0ZW1cXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1zaGFyZS1hbHQgZmEtMnggZmEtZncgdzMtdGV4dC1ibHVlXFxcIj48L2k+XFxuXHRcdFx0PHNwYW4+RmlsZXMgc2hhcmVkIGJ5IHlvdXIgZnJpZW5kczwvc3Bhbj5cXG5cdFx0PC9kaXY+XFxuXHQ8L2xpPlxcbjwvdWw+XHRcIixcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LnBhZ2VyJ10sXG5cblx0aW5pdDogZnVuY3Rpb24gKGVsdCwgcGFnZXIpIHtcblxuXHRcdGZ1bmN0aW9uIG9wZW5GaWx0ZXJQYWdlKGlmYWNlKSB7XG5cdFx0XHRjb25zdCBtcDNGaWx0ZXJzID0gaWZhY2UuZ2V0TVAzRmlsdGVycygpXG5cdFx0XHRjb25zdCBmaWxlcyA9IGlmYWNlLmdldEZpbGVzKClcblxuXHRcdFx0cGFnZXIucHVzaFBhZ2UoJ2ZpbHRlckRsZycsIHtcblx0XHRcdFx0dGl0bGU6ICdGaWx0ZXInLFxuXHRcdFx0XHRwcm9wczoge1xuXHRcdFx0XHRcdGZpbGVzLFxuXHRcdFx0XHRcdG1wM0ZpbHRlcnNcblx0XHRcdFx0fSxcblx0XHRcdFx0b25SZXR1cm46IGZ1bmN0aW9uIChmaWx0ZXJzKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnZmlsdGVycycsIGZpbHRlcnMpXG5cdFx0XHRcdFx0aWZhY2Uuc2V0TVAzRmlsdGVycyhmaWx0ZXJzKVxuXHRcdFx0XHR9XG5cdFx0XHR9KVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIG9wZW5GaWxlUGFnZSh0aXRsZSwgZnJpZW5kVXNlcikge1xuXHRcdFx0cGFnZXIucHVzaFBhZ2UoJ2JyZWl6Ym90LmZpbGVzJywge1xuXHRcdFx0XHR0aXRsZSxcblx0XHRcdFx0cHJvcHM6IHtcblx0XHRcdFx0XHRmaWx0ZXJFeHRlbnNpb246ICcubXAzJyxcblx0XHRcdFx0XHRnZXRNUDNJbmZvOiB0cnVlLFxuXHRcdFx0XHRcdGZyaWVuZFVzZXJcblx0XHRcdFx0fSxcblx0XHRcdFx0YnV0dG9uczoge1xuXHRcdFx0XHRcdHNlYXJjaDoge1xuXHRcdFx0XHRcdFx0dGl0bGU6ICdGaWx0ZXInLFxuXHRcdFx0XHRcdFx0aWNvbjogJ2ZhIGZhLXNlYXJjaCcsXG5cdFx0XHRcdFx0XHRvbkNsaWNrOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRcdG9wZW5GaWx0ZXJQYWdlKHRoaXMpXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRldmVudHM6IHtcblx0XHRcdFx0XHRmaWxlY2xpY2s6IGZ1bmN0aW9uIChldiwgaW5mbykge1xuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ2luZm8nLCBpbmZvKVxuXHRcdFx0XHRcdFx0Y29uc3QgeyByb290RGlyLCBmaWxlTmFtZSB9ID0gaW5mb1xuXHRcdFx0XHRcdFx0Y29uc3QgaWZhY2UgPSAkKHRoaXMpLmlmYWNlKClcblx0XHRcdFx0XHRcdGNvbnN0IGZpbGVzID0gaWZhY2UuZ2V0RmlsdGVyZWRGaWxlcygpXG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZygnZmlsZXMnLCBmaWxlcylcblx0XHRcdFx0XHRcdGNvbnN0IGZpcnN0SWR4ID0gZmlsZXMuZmluZEluZGV4KChmKSA9PiBmLm5hbWUgPT0gZmlsZU5hbWUpXG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZygnZmlyc3RJZHgnLCBmaXJzdElkeClcblx0XHRcdFx0XHRcdHBhZ2VyLnB1c2hQYWdlKCdwbGF5ZXInLCB7XG5cdFx0XHRcdFx0XHRcdHRpdGxlOiAnUGxheWVyJyxcblx0XHRcdFx0XHRcdFx0cHJvcHM6IHtcblx0XHRcdFx0XHRcdFx0XHRmaXJzdElkeCxcblx0XHRcdFx0XHRcdFx0XHRmaWxlcyxcblx0XHRcdFx0XHRcdFx0XHRyb290RGlyLFxuXHRcdFx0XHRcdFx0XHRcdGZyaWVuZFVzZXIsXG5cdFx0XHRcdFx0XHRcdFx0ZmlsZUN0cmw6IGlmYWNlXG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0pXG5cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0pXG5cblx0XHR9XG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uSG9tZTogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdG9wZW5GaWxlUGFnZSgnSG9tZSBmaWxlcycsICcnKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvblNoYXJlOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cGFnZXIucHVzaFBhZ2UoJ2JyZWl6Ym90LmZyaWVuZHMnLCB7XG5cdFx0XHRcdFx0XHR0aXRsZTogJ1NoYXJlZCBmaWxlcycsXG5cdFx0XHRcdFx0XHRwcm9wczoge1xuXHRcdFx0XHRcdFx0XHRzaG93Q29ubmVjdGlvblN0YXRlOiBmYWxzZVxuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRcdFx0XHRmcmllbmRjbGljazogZnVuY3Rpb24gKGV2LCBkYXRhKSB7XG5cdFx0XHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25TZWxlY3RGcmllbmQnLCBkYXRhKVxuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IHsgdXNlck5hbWUgfSA9IGRhdGFcblx0XHRcdFx0XHRcdFx0XHRvcGVuRmlsZVBhZ2UodXNlck5hbWUsIHVzZXJOYW1lKVxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fVxuXG5cdFx0XHR9XG5cdFx0fSlcblxuXHR9XG5cblxufSk7XG5cblxuXG5cbiIsIihmdW5jdGlvbiAoKSB7XG5cblx0ZnVuY3Rpb24gZ2V0VGltZShkdXJhdGlvbikge1xuXHRcdGNvbnN0IGQgPSBuZXcgRGF0ZShkdXJhdGlvbiAqIDEwMDApXG5cdFx0Y29uc3QgdiA9IGQuZ2V0TWludXRlcygpICsgZC5nZXRTZWNvbmRzKCkgLyAxMDBcblx0XHRyZXR1cm4gdi50b0ZpeGVkKDIpLnJlcGxhY2UoJy4nLCAnOicpXG5cdH1cblxuXG5cdCQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdwbGF5ZXInLCB7XG5cblx0XHR0ZW1wbGF0ZTogXCI8ZGl2IGNsYXNzPVxcXCJ0aXRsZVxcXCIgYm4tc2hvdz1cXFwiIXRpdGxlXFxcIj5cXG5cdDxzdHJvbmc+RmlsZU5hbWU6Jm5ic3A7PC9zdHJvbmc+XFxuXHQ8c3BhbiBibi10ZXh0PVxcXCJuYW1lXFxcIj48L3NwYW4+XFxuPC9kaXY+XFxuPGRpdiBjbGFzcz1cXFwidGl0bGVcXFwiIGJuLXNob3c9XFxcInRpdGxlXFxcIj5cXG5cdDxzdHJvbmc+VGl0bGU6Jm5ic3A7PC9zdHJvbmc+XFxuXHQ8c3BhbiBibi10ZXh0PVxcXCJ0aXRsZVxcXCI+PC9zcGFuPlxcbjwvZGl2PlxcbjxkaXYgY2xhc3M9XFxcInRpdGxlXFxcIiBibi1zaG93PVxcXCJhcnRpc3RcXFwiPlxcblx0PHN0cm9uZz5BcnRpc3Q6Jm5ic3A7PC9zdHJvbmc+XFxuXHQ8c3BhbiBibi10ZXh0PVxcXCJhcnRpc3RcXFwiPjwvc3Bhbj5cXG48L2Rpdj5cXG48ZGl2IGNsYXNzPVxcXCJ0aXRsZVxcXCIgYm4tc2hvdz1cXFwiZ2VucmVcXFwiPlxcblx0PHN0cm9uZz5HZW5yZTombmJzcDs8L3N0cm9uZz5cXG5cdDxzcGFuIGJuLXRleHQ9XFxcImdlbnJlXFxcIj48L3NwYW4+XFxuPC9kaXY+XFxuPGRpdiBjbGFzcz1cXFwidGl0bGVcXFwiIGJuLXNob3c9XFxcInllYXJcXFwiPlxcblx0PHN0cm9uZz5ZZWFyOiZuYnNwOzwvc3Ryb25nPlxcblx0PHNwYW4gYm4tdGV4dD1cXFwieWVhclxcXCI+PC9zcGFuPlxcbjwvZGl2PlxcbjxkaXYgY2xhc3M9XFxcInRvb2xiYXJcXFwiPlxcblx0XHQ8YnV0dG9uIGJuLXByb3A9XFxcIntkaXNhYmxlZDogaXNGaXJzdH1cXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25QcmV2XFxcIiBjbGFzcz1cXFwidzMtYnRuIHczLWJsdWVcXFwiIHRpdGxlPVxcXCJQcmV2aW91c1xcXCI+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLWxnIGZhLXN0ZXAtYmFja3dhcmRcXFwiPjwvaT5cXG5cdFx0PC9idXR0b24+XFxuXHRcdFxcblx0XHQ8YnV0dG9uIGJuLXNob3c9XFxcIiFwbGF5aW5nXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uUGxheVxcXCIgY2xhc3M9XFxcInczLWJ0biB3My1ibHVlXFxcIiB0aXRsZT1cXFwiUGxheVxcXCI+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLWxnIGZhLXBsYXlcXFwiPjwvaT5cXG5cdFx0PC9idXR0b24+XFxuXHRcdFxcblx0XHQ8YnV0dG9uIGJuLXNob3c9XFxcInBsYXlpbmdcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25QYXVzZVxcXCIgY2xhc3M9XFxcInczLWJ0biB3My1ibHVlXFxcIiB0aXRsZT1cXFwiUGF1c2VcXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1sZyBmYS1wYXVzZVxcXCI+PC9pPlxcblx0XHQ8L2J1dHRvbj5cXG5cdFx0XFxuXHRcdDxidXR0b24gYm4tcHJvcD1cXFwie2Rpc2FibGVkOiBpc0xhc3R9XFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uTmV4dFxcXCIgY2xhc3M9XFxcInczLWJ0biB3My1ibHVlXFxcIiB0aXRsZT1cXFwiTmV4dFxcXCI+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLWxnIGZhLXN0ZXAtZm9yd2FyZFxcXCI+PC9pPlxcblx0XHQ8L2J1dHRvbj5cdFxcblxcbjwvZGl2PlxcblxcbjxkaXYgY2xhc3M9XFxcInNodWZmbGVcXFwiPlxcblx0PHNwYW4+U2h1ZmZsZTwvc3Bhbj5cXG5cdDxkaXYgXFxuXHRcdGJuLWNvbnRyb2w9XFxcImJyYWluanMuZmxpcHN3aXRjaFxcXCJcXG5cdFx0Ym4tZXZlbnQ9XFxcImZsaXBzd2l0Y2hjaGFuZ2U6IG9uU2h1ZmZsZUNoYW5nZVxcXCJcXG5cdFx0Plxcblx0XHRcXG5cdDwvZGl2Plx0XHRcdFxcbjwvZGl2PlxcblxcblxcbjxkaXYgY2xhc3M9XFxcInNsaWRlclxcXCI+XFxuXHQ8c3BhbiBibi10ZXh0PVxcXCJnZXRUaW1lSW5mb1xcXCI+PC9zcGFuPlxcblx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLnNsaWRlclxcXCIgXFxuXHRcdGJuLWRhdGE9XFxcInttYXg6IGR1cmF0aW9ufVxcXCJcXG5cdFx0Ym4tZXZlbnQ9XFxcImlucHV0OiBvblNsaWRlckNoYW5nZVxcXCIgXHRcdCBcXG5cdFx0Ym4tdmFsPVxcXCJjdXJUaW1lXFxcIj5cdFx0XFxuXHQ8L2Rpdj5cXG5cdFxcbjwvZGl2PlxcblxcbjxhdWRpbyBcXG5cdGJuLWF0dHI9XFxcIntzcmN9XFxcIiBcXG5cdGJuLWJpbmQ9XFxcImF1ZGlvXFxcIlxcblx0YXV0b3BsYXk9XFxcIlxcXCIgXFxuXHRibi1ldmVudD1cXFwiY2FucGxheTogb25Mb2FkLCB0aW1ldXBkYXRlOiBvblRpbWVVcGRhdGUsIHBsYXlpbmc6IG9uUGxheWluZywgcGF1c2U6IG9uUGF1c2VkLCBlbmRlZDogb25FbmRlZFxcXCI+XHRcdFxcbjwvYXVkaW8+XFxuXCIsXG5cblx0XHRkZXBzOiBbJ2JyZWl6Ym90LmZpbGVzJywgJ2JyZWl6Ym90Lmh0dHAnLCAnYnJlaXpib3QucGFnZXInXSxcblxuXHRcdHByb3BzOiB7XG5cdFx0XHRyb290RGlyOiAnJyxcblx0XHRcdGZpbGVzOiBbXSxcblx0XHRcdGZpcnN0SWR4OiAwLFxuXHRcdFx0ZnJpZW5kVXNlcjogJycsXG5cdFx0XHRmaWxlQ3RybDogbnVsbFxuXHRcdH0sXG5cblx0XHRpbml0OiBmdW5jdGlvbiAoZWx0LCBmaWxlc1NydiwgaHR0cCwgcGFnZXIpIHtcblxuXHRcdFx0Y29uc3QgeyByb290RGlyLCBmaWxlcywgZmlyc3RJZHgsIGZyaWVuZFVzZXIsIGZpbGVDdHJsIH0gPSB0aGlzLnByb3BzXG5cblx0XHRcdGxldCBzaHVmZmxlSW5kZXhlcyA9IG51bGxcblxuXHRcdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0XHRkYXRhOiB7XG5cdFx0XHRcdFx0aWR4OiBmaXJzdElkeCxcblx0XHRcdFx0XHRuYkZpbGVzOiBmaWxlcy5sZW5ndGgsXG5cdFx0XHRcdFx0c3JjOiBnZXRGaWxlVXJsKGZpcnN0SWR4KSxcblx0XHRcdFx0XHRuYW1lOiBnZXROYW1lKGZpcnN0SWR4KSxcblx0XHRcdFx0XHR0aXRsZTogZ2V0VGl0bGUoZmlyc3RJZHgpLFxuXHRcdFx0XHRcdGFydGlzdDogZ2V0QXJ0aXN0KGZpcnN0SWR4KSxcblx0XHRcdFx0XHRnZW5yZTogZ2V0R2VucmUoZmlyc3RJZHgpLFxuXHRcdFx0XHRcdHllYXI6IGdldFllYXIoZmlyc3RJZHgpLFxuXHRcdFx0XHRcdGR1cmF0aW9uOiAwLFxuXHRcdFx0XHRcdGN1clRpbWU6IDAsXG5cdFx0XHRcdFx0cGxheWluZzogZmFsc2UsXG5cdFx0XHRcdFx0aXNGaXJzdDogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0cmV0dXJuICh0aGlzLmlkeCA9PSAwKVxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0aXNMYXN0OiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gKHRoaXMuaWR4ID09IHRoaXMubmJGaWxlcyAtIDEpXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRnZXRUaW1lSW5mbzogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIGAke2dldFRpbWUodGhpcy5jdXJUaW1lKX0gLyAke2dldFRpbWUodGhpcy5kdXJhdGlvbil9YFxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHR9LFxuXHRcdFx0XHRldmVudHM6IHtcblx0XHRcdFx0XHRvbkxvYWQ6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ2R1cmF0aW9uJywgdGhpcy5kdXJhdGlvbilcblx0XHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7IGR1cmF0aW9uOiBNYXRoLmZsb29yKHRoaXMuZHVyYXRpb24pIH0pXG5cdFx0XHRcdFx0fSxcblxuXHRcdFx0XHRcdG9uVGltZVVwZGF0ZTogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0Y3RybC5zZXREYXRhKHsgY3VyVGltZTogdGhpcy5jdXJyZW50VGltZSB9KVxuXHRcdFx0XHRcdH0sXG5cblx0XHRcdFx0XHRvblBsYXlpbmc6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uUGxheWluZycpXG5cdFx0XHRcdFx0XHRjdHJsLnNldERhdGEoeyBwbGF5aW5nOiB0cnVlIH0pXG5cdFx0XHRcdFx0fSxcblxuXHRcdFx0XHRcdG9uUGF1c2VkOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblBhdXNlZCcpXG5cdFx0XHRcdFx0XHRjdHJsLnNldERhdGEoeyBwbGF5aW5nOiBmYWxzZSB9KVxuXHRcdFx0XHRcdH0sXG5cblx0XHRcdFx0XHRvblBsYXk6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdGF1ZGlvLnBsYXkoKVxuXHRcdFx0XHRcdH0sXG5cblx0XHRcdFx0XHRvblBhdXNlOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRhdWRpby5wYXVzZSgpXG5cdFx0XHRcdFx0fSxcblxuXHRcdFx0XHRcdG9uU2xpZGVyQ2hhbmdlOiBmdW5jdGlvbiAoZXYsIHZhbHVlKSB7XG5cdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblNsaWRlckNoYW5nZScsIHZhbHVlKVxuXHRcdFx0XHRcdFx0YXVkaW8uY3VycmVudFRpbWUgPSB2YWx1ZVxuXHRcdFx0XHRcdH0sXG5cblx0XHRcdFx0XHRvblNodWZmbGVDaGFuZ2U6IGZ1bmN0aW9uIChldiwgaXNBY3RpdmF0ZWQpIHtcblx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uU2h1ZmZsZUNoYW5nZScsIHZhbHVlKVxuXHRcdFx0XHRcdFx0aWYgKGlzQWN0aXZhdGVkKSB7XG5cdFx0XHRcdFx0XHRcdHNodWZmbGVJbmRleGVzID0gJCQudXRpbC5rbnV0aFNodWZmbGUoY3RybC5tb2RlbC5uYkZpbGVzKVxuXHRcdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdzaHVmZmxlSW5kZXhlcycsIHNodWZmbGVJbmRleGVzKVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRcdHNodWZmbGVJbmRleGVzID0gbnVsbFxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0sXG5cblx0XHRcdFx0XHRvbkVuZGVkOiBuZXh0LFxuXG5cdFx0XHRcdFx0b25QcmV2OiBwcmV2LFxuXG5cdFx0XHRcdFx0b25OZXh0OiBuZXh0XG5cblx0XHRcdFx0fVxuXHRcdFx0fSlcblxuXHRcdFx0ZnVuY3Rpb24gcHJldigpIHtcblx0XHRcdFx0bGV0IHsgaWR4IH0gPSBjdHJsLm1vZGVsXG5cdFx0XHRcdGlmIChpZHggPiAwKSB7XG5cdFx0XHRcdFx0c2V0SW5kZXgoaWR4IC0gMSlcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRmdW5jdGlvbiBuZXh0KCkge1xuXHRcdFx0XHRpZiAoc2h1ZmZsZUluZGV4ZXMgIT0gbnVsbCkge1xuXHRcdFx0XHRcdGlmIChzaHVmZmxlSW5kZXhlcy5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdFx0XHRzZXRJbmRleChzaHVmZmxlSW5kZXhlcy5wb3AoKSlcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cmV0dXJuXG5cdFx0XHRcdH1cblxuXHRcdFx0XHRsZXQgeyBpZHgsIG5iRmlsZXMgfSA9IGN0cmwubW9kZWxcblx0XHRcdFx0aWYgKGlkeCA8IG5iRmlsZXMgLSAxKSB7XG5cdFx0XHRcdFx0c2V0SW5kZXgoaWR4ICsgMSlcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRmdW5jdGlvbiBzZXRJbmRleChpZHgpIHtcblx0XHRcdFx0Y3RybC5zZXREYXRhKHtcblx0XHRcdFx0XHRzcmM6IGdldEZpbGVVcmwoaWR4KSxcblx0XHRcdFx0XHR0aXRsZTogZ2V0VGl0bGUoaWR4KSxcblx0XHRcdFx0XHRuYW1lOiBnZXROYW1lKGlkeCksXG5cdFx0XHRcdFx0YXJ0aXN0OiBnZXRBcnRpc3QoaWR4KSxcblx0XHRcdFx0XHRnZW5yZTogZ2V0R2VucmUoaWR4KSxcblx0XHRcdFx0XHR5ZWFyOiBnZXRZZWFyKGlkeCksXG5cdFx0XHRcdFx0aWR4XG5cdFx0XHRcdH0pXG5cdFx0XHR9XG5cblx0XHRcdGNvbnN0IGF1ZGlvID0gY3RybC5zY29wZS5hdWRpby5nZXQoMClcblxuXHRcdFx0ZnVuY3Rpb24gZ2V0TmFtZShpZHgpIHtcblx0XHRcdFx0cmV0dXJuIGZpbGVzW2lkeF0ubmFtZVxuXHRcdFx0fVxuXG5cdFx0XHRmdW5jdGlvbiBnZXRUaXRsZShpZHgpIHtcblx0XHRcdFx0cmV0dXJuIGZpbGVzW2lkeF0ubXAzLnRpdGxlIHx8ICcnXG5cdFx0XHR9XG5cblx0XHRcdGZ1bmN0aW9uIGdldEFydGlzdChpZHgpIHtcblx0XHRcdFx0cmV0dXJuIGZpbGVzW2lkeF0ubXAzLmFydGlzdCB8fCAnJ1xuXHRcdFx0fVxuXG5cdFx0XHRmdW5jdGlvbiBnZXRHZW5yZShpZHgpIHtcblx0XHRcdFx0cmV0dXJuIGZpbGVzW2lkeF0ubXAzLmdlbnJlIHx8ICcnXG5cdFx0XHR9XG5cblx0XHRcdGZ1bmN0aW9uIGdldFllYXIoaWR4KSB7XG5cdFx0XHRcdHJldHVybiBmaWxlc1tpZHhdLm1wMy55ZWFyIHx8ICcnXG5cdFx0XHR9XG5cblx0XHRcdGZ1bmN0aW9uIGdldEZpbGVVcmwoaWR4KSB7XG5cdFx0XHRcdHJldHVybiBmaWxlc1Nydi5maWxlVXJsKHJvb3REaXIgKyBmaWxlc1tpZHhdLm5hbWUsIGZyaWVuZFVzZXIpXG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuZ2V0QnV0dG9ucyA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRlZGl0SW5mbzoge1xuXHRcdFx0XHRcdFx0dGl0bGU6ICdFZGl0IEluZm8nLFxuXHRcdFx0XHRcdFx0aWNvbjogJ2ZhIGZhLWVkaXQnLFxuXHRcdFx0XHRcdFx0b25DbGljazogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0XHRjb25zdCB7IGlkeCwgbmFtZSB9ID0gY3RybC5tb2RlbFxuXHRcdFx0XHRcdFx0XHRwYWdlci5wdXNoUGFnZSgnZWRpdERsZycsIHtcblx0XHRcdFx0XHRcdFx0XHR0aXRsZTogJ0VkaXQgTVAzIEluZm8nLFxuXHRcdFx0XHRcdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0XHRcdFx0XHRkYXRhOiBmaWxlc1tpZHhdLm1wMyxcblx0XHRcdFx0XHRcdFx0XHRcdGZpbGVOYW1lOiBuYW1lXG5cdFx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0XHRvblJldHVybjogYXN5bmMgZnVuY3Rpb24gKHRhZ3MpIHtcblx0XHRcdFx0XHRcdFx0XHRcdC8vY29uc29sZS5ncm91cCgnb25SZXR1cm4nLCB0YWdzKVxuXHRcdFx0XHRcdFx0XHRcdFx0ZmlsZXNbaWR4XS5tcDMgPSB0YWdzXG5cdFx0XHRcdFx0XHRcdFx0XHRjdHJsLnNldERhdGEodGFncylcblx0XHRcdFx0XHRcdFx0XHRcdGF3YWl0IGh0dHAucG9zdCgnL3NhdmVJbmZvJywge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRmaWxlUGF0aDogcm9vdERpciArIG5hbWUsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGZyaWVuZFVzZXIsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHRhZ3Ncblx0XHRcdFx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XHRcdFx0XHRhd2FpdCBmaWxlQ3RybC51cGRhdGVGaWxlKG5hbWUsIHsgZ2V0TVAzSW5mbzogdHJ1ZSB9KVxuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fSlcblxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0fVxuXG5cblx0fSk7XG5cbn0pKCk7XG5cblxuXG4iXX0=
