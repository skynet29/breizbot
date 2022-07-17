//@ts-check
$$.control.registerControl('editDlg', {

    template: { gulp_inject: './editDlg.html' },

    deps: ['breizbot.http', 'breizbot.pager', 'brainjs.beatdetector'],

    props: {
        mp3: {},
        fileName: '',
        url: '',
        worker: null
    },

    /**
     * 
     * @param {Breizbot.Services.Http.Interface} http 
     * @param {Breizbot.Services.Pager.Interface} pager 
     * @param {Brainjs.Services.BeatDetector.Interface} beatdetector
     */
    init: function (elt, http, pager, beatdetector) {

        /**@type {{mp3: Breizbot.Services.Files.Mp3Info, fileName: string, url: string, worker: Worker}} */
        // @ts-ignore
        const { mp3, fileName, url } = this.props

        const waitDlg = $$.ui.waitDialog('Computing...')

        //console.log('props', this.props)



        const ctrl = $$.viewController(elt, {
            data: {
                mp3
            },
            events: {
                onComputeBeatDetection: async function() {
                    waitDlg.show()
                    const audioBuffer = await $$.media.getAudioBuffer(url)
                    const info = await beatdetector.computeBeatDetection(audioBuffer)
                    console.log('tempo', info)
                    ctrl.model.mp3.bpm = parseFloat(info.tempo.toFixed(2))
                    ctrl.update()
                    waitDlg.hide()
                },
                onFindInfo: async function () {
                    const data = await http.post('/search', {
                        query: fileName.replace('.mp3', ''),
                    })
                    console.log(data)
                    if (data && data.title) {
                        $.extend(ctrl.model.mp3, data)
                        ctrl.update()
                    }
                    else {
                        $$.ui.showAlert({ title: 'MP3 Information', content: 'No information found !' }, () => {
                            const [artist, title] = fileName.replace('.mp3', '').split('__')
                            //console.log({artist, title})
                            if (artist) {
                                ctrl.model.mp3.artist = artist.replaceAll('_', ' ').trim()
                            }
                            if (title) {
                                ctrl.model.mp3.title = title.replaceAll('_', ' ').trim()
                            }
                            ctrl.update()
                        })
                    }
                },
                onSubmit: function (ev) {
                    ev.preventDefault()
                    const data = $(this).getFormData()

                    pager.popPage(data)

                }
            }
        })

        this.getButtons = function () {
            return {
                ok: {
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