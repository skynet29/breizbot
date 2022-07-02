//@ts-check
$$.control.registerControl('editDlg', {

    template: {gulp_inject: './editDlg.html'},

    deps: ['breizbot.http', 'breizbot.pager'],

    props: {
        mp3: {},
        fileName: ''
    },

    /**
     * 
     * @param {Breizbot.Services.Http.Interface} http 
     * @param {Breizbot.Services.Pager.Interface} pager 
     */
    init: function(elt, http, pager) {

        /**@type {{mp3: Breizbot.Services.Files.Mp3Info, fileName: string}} */
        // @ts-ignore
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
                        $$.ui.showAlert({title: 'MP3 Information', content: 'No information found !'}, () => {
                            const [artist, title] = fileName.replace('.mp3', '').split('__')
                            console.log({artist, title})
                            if (artist) {
                                ctrl.model.mp3.artist = artist.replaceAll('_', ' ')
                            }
                            if (title) {
                                ctrl.model.mp3.title = title.replaceAll('_', ' ')
                            }
                            ctrl.update()
                        })
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