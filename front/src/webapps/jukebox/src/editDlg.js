//@ts-check
$$.control.registerControl('editDlg', {

    template: { gulp_inject: './editDlg.html' },

    deps: ['breizbot.http', 'breizbot.pager'],

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
     */
    init: function (elt, http, pager) {

        /**@type {{mp3: Breizbot.Services.Files.Mp3Info, fileName: string, url: string, worker: Worker}} */
        // @ts-ignore
        const { mp3, fileName, url, worker } = this.props

        const waitDlg = $$.ui.waitDialog('Computing...')

        //console.log('props', this.props)

        function computeBeatDetection() {

            return new Promise(async (resolve) => {

                const audioBuffer = await $$.media.getAudioBuffer(url)
                const sampleRate = audioBuffer.sampleRate
                const offlineContext = new OfflineAudioContext(1, audioBuffer.length, sampleRate)

                // Create buffer source
                const source = offlineContext.createBufferSource()
                source.buffer = audioBuffer

                // Create filter
                const filter = offlineContext.createBiquadFilter()
                filter.type = "lowpass"
                filter.frequency.value = 240

                // Pipe the song into the filter, and the filter into the offline context
                source.connect(filter)
                filter.connect(offlineContext.destination)

                // Schedule the song to start playing at time:0
                source.start(0);

                // Render the song
                offlineContext.startRendering()

                // Act on the result
                offlineContext.oncomplete = function (e) {
                    // Filtered buffer!
                    const channelData = e.renderedBuffer.getChannelData(0)
                    worker.postMessage({ channelData, sampleRate })
                    worker.onmessage = function (ev) {
                        resolve(ev.data)
                    }
                }
            })
        }

        const ctrl = $$.viewController(elt, {
            data: {
                mp3
            },
            events: {
                onComputeBeatDetection: async function() {
                    waitDlg.show()
                    const info = await computeBeatDetection()
                    console.log('tempo', info)
                    ctrl.model.mp3.bpm = info.tempo
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