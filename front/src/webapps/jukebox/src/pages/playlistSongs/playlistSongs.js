//@ts-check
$$.control.registerControl('playlistSongs', {
    deps: ['app.jukebox', 'breizbot.pager'],

    template: { gulp_inject: './playlistSongs.html' },

	props: {
		playlistName: ''
	},

    /**
     * 
     * @param {AppJukebox.Interface} srvApp 
     * @param {Breizbot.Services.Pager.Interface} pager 
     */
    init: function (elt, srvApp, pager) {

		//console.log('props', this.props)

		const {playlistName} = this.props

        let selectedIndex = -1

        const ctrl = $$.viewController(elt, {
            data: {
                songs: [],
				totalDuration: 0,
				getInfo: function() {
					let ret = `${this.songs.length} Songs`
					if (this.totalDuration != 0) {
						ret += ` (${$$.media.getFormatedTime(this.totalDuration)})`
					}
					return ret
				},
                hasGenre: function (scope) {
                    let { genre } = scope.f.mp3 || {} 
                    return genre != undefined && genre != '' && !genre.startsWith('(')
                },

                hasTitle: function(scope) {
                    let { title } = scope.f.mp3 || {}
                    return title != undefined && title != ''
                },

                hasArtist: function(scope) {
                    let { artist } = scope.f.mp3 || {}
                    return artist != undefined && artist != ''
                },
                hasYear: function (scope) {
                    let { year } = scope.f.mp3 || {}
                    return year != undefined && year != ''
                },
                hasDuration: function (scope) {
                    let { length } = scope.f.mp3 || {}
                    return length != undefined && length != ''
                },

				getDuration: function(scope) {
                    return (this.hasDuration(scope)) ?
					    $$.media.getFormatedTime(scope.f.mp3.length) : ''
				},

                getYear: function (scope) {
                    return parseInt(scope.f.mp3 && scope.f.mp3.year)
                },
                isOk: function(scope) {
                    return scope.f.status === 'ok'
                }
            },
            events: {
                onItemContextMenu: async function (ev, data) {
                    //console.log('onItemContextMenu', data)
                    const idx = $(this).closest('.item').index()
                    //console.log('idx', idx)
					const song = ctrl.model.songs[idx]
                    const id = song.id
					const duration = song.mp3 && song.mp3.length
                    await srvApp.removeSong(id)
                    ctrl.removeArrayItem('songs', idx, 'songs')
					if (duration) {
						ctrl.model.totalDuration -= duration
					}
                    ctrl.updateNode('nbSongs')
                    pager.setButtonVisible({ play: ctrl.model.songs.length != 0 })
                },

                onItemClick: function (ev) {
                    const node = $(this)
                    selectedIndex = node.index()
                    //console.log('onItemClick', selectedIndex)

                    if (node.hasClass('w3-blue')) {
                        node.removeClass('w3-blue')
                        selectedIndex = -1
                    }
                    else {
                        node.closest('.items').find('.w3-blue').removeClass('w3-blue')
                        node.addClass('w3-blue')
                    }
                    setUpDownState()
                }
            }

        })

        function setUpDownState() {
            pager.setButtonEnabled({
                info: selectedIndex >= 0,
                moveUp: selectedIndex > 0,
                moveDown: selectedIndex >= 0 && selectedIndex < ctrl.model.songs.length - 1
            })
        }


        async function getPlaylistSongs() {
            const songs = await srvApp.getPlaylistSongs(playlistName)
            //console.log('songs', songs)
			let totalDuration = 0
			for(const song of songs) {
				const duration = song.mp3 && song.mp3.length
				if (duration) {
					totalDuration += parseInt(duration)
				}
				else {
					totalDuration = 0
					break
				}
			}
            ctrl.setData({ songs, totalDuration })
            selectedIndex = -1
            setUpDownState()
        }

		getPlaylistSongs()


        this.getButtons = function () {
            return {
                info : {
                    title: 'Show File Info',
                    icon: 'fas fa-info',
                    enabled: false,
                    onClick: function() {
                        /**@type {AppJukebox.PlaylistInfo} */
                        const info = ctrl.model.songs[selectedIndex]
                        let title = info.fileInfo.fileName
                        if (info.mp3 && info.mp3.title) {
                            title = `${info.mp3.artist} - ${info.mp3.title}`
                        }0
                        pager.pushPage('fileInfo', {
                            title,
                            props: {
                                info
                            }
                        })
                    }
                },
                moveUp: {
                    title: 'Move up',
                    icon: 'fas fa-level-up-alt',
                    enabled: false,
                    onClick: async function () {
                        const id1 = ctrl.model.songs[selectedIndex].id
                        const id2 = ctrl.model.songs[selectedIndex-1].id
                        const items = ctrl.removeArrayItem('songs', selectedIndex, 'songs')
                        ctrl.insertArrayItemAfter('songs', selectedIndex - 2, items[0], 'songs')
                        selectedIndex--
                        ctrl.scope.songs.find('.item').eq(selectedIndex).addClass('w3-blue')
                        setUpDownState()
                        await srvApp.swapSongIndex(id1, id2)
                    }
                },
                moveDown: {
                    title: 'Move down',
                    icon: 'fas fa-level-down-alt',
                    enabled: false,
                    onClick: async function () {
                        const id1 = ctrl.model.songs[selectedIndex].id
                        const id2 = ctrl.model.songs[selectedIndex+1].id
                        const items = ctrl.removeArrayItem('songs', selectedIndex, 'songs')
                        ctrl.insertArrayItemAfter('songs', selectedIndex, items[0], 'songs')
                        selectedIndex++
                        ctrl.scope.songs.find('.item').eq(selectedIndex).addClass('w3-blue')
                        setUpDownState()
                        await srvApp.swapSongIndex(id1, id2)

                    }

                },
                play: {
                    title: 'Play',
                    icon: 'fa fa-play',
                    onClick: function () {
                        pager.pushPage('player', {
                            title: 'Player',
                            props: {
                                isPlaylist: true,
                                files: ctrl.model.songs,
                                firstIdx: Math.max(0, selectedIndex)
                            }
                        })
                    }

                }
            }
        }

    }
})