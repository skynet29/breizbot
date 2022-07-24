//@ts-check
$$.control.registerControl('editDlg', {

    template: { gulp_inject: './editDlg.html' },

    deps: ['breizbot.http', 'breizbot.pager', 'breizbot.beatdetector', 'breizbot.spotify'],

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
     * @param {Breizbot.Services.BeatDetector.Interface} beatdetector
     * @param {Breizbot.Services.Spotify.Interface} spotify
     */
    init: function (elt, http, pager, beatdetector, spotify) {

        /**@type {{mp3: Breizbot.Services.Files.Mp3Info, fileName: string, url: string, worker: Worker}} */
        // @ts-ignore
        const { mp3, fileName, url } = this.props

        const waitDlg = $$.ui.waitDialog('Computing...')


        //searchOnSpotify()
        //console.log('props', this.props)



        const ctrl = $$.viewController(elt, {
            data: {
                mp3
            },
            events: {
                onComputeBeatDetection: async function () {
                    waitDlg.show()
                    const audioBuffer = await $$.media.getAudioBuffer(url)
                    const info = await beatdetector.computeBeatDetection(audioBuffer)
                    console.log('tempo', info)
                    ctrl.model.mp3.bpm = parseFloat(info.tempo.toFixed(2))
                    ctrl.update()
                    waitDlg.hide()
                },
                onFindInfo: async function () {
                    let query = fileName.replace('.mp3', '')
                    query = query.replaceAll('_', ' ').trim()

                    const { mp3 } = ctrl.model
                    if (mp3.title && mp3.artist) {
                        query = mp3.artist + ' - ' + mp3.title
                    }

                    // const data = await http.post('/search', {
                    //     query,
                    // })

                    const data = await spotify.searchTracks(query)
                    console.log(data)

                    if (data) {
                        const info = {
                            title: data.name,
                            artist: data.artists[0].name
                        }
                        const features = await spotify.getAudioFeaturesForTrack(data.id)
                        info.bpm = parseFloat(features.tempo.toFixed(2))
                        $.extend(ctrl.model.mp3, info)
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