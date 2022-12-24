// @ts-check

$$.control.registerControl('database', {

    template: { gulp_inject: './database.html' },

    deps: ['breizbot.pager', 'breizbot.songs'],


    /**
     * 
     * @param {Breizbot.Services.Pager.Interface} pager 
     * @param {Breizbot.Services.Songs.Interface} songsSrv
     */
    init: function (elt, pager, songsSrv) {

        const ctrl = $$.viewController(elt, {
            data: {},

            events: {
                onSubmit: async function (ev) {
                    ev.preventDefault()
                    const { query } = $(this).getFormData()
                    //console.log({ query })
                    const songs = await songsSrv.querySongs(query)
                    //console.log({songs})
                    if (songs.length > 0){
                        pager.pushPage('databaseSongs', {
                            title: `Query results (${songs.length} match)`,
                            props: {
                                songs
                            }
                        })
                    }
                    else {
                        $$.ui.showAlert({content: 'No results found'})
                    }


                }
            }
        })

        this.getButtons = function () {
            return {
                apply: {
                    title: 'Apply',
                    icon: 'fas fa-check',
                    onClick: function () {
                        ctrl.scope.submit.click()
                    }
                }
            }
        }
    }
})