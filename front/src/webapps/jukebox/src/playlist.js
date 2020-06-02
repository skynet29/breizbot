$$.control.registerControl('playlist', {
    deps: ['breizbot.http', 'breizbot.pager'],

    template: { gulp_inject: './playlist.html' },

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
                onItemContextMenu: async function(ev, data) {
                    console.log('onItemContextMenu', data)
                    const idx = $(this).closest('.item').index()
                    //console.log('idx', idx)
                    const id = ctrl.model.songs[idx].id
                    await http.delete('/removeSong/' + id)
                    ctrl.removeArrayItem('songs', idx, 'songs')
                },

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
            }
        }

        async function getPlaylistSongs(name) {
            const songs = await http.post('/getPlaylistSongs', { name })
            console.log('songs', songs)
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