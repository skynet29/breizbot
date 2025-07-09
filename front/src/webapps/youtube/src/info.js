//@ts-check
$$.control.registerControl('infoPage', {

    template: { gulp_inject: './info.html' },

    deps: ['app.ytdl', 'breizbot.broker'],

    props: {
        info: null,
        videoUrl: '',
        videoId: ''
    },

    /**
     * 
     * @param {AppYoutube.Services.Interface} ytdl 
     * @param {Breizbot.Services.Broker.Interface} broker 
     */
    init: function (elt, ytdl, broker) {

        /**@type AppYoutube.Controls.InfoPage.Props */
        const props = this.props

        const progressDlg = $$.ui.progressDialog('Downloading...')
        const { videoUrl, videoId } = props

        const { title, thumbnail, description, length_seconds, videoFormat, audioFormat } = props.info

        const { width, height } = thumbnail
        const ctrl = $$.viewController(elt, {
            data: {
                duration: new Date(length_seconds * 1000).toLocaleTimeString('fr-FR', { timeZone: 'UTC' }),
                title,
                width,
                height,
                ratio: function () {
                    const ret = `${(height / width) * 100}%`
                    console.log('ratio', ret)
                    return ret
                },
                videoUrl: $$.url.getUrlParams(`https://www.youtube-nocookie.com/embed/${videoId}`, {
                    rel: 0,
                    modestbranding: 1,
                    showinfo: 0
                }),
                description
            },
            events: {

            }
        })

        broker.onTopic('breizbot.ytdl.progress', async (msg) => {
            if (msg.hist == true) {
                return
            }
            //console.log('progress', msg.data)
            const { percent, error, finish } = msg.data
            if (error) {
                progressDlg.hide()
                $$.ui.showAlert({ title: 'Error', content: error })
            }
            else if (finish == true) {
                await $$.util.wait(1000)
                progressDlg.hide()
            }
            else {
                progressDlg.setPercentage(percent / 100)
            }
        })

        this.getButtons = function () {

            return {
                download: {
                    title: 'Download',
                    icon: 'fa fa-download',
                    onClick: function (cmd) {
                        console.log('onDownload', videoUrl)
                        $$.ui.showForm({
                            title: 'Choose Format',
                            fields: {
                                video: {
                                    input: 'select',
                                    label: 'Video',
                                    value: videoFormat[0].idx,
                                    items: videoFormat.map(v => {
                                        return { label: v.qualityLabel, value: v.idx }
                                    })
                                },
                                audio: {
                                    input: 'select',
                                    label: 'Audio',
                                    value: audioFormat[0].idx,
                                    items: audioFormat.map(v => {
                                        return { label: v.label, value: v.idx }
                                    })
                                }
                            }
                        },
                            (data) => {
                                console.log({ data })
                                const fileName = title + '.mp4'
                                ytdl.download(videoUrl, data.video, data.audio, fileName)
                                progressDlg.show()
                            }
                        )


                    }
                }
            }
        }
    }
});
