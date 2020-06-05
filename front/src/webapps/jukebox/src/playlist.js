$$.control.registerControl('playlist', {
    deps: ['breizbot.http', 'breizbot.pager'],

    template: { gulp_inject: './playlist.html' },

    init: function (elt, http, pager) {

        let selectedIndex = -1

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
                onItemContextMenu: async function (ev, data) {
                    //console.log('onItemContextMenu', data)
                    const idx = $(this).closest('.item').index()
                    //console.log('idx', idx)
                    const id = ctrl.model.songs[idx].id
                    await http.delete('/removeSong/' + id)
                    ctrl.removeArrayItem('songs', idx, 'songs')
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
                },
                onPlaylistChange: async function (ev) {
                    const playlist = $(this).getValue()
                    //console.log('onPlaylistChange', playlist)
                    await getPlaylistSongs(playlist)
                }
            }

        })

        function setUpDownState() {
            pager.setButtonEnabled({
                moveUp: selectedIndex > 0,
                moveDown: selectedIndex >= 0 && selectedIndex < ctrl.model.nbSongs() - 1
            })
        }

        async function getPlaylist() {
            //console.log('getPlaylist')
            const playlist = await http.post('/getPlaylist')
            //console.log('playlist', playlist)
            ctrl.setData({ playlist })
            if (playlist.length != 0) {
                await getPlaylistSongs(playlist[0])
            }
            else {
                pager.setButtonVisible({ play: false, delete: false })
            }
        }

        async function getPlaylistSongs(name) {
            const songs = await http.post('/getPlaylistSongs', { name })
            //console.log('songs', songs)
            ctrl.setData({ songs })
            pager.setButtonVisible({ play: songs.length != 0 })
            selectedIndex = -1
            setUpDownState()
        }

        getPlaylist()

        this.getButtons = function () {
            return {
                moveUp: {
                    title: 'Move up',
                    icon: 'fas fa-level-up-alt',
                    enabled: false,
                    onClick: async function () {
                        const id1 = ctrl.model.songs[selectedIndex].id
                        const id2 = ctrl.model.songs[selectedIndex-1].id
                        const item = ctrl.removeArrayItem('songs', selectedIndex, 'songs')
                        ctrl.insertArrayItemAfter('songs', selectedIndex - 2, item, 'songs')
                        selectedIndex--
                        ctrl.scope.songs.find('.item').eq(selectedIndex).addClass('w3-blue')
                        setUpDownState()
                        await http.post('/swapSongIndex', {id1, id2})
                    }
                },
                moveDown: {
                    title: 'Move down',
                    icon: 'fas fa-level-down-alt',
                    enabled: false,
                    onClick: async function () {
                        const id1 = ctrl.model.songs[selectedIndex].id
                        const id2 = ctrl.model.songs[selectedIndex+1].id
                        const item = ctrl.removeArrayItem('songs', selectedIndex, 'songs')
                        ctrl.insertArrayItemAfter('songs', selectedIndex, item, 'songs')
                        selectedIndex++
                        ctrl.scope.songs.find('.item').eq(selectedIndex).addClass('w3-blue')
                        setUpDownState()
                        await http.post('/swapSongIndex', {id1, id2})

                    }

                },
                delete: {
                    title: 'Delete selected playlist',
                    icon: 'fa fa-trash',
                    onClick: function () {
                        const name = ctrl.scope.playlist.getValue()
                        $$.ui.showConfirm({
                            title: 'Delete Playlist',
                            content: `Do you really want to delete <strong>'${name}'</strong> playlist ?`
                        },
                            async () => {
                                console.log('OK')
                                await http.post('/removePlaylist', { name })
                                getPlaylist()
                            })
                    }

                },
                play: {
                    visible: false,
                    title: 'Play',
                    icon: 'fa fa-play',
                    onClick: function () {
                        pager.pushPage('player', {
                            props: {
                                title: 'Player',
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