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

    template: "<form bn-event=\"submit: onSubmit\">\n    <label>Artist</label>\n    <div bn-control=\"brainjs.combobox\" bn-data=\"{items: artists}\" bn-val=\"selectedArtist\" bn-update=\"comboboxchange\"></div>    \n\n    <label>Genre</label>\n    <div bn-control=\"brainjs.combobox\" bn-data=\"{items: genres}\" bn-val=\"selectedGenre\" bn-update=\"comboboxchange\"></div>    \n\n\n\n    <input type=\"submit\" hidden bn-bind=\"submit\">\n</form>\n",

    deps: ['breizbot.pager'],

    props: {
        artists: [],
        genres: [],
        selectedArtist: null,
        selectedGenre: null
    },

    init: function(elt, pager) {

        const {artists, genres, selectedArtist, selectedGenre} = this.props

        const ctrl = $$.viewController(elt, {
            data: {
                artists,
                genres,
                selectedArtist,
                selectedGenre
            },
            events: {
                onSubmit: function(ev) {
                    ev.preventDefault()
                    pager.popPage(ctrl.model.selectedArtist)

                }
            }
        })

        this.getButtons = function() {
            return {
                apply: {
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
$$.control.registerControl('rootPage', {

	template: "<p>Select a file system</p>\n\n<ul class=\"w3-ul w3-border w3-white\">\n	<li class=\"w3-bar\" bn-event=\"click: onHome\">\n		<div class=\"w3-bar-item\">\n			<i class=\"fa fa-home fa-2x fa-fw w3-text-blue\"></i>\n			<span>Your home files</span>\n		</div>\n	</li>\n\n	<li class=\"w3-bar\" bn-event=\"click: onShare\">\n		<div class=\"w3-bar-item\">\n			<i class=\"fa fa-share-alt fa-2x fa-fw w3-text-blue\"></i>\n			<span>Files shared by your friends</span>\n		</div>\n	</li>\n</ul>	",

	deps: ['breizbot.pager'],

	init: function (elt, pager) {

		function openFilterPage(iface) {
			let artists = {}
			let genres = {}
			const mp3Filters = iface.getMP3Filters()
			iface.getFiles()
				.forEach((f) => {
					if (f.mp3) {
						const {artist, genre} = f.mp3
						if (artist) {
							if (artists[artist]) {
								artists[artist]++
							}
							else {
								artists[artist] = 1
							}
						}
						if (genre) {
							if (genres[genre]) {
								genres[genre]++
							}
							else {
								genres[genre] = 1
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

			genres = Object.keys(genres).sort().map((genre) => {
				const nbTitle = genres[genre]
				return (nbTitle == 1) ?
					{ value: genre, label: genre } :
					{ value: genre, label: `${genre} (${nbTitle})` }
			})
			genres.unshift({ value: 'All', label: 'All', style: 'font-weight: bold;' })

			pager.pushPage('filterDlg', {
				title: 'Filter',
				props: {
					artists,
					genres,
					selectedArtist: (mp3Filters && mp3Filters.artist) || 'All'
				},
				onReturn: function (artist) {
					console.log('artist', artist)
					if (artist == 'All') {
						artist = null
					}
					iface.setMP3Filters({ artist })
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

		template: "<div class=\"title\" bn-show=\"!title\">\n	<strong>FileName:&nbsp;</strong>\n	<span bn-text=\"name\"></span>\n</div>\n<div class=\"title\" bn-show=\"title\">\n	<strong>Title:&nbsp;</strong>\n	<span bn-text=\"title\"></span>\n</div>\n<div class=\"title\" bn-show=\"artist\">\n	<strong>Artist:&nbsp;</strong>\n	<span bn-text=\"artist\"></span>\n</div>\n<div class=\"toolbar\">\n		<button bn-prop=\"{disabled: isFirst}\" bn-event=\"click: onPrev\" class=\"w3-btn w3-blue\" title=\"Previous\">\n			<i class=\"fa fa-lg fa-step-backward\"></i>\n		</button>\n		\n		<button bn-show=\"!playing\" bn-event=\"click: onPlay\" class=\"w3-btn w3-blue\" title=\"Play\">\n			<i class=\"fa fa-lg fa-play\"></i>\n		</button>\n		\n		<button bn-show=\"playing\" bn-event=\"click: onPause\" class=\"w3-btn w3-blue\" title=\"Pause\">\n			<i class=\"fa fa-lg fa-pause\"></i>\n		</button>\n		\n		<button bn-prop=\"{disabled: isLast}\" bn-event=\"click: onNext\" class=\"w3-btn w3-blue\" title=\"Next\">\n			<i class=\"fa fa-lg fa-step-forward\"></i>\n		</button>	\n\n</div>\n\n<div class=\"shuffle\">\n	<span>Shuffle</span>\n	<div \n		bn-control=\"brainjs.flipswitch\"\n		bn-event=\"flipswitchchange: onShuffleChange\"\n		>\n		\n	</div>			\n</div>\n\n\n<div class=\"slider\">\n	<span bn-text=\"getTimeInfo\"></span>\n	<div bn-control=\"brainjs.slider\" \n		bn-data=\"{max: duration}\"\n		bn-event=\"input: onSliderChange\" 		 \n		bn-val=\"curTime\">		\n	</div>\n	\n</div>\n\n<audio \n	bn-attr=\"{src}\" \n	bn-bind=\"audio\"\n	autoplay=\"\" \n	bn-event=\"canplay: onLoad, timeupdate: onTimeUpdate, playing: onPlaying, pause: onPaused, ended: onEnded\">		\n</audio>\n",

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




//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImVkaXREbGcuanMiLCJmaWx0ZXIuanMiLCJtYWluLmpzIiwicGxheWVyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDaEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2VkaXREbGcnLCB7XG5cbiAgICB0ZW1wbGF0ZTogXCI8Zm9ybSBibi1ldmVudD1cXFwic3VibWl0OiBvblN1Ym1pdFxcXCI+XFxuICAgIDxsYWJlbD5UaXRsZTwvbGFiZWw+XFxuICAgIDxpbnB1dCB0eXBlPVxcXCJ0ZXh0XFxcIiBibi12YWw9XFxcInRpdGxlXFxcIiBibi11cGRhdGU9XFxcImlucHV0XFxcIiByZXF1aXJlZD5cXG4gICAgPGxhYmVsPkFydGlzdDwvbGFiZWw+XFxuICAgIDxpbnB1dCB0eXBlPVxcXCJ0ZXh0XFxcIiBibi12YWw9XFxcImFydGlzdFxcXCIgYm4tdXBkYXRlPVxcXCJpbnB1dFxcXCIgcmVxdWlyZWQ+XFxuXFxuXFxuICAgIDxpbnB1dCB0eXBlPVxcXCJzdWJtaXRcXFwiIGhpZGRlbiBibi1iaW5kPVxcXCJzdWJtaXRcXFwiPlxcbjwvZm9ybT5cXG5cXG48ZGl2IGNsYXNzPVxcXCJ0b29sYmFyXFxcIj5cXG4gICAgPGJ1dHRvbiB0eXBlPVxcXCJidXR0b25cXFwiIHRpdGxlPVxcXCJGaW5kIEluZm9cXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25GaW5kSW5mb1xcXCIgY2xhc3M9XFxcInczLWJ0biB3My1ibHVlIHczLWNpcmNsZVxcXCI+XFxuICAgICAgICA8aSBjbGFzcz1cXFwiZmEgZmEtc2VhcmNoXFxcIj48L2k+XFxuICAgIDwvYnV0dG9uPlxcbiAgICBcXG48L2Rpdj5cXG5cIixcblxuICAgIGRlcHM6IFsnYnJlaXpib3QuaHR0cCcsICdicmVpemJvdC5wYWdlciddLFxuXG4gICAgcHJvcHM6IHtcbiAgICAgICAgZGF0YToge30sXG4gICAgICAgIGZpbGVOYW1lOiAnJ1xuICAgIH0sXG5cbiAgICBpbml0OiBmdW5jdGlvbihlbHQsIGh0dHAsIHBhZ2VyKSB7XG5cbiAgICAgICAgY29uc3Qge2RhdGEsIGZpbGVOYW1lfSA9IHRoaXMucHJvcHNcblxuICAgICAgICBjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICB0aXRsZTogZGF0YS50aXRsZSxcbiAgICAgICAgICAgICAgIGFydGlzdDogZGF0YS5hcnRpc3QgXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZXZlbnRzOiB7XG4gICAgICAgICAgICAgICAgb25GaW5kSW5mbzogYXN5bmMgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Y29uc3QgZGF0YSA9IGF3YWl0IGh0dHAucG9zdCgnL3NlYXJjaCcsIHtcblx0XHRcdFx0XHRcdHF1ZXJ5OiBmaWxlTmFtZS5yZXBsYWNlKCcubXAzJywgJycpLFxuXHRcdFx0XHRcdH0pXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpXG4gICAgICAgICAgICAgICAgICAgIGlmIChkYXRhICYmIGRhdGEudGl0bGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN0cmwuc2V0RGF0YSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU6IGRhdGEudGl0bGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXJ0aXN0OiBkYXRhLmFydGlzdCBcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkJC51aS5zaG93QWxlcnQoe3RpdGxlOiAnTVAzIEluZm9ybWF0aW9uJywgY29udGVudDogJ05vIGluZm9ybWF0aW9uIGZvdW5kICEnfSlcbiAgICAgICAgICAgICAgICAgICAgfSAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvblN1Ym1pdDogZnVuY3Rpb24oZXYpIHtcbiAgICAgICAgICAgICAgICAgICAgZXYucHJldmVudERlZmF1bHQoKVxuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHt0aXRsZSwgYXJ0aXN0fSA9IGN0cmwubW9kZWxcbiAgICAgICAgICAgICAgICAgICAgcGFnZXIucG9wUGFnZSh7dGl0bGUsIGFydGlzdH0pXG5cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG5cbiAgICAgICAgdGhpcy5nZXRCdXR0b25zID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIG9rOiB7XG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnQXBwbHknLFxuICAgICAgICAgICAgICAgICAgICBpY29uOiAnZmEgZmEtY2hlY2snLFxuICAgICAgICAgICAgICAgICAgICBvbkNsaWNrOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN0cmwuc2NvcGUuc3VibWl0LmNsaWNrKClcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn0pIiwiXG4kJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnZmlsdGVyRGxnJywge1xuXG4gICAgdGVtcGxhdGU6IFwiPGZvcm0gYm4tZXZlbnQ9XFxcInN1Ym1pdDogb25TdWJtaXRcXFwiPlxcbiAgICA8bGFiZWw+QXJ0aXN0PC9sYWJlbD5cXG4gICAgPGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbWJvYm94XFxcIiBibi1kYXRhPVxcXCJ7aXRlbXM6IGFydGlzdHN9XFxcIiBibi12YWw9XFxcInNlbGVjdGVkQXJ0aXN0XFxcIiBibi11cGRhdGU9XFxcImNvbWJvYm94Y2hhbmdlXFxcIj48L2Rpdj4gICAgXFxuXFxuICAgIDxsYWJlbD5HZW5yZTwvbGFiZWw+XFxuICAgIDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb21ib2JveFxcXCIgYm4tZGF0YT1cXFwie2l0ZW1zOiBnZW5yZXN9XFxcIiBibi12YWw9XFxcInNlbGVjdGVkR2VucmVcXFwiIGJuLXVwZGF0ZT1cXFwiY29tYm9ib3hjaGFuZ2VcXFwiPjwvZGl2PiAgICBcXG5cXG5cXG5cXG4gICAgPGlucHV0IHR5cGU9XFxcInN1Ym1pdFxcXCIgaGlkZGVuIGJuLWJpbmQ9XFxcInN1Ym1pdFxcXCI+XFxuPC9mb3JtPlxcblwiLFxuXG4gICAgZGVwczogWydicmVpemJvdC5wYWdlciddLFxuXG4gICAgcHJvcHM6IHtcbiAgICAgICAgYXJ0aXN0czogW10sXG4gICAgICAgIGdlbnJlczogW10sXG4gICAgICAgIHNlbGVjdGVkQXJ0aXN0OiBudWxsLFxuICAgICAgICBzZWxlY3RlZEdlbnJlOiBudWxsXG4gICAgfSxcblxuICAgIGluaXQ6IGZ1bmN0aW9uKGVsdCwgcGFnZXIpIHtcblxuICAgICAgICBjb25zdCB7YXJ0aXN0cywgZ2VucmVzLCBzZWxlY3RlZEFydGlzdCwgc2VsZWN0ZWRHZW5yZX0gPSB0aGlzLnByb3BzXG5cbiAgICAgICAgY29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgIGFydGlzdHMsXG4gICAgICAgICAgICAgICAgZ2VucmVzLFxuICAgICAgICAgICAgICAgIHNlbGVjdGVkQXJ0aXN0LFxuICAgICAgICAgICAgICAgIHNlbGVjdGVkR2VucmVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBldmVudHM6IHtcbiAgICAgICAgICAgICAgICBvblN1Ym1pdDogZnVuY3Rpb24oZXYpIHtcbiAgICAgICAgICAgICAgICAgICAgZXYucHJldmVudERlZmF1bHQoKVxuICAgICAgICAgICAgICAgICAgICBwYWdlci5wb3BQYWdlKGN0cmwubW9kZWwuc2VsZWN0ZWRBcnRpc3QpXG5cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG5cbiAgICAgICAgdGhpcy5nZXRCdXR0b25zID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGFwcGx5OiB7XG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnQXBwbHknLFxuICAgICAgICAgICAgICAgICAgICBpY29uOiAnZmEgZmEtY2hlY2snLFxuICAgICAgICAgICAgICAgICAgICBvbkNsaWNrOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN0cmwuc2NvcGUuc3VibWl0LmNsaWNrKClcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgfVxufSkiLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgncm9vdFBhZ2UnLCB7XG5cblx0dGVtcGxhdGU6IFwiPHA+U2VsZWN0IGEgZmlsZSBzeXN0ZW08L3A+XFxuXFxuPHVsIGNsYXNzPVxcXCJ3My11bCB3My1ib3JkZXIgdzMtd2hpdGVcXFwiPlxcblx0PGxpIGNsYXNzPVxcXCJ3My1iYXJcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25Ib21lXFxcIj5cXG5cdFx0PGRpdiBjbGFzcz1cXFwidzMtYmFyLWl0ZW1cXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1ob21lIGZhLTJ4IGZhLWZ3IHczLXRleHQtYmx1ZVxcXCI+PC9pPlxcblx0XHRcdDxzcGFuPllvdXIgaG9tZSBmaWxlczwvc3Bhbj5cXG5cdFx0PC9kaXY+XFxuXHQ8L2xpPlxcblxcblx0PGxpIGNsYXNzPVxcXCJ3My1iYXJcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25TaGFyZVxcXCI+XFxuXHRcdDxkaXYgY2xhc3M9XFxcInczLWJhci1pdGVtXFxcIj5cXG5cdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtc2hhcmUtYWx0IGZhLTJ4IGZhLWZ3IHczLXRleHQtYmx1ZVxcXCI+PC9pPlxcblx0XHRcdDxzcGFuPkZpbGVzIHNoYXJlZCBieSB5b3VyIGZyaWVuZHM8L3NwYW4+XFxuXHRcdDwvZGl2Plxcblx0PC9saT5cXG48L3VsPlx0XCIsXG5cblx0ZGVwczogWydicmVpemJvdC5wYWdlciddLFxuXG5cdGluaXQ6IGZ1bmN0aW9uIChlbHQsIHBhZ2VyKSB7XG5cblx0XHRmdW5jdGlvbiBvcGVuRmlsdGVyUGFnZShpZmFjZSkge1xuXHRcdFx0bGV0IGFydGlzdHMgPSB7fVxuXHRcdFx0bGV0IGdlbnJlcyA9IHt9XG5cdFx0XHRjb25zdCBtcDNGaWx0ZXJzID0gaWZhY2UuZ2V0TVAzRmlsdGVycygpXG5cdFx0XHRpZmFjZS5nZXRGaWxlcygpXG5cdFx0XHRcdC5mb3JFYWNoKChmKSA9PiB7XG5cdFx0XHRcdFx0aWYgKGYubXAzKSB7XG5cdFx0XHRcdFx0XHRjb25zdCB7YXJ0aXN0LCBnZW5yZX0gPSBmLm1wM1xuXHRcdFx0XHRcdFx0aWYgKGFydGlzdCkge1xuXHRcdFx0XHRcdFx0XHRpZiAoYXJ0aXN0c1thcnRpc3RdKSB7XG5cdFx0XHRcdFx0XHRcdFx0YXJ0aXN0c1thcnRpc3RdKytcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRhcnRpc3RzW2FydGlzdF0gPSAxXG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGlmIChnZW5yZSkge1xuXHRcdFx0XHRcdFx0XHRpZiAoZ2VucmVzW2dlbnJlXSkge1xuXHRcdFx0XHRcdFx0XHRcdGdlbnJlc1tnZW5yZV0rK1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdGdlbnJlc1tnZW5yZV0gPSAxXG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pXG5cdFx0XHRhcnRpc3RzID0gT2JqZWN0LmtleXMoYXJ0aXN0cykuc29ydCgpLm1hcCgoYXJ0aXN0KSA9PiB7XG5cdFx0XHRcdGNvbnN0IG5iVGl0bGUgPSBhcnRpc3RzW2FydGlzdF1cblx0XHRcdFx0cmV0dXJuIChuYlRpdGxlID09IDEpID9cblx0XHRcdFx0XHR7IHZhbHVlOiBhcnRpc3QsIGxhYmVsOiBhcnRpc3QgfSA6XG5cdFx0XHRcdFx0eyB2YWx1ZTogYXJ0aXN0LCBsYWJlbDogYCR7YXJ0aXN0fSAoJHtuYlRpdGxlfSlgIH1cblx0XHRcdH0pXG5cdFx0XHRhcnRpc3RzLnVuc2hpZnQoeyB2YWx1ZTogJ0FsbCcsIGxhYmVsOiAnQWxsJywgc3R5bGU6ICdmb250LXdlaWdodDogYm9sZDsnIH0pXG5cblx0XHRcdGdlbnJlcyA9IE9iamVjdC5rZXlzKGdlbnJlcykuc29ydCgpLm1hcCgoZ2VucmUpID0+IHtcblx0XHRcdFx0Y29uc3QgbmJUaXRsZSA9IGdlbnJlc1tnZW5yZV1cblx0XHRcdFx0cmV0dXJuIChuYlRpdGxlID09IDEpID9cblx0XHRcdFx0XHR7IHZhbHVlOiBnZW5yZSwgbGFiZWw6IGdlbnJlIH0gOlxuXHRcdFx0XHRcdHsgdmFsdWU6IGdlbnJlLCBsYWJlbDogYCR7Z2VucmV9ICgke25iVGl0bGV9KWAgfVxuXHRcdFx0fSlcblx0XHRcdGdlbnJlcy51bnNoaWZ0KHsgdmFsdWU6ICdBbGwnLCBsYWJlbDogJ0FsbCcsIHN0eWxlOiAnZm9udC13ZWlnaHQ6IGJvbGQ7JyB9KVxuXG5cdFx0XHRwYWdlci5wdXNoUGFnZSgnZmlsdGVyRGxnJywge1xuXHRcdFx0XHR0aXRsZTogJ0ZpbHRlcicsXG5cdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0YXJ0aXN0cyxcblx0XHRcdFx0XHRnZW5yZXMsXG5cdFx0XHRcdFx0c2VsZWN0ZWRBcnRpc3Q6IChtcDNGaWx0ZXJzICYmIG1wM0ZpbHRlcnMuYXJ0aXN0KSB8fCAnQWxsJ1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRvblJldHVybjogZnVuY3Rpb24gKGFydGlzdCkge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdhcnRpc3QnLCBhcnRpc3QpXG5cdFx0XHRcdFx0aWYgKGFydGlzdCA9PSAnQWxsJykge1xuXHRcdFx0XHRcdFx0YXJ0aXN0ID0gbnVsbFxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZmFjZS5zZXRNUDNGaWx0ZXJzKHsgYXJ0aXN0IH0pXG5cdFx0XHRcdH1cblx0XHRcdH0pXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gb3BlbkZpbGVQYWdlKHRpdGxlLCBmcmllbmRVc2VyKSB7XG5cdFx0XHRwYWdlci5wdXNoUGFnZSgnYnJlaXpib3QuZmlsZXMnLCB7XG5cdFx0XHRcdHRpdGxlLFxuXHRcdFx0XHRwcm9wczoge1xuXHRcdFx0XHRcdGZpbHRlckV4dGVuc2lvbjogJy5tcDMnLFxuXHRcdFx0XHRcdGdldE1QM0luZm86IHRydWUsXG5cdFx0XHRcdFx0ZnJpZW5kVXNlclxuXHRcdFx0XHR9LFxuXHRcdFx0XHRidXR0b25zOiB7XG5cdFx0XHRcdFx0c2VhcmNoOiB7XG5cdFx0XHRcdFx0XHR0aXRsZTogJ0ZpbHRlcicsXG5cdFx0XHRcdFx0XHRpY29uOiAnZmEgZmEtc2VhcmNoJyxcblx0XHRcdFx0XHRcdG9uQ2xpY2s6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdFx0b3BlbkZpbHRlclBhZ2UodGhpcylcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRcdGZpbGVjbGljazogZnVuY3Rpb24gKGV2LCBpbmZvKSB7XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZygnaW5mbycsIGluZm8pXG5cdFx0XHRcdFx0XHRjb25zdCB7IHJvb3REaXIsIGZpbGVOYW1lIH0gPSBpbmZvXG5cdFx0XHRcdFx0XHRjb25zdCBpZmFjZSA9ICQodGhpcykuaWZhY2UoKVxuXHRcdFx0XHRcdFx0Y29uc3QgZmlsZXMgPSBpZmFjZS5nZXRGaWx0ZXJlZEZpbGVzKClcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdmaWxlcycsIGZpbGVzKVxuXHRcdFx0XHRcdFx0Y29uc3QgZmlyc3RJZHggPSBmaWxlcy5maW5kSW5kZXgoKGYpID0+IGYubmFtZSA9PSBmaWxlTmFtZSlcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdmaXJzdElkeCcsIGZpcnN0SWR4KVxuXHRcdFx0XHRcdFx0cGFnZXIucHVzaFBhZ2UoJ3BsYXllcicsIHtcblx0XHRcdFx0XHRcdFx0dGl0bGU6ICdQbGF5ZXInLFxuXHRcdFx0XHRcdFx0XHRwcm9wczoge1xuXHRcdFx0XHRcdFx0XHRcdGZpcnN0SWR4LFxuXHRcdFx0XHRcdFx0XHRcdGZpbGVzLFxuXHRcdFx0XHRcdFx0XHRcdHJvb3REaXIsXG5cdFx0XHRcdFx0XHRcdFx0ZnJpZW5kVXNlcixcblx0XHRcdFx0XHRcdFx0XHRmaWxlQ3RybDogaWZhY2Vcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSlcblxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSlcblxuXHRcdH1cblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25Ib21lOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0b3BlbkZpbGVQYWdlKCdIb21lIGZpbGVzJywgJycpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uU2hhcmU6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRwYWdlci5wdXNoUGFnZSgnYnJlaXpib3QuZnJpZW5kcycsIHtcblx0XHRcdFx0XHRcdHRpdGxlOiAnU2hhcmVkIGZpbGVzJyxcblx0XHRcdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0XHRcdHNob3dDb25uZWN0aW9uU3RhdGU6IGZhbHNlXG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdFx0XHRcdGZyaWVuZGNsaWNrOiBmdW5jdGlvbiAoZXYsIGRhdGEpIHtcblx0XHRcdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblNlbGVjdEZyaWVuZCcsIGRhdGEpXG5cdFx0XHRcdFx0XHRcdFx0Y29uc3QgeyB1c2VyTmFtZSB9ID0gZGF0YVxuXHRcdFx0XHRcdFx0XHRcdG9wZW5GaWxlUGFnZSh1c2VyTmFtZSwgdXNlck5hbWUpXG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9XG5cblx0XHRcdH1cblx0XHR9KVxuXG5cdH1cblxuXG59KTtcblxuXG5cblxuIiwiKGZ1bmN0aW9uICgpIHtcblxuXHRmdW5jdGlvbiBnZXRUaW1lKGR1cmF0aW9uKSB7XG5cdFx0Y29uc3QgZCA9IG5ldyBEYXRlKGR1cmF0aW9uICogMTAwMClcblx0XHRjb25zdCB2ID0gZC5nZXRNaW51dGVzKCkgKyBkLmdldFNlY29uZHMoKSAvIDEwMFxuXHRcdHJldHVybiB2LnRvRml4ZWQoMikucmVwbGFjZSgnLicsICc6Jylcblx0fVxuXG5cblx0JCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ3BsYXllcicsIHtcblxuXHRcdHRlbXBsYXRlOiBcIjxkaXYgY2xhc3M9XFxcInRpdGxlXFxcIiBibi1zaG93PVxcXCIhdGl0bGVcXFwiPlxcblx0PHN0cm9uZz5GaWxlTmFtZTombmJzcDs8L3N0cm9uZz5cXG5cdDxzcGFuIGJuLXRleHQ9XFxcIm5hbWVcXFwiPjwvc3Bhbj5cXG48L2Rpdj5cXG48ZGl2IGNsYXNzPVxcXCJ0aXRsZVxcXCIgYm4tc2hvdz1cXFwidGl0bGVcXFwiPlxcblx0PHN0cm9uZz5UaXRsZTombmJzcDs8L3N0cm9uZz5cXG5cdDxzcGFuIGJuLXRleHQ9XFxcInRpdGxlXFxcIj48L3NwYW4+XFxuPC9kaXY+XFxuPGRpdiBjbGFzcz1cXFwidGl0bGVcXFwiIGJuLXNob3c9XFxcImFydGlzdFxcXCI+XFxuXHQ8c3Ryb25nPkFydGlzdDombmJzcDs8L3N0cm9uZz5cXG5cdDxzcGFuIGJuLXRleHQ9XFxcImFydGlzdFxcXCI+PC9zcGFuPlxcbjwvZGl2PlxcbjxkaXYgY2xhc3M9XFxcInRvb2xiYXJcXFwiPlxcblx0XHQ8YnV0dG9uIGJuLXByb3A9XFxcIntkaXNhYmxlZDogaXNGaXJzdH1cXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25QcmV2XFxcIiBjbGFzcz1cXFwidzMtYnRuIHczLWJsdWVcXFwiIHRpdGxlPVxcXCJQcmV2aW91c1xcXCI+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLWxnIGZhLXN0ZXAtYmFja3dhcmRcXFwiPjwvaT5cXG5cdFx0PC9idXR0b24+XFxuXHRcdFxcblx0XHQ8YnV0dG9uIGJuLXNob3c9XFxcIiFwbGF5aW5nXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uUGxheVxcXCIgY2xhc3M9XFxcInczLWJ0biB3My1ibHVlXFxcIiB0aXRsZT1cXFwiUGxheVxcXCI+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLWxnIGZhLXBsYXlcXFwiPjwvaT5cXG5cdFx0PC9idXR0b24+XFxuXHRcdFxcblx0XHQ8YnV0dG9uIGJuLXNob3c9XFxcInBsYXlpbmdcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25QYXVzZVxcXCIgY2xhc3M9XFxcInczLWJ0biB3My1ibHVlXFxcIiB0aXRsZT1cXFwiUGF1c2VcXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1sZyBmYS1wYXVzZVxcXCI+PC9pPlxcblx0XHQ8L2J1dHRvbj5cXG5cdFx0XFxuXHRcdDxidXR0b24gYm4tcHJvcD1cXFwie2Rpc2FibGVkOiBpc0xhc3R9XFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uTmV4dFxcXCIgY2xhc3M9XFxcInczLWJ0biB3My1ibHVlXFxcIiB0aXRsZT1cXFwiTmV4dFxcXCI+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLWxnIGZhLXN0ZXAtZm9yd2FyZFxcXCI+PC9pPlxcblx0XHQ8L2J1dHRvbj5cdFxcblxcbjwvZGl2PlxcblxcbjxkaXYgY2xhc3M9XFxcInNodWZmbGVcXFwiPlxcblx0PHNwYW4+U2h1ZmZsZTwvc3Bhbj5cXG5cdDxkaXYgXFxuXHRcdGJuLWNvbnRyb2w9XFxcImJyYWluanMuZmxpcHN3aXRjaFxcXCJcXG5cdFx0Ym4tZXZlbnQ9XFxcImZsaXBzd2l0Y2hjaGFuZ2U6IG9uU2h1ZmZsZUNoYW5nZVxcXCJcXG5cdFx0Plxcblx0XHRcXG5cdDwvZGl2Plx0XHRcdFxcbjwvZGl2PlxcblxcblxcbjxkaXYgY2xhc3M9XFxcInNsaWRlclxcXCI+XFxuXHQ8c3BhbiBibi10ZXh0PVxcXCJnZXRUaW1lSW5mb1xcXCI+PC9zcGFuPlxcblx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLnNsaWRlclxcXCIgXFxuXHRcdGJuLWRhdGE9XFxcInttYXg6IGR1cmF0aW9ufVxcXCJcXG5cdFx0Ym4tZXZlbnQ9XFxcImlucHV0OiBvblNsaWRlckNoYW5nZVxcXCIgXHRcdCBcXG5cdFx0Ym4tdmFsPVxcXCJjdXJUaW1lXFxcIj5cdFx0XFxuXHQ8L2Rpdj5cXG5cdFxcbjwvZGl2PlxcblxcbjxhdWRpbyBcXG5cdGJuLWF0dHI9XFxcIntzcmN9XFxcIiBcXG5cdGJuLWJpbmQ9XFxcImF1ZGlvXFxcIlxcblx0YXV0b3BsYXk9XFxcIlxcXCIgXFxuXHRibi1ldmVudD1cXFwiY2FucGxheTogb25Mb2FkLCB0aW1ldXBkYXRlOiBvblRpbWVVcGRhdGUsIHBsYXlpbmc6IG9uUGxheWluZywgcGF1c2U6IG9uUGF1c2VkLCBlbmRlZDogb25FbmRlZFxcXCI+XHRcdFxcbjwvYXVkaW8+XFxuXCIsXG5cblx0XHRkZXBzOiBbJ2JyZWl6Ym90LmZpbGVzJywgJ2JyZWl6Ym90Lmh0dHAnLCAnYnJlaXpib3QucGFnZXInXSxcblxuXHRcdHByb3BzOiB7XG5cdFx0XHRyb290RGlyOiAnJyxcblx0XHRcdGZpbGVzOiBbXSxcblx0XHRcdGZpcnN0SWR4OiAwLFxuXHRcdFx0ZnJpZW5kVXNlcjogJycsXG5cdFx0XHRmaWxlQ3RybDogbnVsbFxuXHRcdH0sXG5cblx0XHRpbml0OiBmdW5jdGlvbiAoZWx0LCBmaWxlc1NydiwgaHR0cCwgcGFnZXIpIHtcblxuXHRcdFx0Y29uc3QgeyByb290RGlyLCBmaWxlcywgZmlyc3RJZHgsIGZyaWVuZFVzZXIsIGZpbGVDdHJsIH0gPSB0aGlzLnByb3BzXG5cblx0XHRcdGxldCBzaHVmZmxlSW5kZXhlcyA9IG51bGxcblxuXHRcdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0XHRkYXRhOiB7XG5cdFx0XHRcdFx0aWR4OiBmaXJzdElkeCxcblx0XHRcdFx0XHRuYkZpbGVzOiBmaWxlcy5sZW5ndGgsXG5cdFx0XHRcdFx0c3JjOiBnZXRGaWxlVXJsKGZpcnN0SWR4KSxcblx0XHRcdFx0XHRuYW1lOiBnZXROYW1lKGZpcnN0SWR4KSxcblx0XHRcdFx0XHR0aXRsZTogZ2V0VGl0bGUoZmlyc3RJZHgpLFxuXHRcdFx0XHRcdGFydGlzdDogZ2V0QXJ0aXN0KGZpcnN0SWR4KSxcblx0XHRcdFx0XHRkdXJhdGlvbjogMCxcblx0XHRcdFx0XHRjdXJUaW1lOiAwLFxuXHRcdFx0XHRcdHBsYXlpbmc6IGZhbHNlLFxuXHRcdFx0XHRcdGlzRmlyc3Q6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdHJldHVybiAodGhpcy5pZHggPT0gMClcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGlzTGFzdDogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0cmV0dXJuICh0aGlzLmlkeCA9PSB0aGlzLm5iRmlsZXMgLSAxKVxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0Z2V0VGltZUluZm86IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdHJldHVybiBgJHtnZXRUaW1lKHRoaXMuY3VyVGltZSl9IC8gJHtnZXRUaW1lKHRoaXMuZHVyYXRpb24pfWBcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0fSxcblx0XHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdFx0b25Mb2FkOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdkdXJhdGlvbicsIHRoaXMuZHVyYXRpb24pXG5cdFx0XHRcdFx0XHRjdHJsLnNldERhdGEoeyBkdXJhdGlvbjogTWF0aC5mbG9vcih0aGlzLmR1cmF0aW9uKSB9KVxuXHRcdFx0XHRcdH0sXG5cblx0XHRcdFx0XHRvblRpbWVVcGRhdGU6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7IGN1clRpbWU6IHRoaXMuY3VycmVudFRpbWUgfSlcblx0XHRcdFx0XHR9LFxuXG5cdFx0XHRcdFx0b25QbGF5aW5nOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblBsYXlpbmcnKVxuXHRcdFx0XHRcdFx0Y3RybC5zZXREYXRhKHsgcGxheWluZzogdHJ1ZSB9KVxuXHRcdFx0XHRcdH0sXG5cblx0XHRcdFx0XHRvblBhdXNlZDogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25QYXVzZWQnKVxuXHRcdFx0XHRcdFx0Y3RybC5zZXREYXRhKHsgcGxheWluZzogZmFsc2UgfSlcblx0XHRcdFx0XHR9LFxuXG5cdFx0XHRcdFx0b25QbGF5OiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRhdWRpby5wbGF5KClcblx0XHRcdFx0XHR9LFxuXG5cdFx0XHRcdFx0b25QYXVzZTogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0YXVkaW8ucGF1c2UoKVxuXHRcdFx0XHRcdH0sXG5cblx0XHRcdFx0XHRvblNsaWRlckNoYW5nZTogZnVuY3Rpb24gKGV2LCB2YWx1ZSkge1xuXHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25TbGlkZXJDaGFuZ2UnLCB2YWx1ZSlcblx0XHRcdFx0XHRcdGF1ZGlvLmN1cnJlbnRUaW1lID0gdmFsdWVcblx0XHRcdFx0XHR9LFxuXG5cdFx0XHRcdFx0b25TaHVmZmxlQ2hhbmdlOiBmdW5jdGlvbiAoZXYsIGlzQWN0aXZhdGVkKSB7XG5cdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblNodWZmbGVDaGFuZ2UnLCB2YWx1ZSlcblx0XHRcdFx0XHRcdGlmIChpc0FjdGl2YXRlZCkge1xuXHRcdFx0XHRcdFx0XHRzaHVmZmxlSW5kZXhlcyA9ICQkLnV0aWwua251dGhTaHVmZmxlKGN0cmwubW9kZWwubmJGaWxlcylcblx0XHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnc2h1ZmZsZUluZGV4ZXMnLCBzaHVmZmxlSW5kZXhlcylcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRzaHVmZmxlSW5kZXhlcyA9IG51bGxcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9LFxuXG5cdFx0XHRcdFx0b25FbmRlZDogbmV4dCxcblxuXHRcdFx0XHRcdG9uUHJldjogcHJldixcblxuXHRcdFx0XHRcdG9uTmV4dDogbmV4dFxuXG5cdFx0XHRcdH1cblx0XHRcdH0pXG5cblx0XHRcdGZ1bmN0aW9uIHByZXYoKSB7XG5cdFx0XHRcdGxldCB7IGlkeCB9ID0gY3RybC5tb2RlbFxuXHRcdFx0XHRpZiAoaWR4ID4gMCkge1xuXHRcdFx0XHRcdHNldEluZGV4KGlkeCAtIDEpXG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0ZnVuY3Rpb24gbmV4dCgpIHtcblx0XHRcdFx0aWYgKHNodWZmbGVJbmRleGVzICE9IG51bGwpIHtcblx0XHRcdFx0XHRpZiAoc2h1ZmZsZUluZGV4ZXMubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRcdFx0c2V0SW5kZXgoc2h1ZmZsZUluZGV4ZXMucG9wKCkpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHJldHVyblxuXHRcdFx0XHR9XG5cblx0XHRcdFx0bGV0IHsgaWR4LCBuYkZpbGVzIH0gPSBjdHJsLm1vZGVsXG5cdFx0XHRcdGlmIChpZHggPCBuYkZpbGVzIC0gMSkge1xuXHRcdFx0XHRcdHNldEluZGV4KGlkeCArIDEpXG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0ZnVuY3Rpb24gc2V0SW5kZXgoaWR4KSB7XG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7XG5cdFx0XHRcdFx0c3JjOiBnZXRGaWxlVXJsKGlkeCksXG5cdFx0XHRcdFx0dGl0bGU6IGdldFRpdGxlKGlkeCksXG5cdFx0XHRcdFx0bmFtZTogZ2V0TmFtZShpZHgpLFxuXHRcdFx0XHRcdGFydGlzdDogZ2V0QXJ0aXN0KGlkeCksXG5cdFx0XHRcdFx0aWR4XG5cdFx0XHRcdH0pXG5cdFx0XHR9XG5cblx0XHRcdGNvbnN0IGF1ZGlvID0gY3RybC5zY29wZS5hdWRpby5nZXQoMClcblxuXHRcdFx0ZnVuY3Rpb24gZ2V0TmFtZShpZHgpIHtcblx0XHRcdFx0cmV0dXJuIGZpbGVzW2lkeF0ubmFtZVxuXHRcdFx0fVxuXG5cdFx0XHRmdW5jdGlvbiBnZXRUaXRsZShpZHgpIHtcblx0XHRcdFx0cmV0dXJuIGZpbGVzW2lkeF0ubXAzLnRpdGxlIHx8ICcnXG5cdFx0XHR9XG5cblx0XHRcdGZ1bmN0aW9uIGdldEFydGlzdChpZHgpIHtcblx0XHRcdFx0cmV0dXJuIGZpbGVzW2lkeF0ubXAzLmFydGlzdCB8fCAnJ1xuXHRcdFx0fVxuXG5cdFx0XHRmdW5jdGlvbiBnZXRGaWxlVXJsKGlkeCkge1xuXHRcdFx0XHRyZXR1cm4gZmlsZXNTcnYuZmlsZVVybChyb290RGlyICsgZmlsZXNbaWR4XS5uYW1lLCBmcmllbmRVc2VyKVxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmdldEJ1dHRvbnMgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0ZWRpdEluZm86IHtcblx0XHRcdFx0XHRcdHRpdGxlOiAnRWRpdCBJbmZvJyxcblx0XHRcdFx0XHRcdGljb246ICdmYSBmYS1lZGl0Jyxcblx0XHRcdFx0XHRcdG9uQ2xpY2s6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdFx0Y29uc3QgeyBpZHgsIG5hbWUgfSA9IGN0cmwubW9kZWxcblx0XHRcdFx0XHRcdFx0cGFnZXIucHVzaFBhZ2UoJ2VkaXREbGcnLCB7XG5cdFx0XHRcdFx0XHRcdFx0dGl0bGU6ICdFZGl0IE1QMyBJbmZvJyxcblx0XHRcdFx0XHRcdFx0XHRwcm9wczoge1xuXHRcdFx0XHRcdFx0XHRcdFx0ZGF0YTogZmlsZXNbaWR4XS5tcDMsXG5cdFx0XHRcdFx0XHRcdFx0XHRmaWxlTmFtZTogbmFtZVxuXHRcdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdFx0b25SZXR1cm46IGFzeW5jIGZ1bmN0aW9uICh0YWdzKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHQvL2NvbnNvbGUuZ3JvdXAoJ29uUmV0dXJuJywgdGFncylcblx0XHRcdFx0XHRcdFx0XHRcdGZpbGVzW2lkeF0ubXAzID0gdGFnc1xuXHRcdFx0XHRcdFx0XHRcdFx0Y3RybC5zZXREYXRhKHRhZ3MpXG5cdFx0XHRcdFx0XHRcdFx0XHRhd2FpdCBodHRwLnBvc3QoJy9zYXZlSW5mbycsIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0ZmlsZVBhdGg6IHJvb3REaXIgKyBuYW1lLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRmcmllbmRVc2VyLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHR0YWdzXG5cdFx0XHRcdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0XHRcdFx0YXdhaXQgZmlsZUN0cmwudXBkYXRlRmlsZShuYW1lLCB7IGdldE1QM0luZm86IHRydWUgfSlcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH0pXG5cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdH1cblxuXG5cdH0pO1xuXG59KSgpO1xuXG5cblxuIl19
