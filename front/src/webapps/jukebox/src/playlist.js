//@ts-check
$$.control.registerControl('playlist', {
    deps: ['app.jukebox', 'breizbot.pager'],

    template: { gulp_inject: './playlist.html' },

    /**
     * 
     * @param {AppJukebox.Interface} srvApp 
     * @param {Breizbot.Services.Pager.Interface} pager 
     */
    init: function (elt, srvApp, pager) {

        let selectedIndex = -1

        const ctrl = $$.viewController(elt, {
            data: {
                playlist: [],
                hasPlaylist: function () {
                    return this.playlist.length != 0
                },
            },
            events: {
                onItemContextMenu: async function (ev, data) {
                    //console.log('onItemContextMenu', data)
                    const idx = $(this).closest('.item').index()
                    //console.log('idx', idx, data)
                    const name = ctrl.model.playlist[idx]
                    $$.ui.showConfirm({
                        title: 'Delete Playlist',
                        content: `Do you really want to delete <strong>'${name}'</strong> playlist ?`
                    },
                        async () => {
                            await srvApp.removePlaylist(name)
                            getPlaylist()
                        })

                },

                onItemClick: function (ev) {
                    const idx = $(this).closest('.item').index()
                    const playlistName = ctrl.model.playlist[idx]
                    //console.log('idx', idx, playlistName)
                    pager.pushPage('playlistSongs', {
                        title: playlistName,
                        props : {
                            playlistName
                        }
                    })
                },
            }

        })


        async function getPlaylist() {
            //console.log('getPlaylist')
            const playlist = await srvApp.getPlaylist()
            //console.log('playlist', playlist)
            ctrl.setData({ playlist })
        }


        getPlaylist()

    }
})