$$.control.registerControl('infoPage', {

    template: {gulp_inject: './info.html'},

    deps: ['app.ytdl', 'breizbot.broker'],

    props: {
        info: null
    },

    init: function(elt, ytdl, broker) {

        console.log('props', this.props)

        const progressDlg = $$.ui.progressDialog('Downloading...')

        const {title, thumbnail, description, length_seconds, videoUrl, videoId} = this.props.info

        const ctrl = $$.viewController(elt, {
            data: {
				duration: new Date(length_seconds*1000).toLocaleTimeString('fr-FR', {timeZone: 'UTC'}),
                title,
                width: thumbnail.width,
                height: thumbnail.height, 
                videoUrl: $$.util.getUrlParams(`https://www.youtube-nocookie.com/embed/${videoId}`, {
                    rel: 0,
                    modestbranding: 1,
                    showinfo: 0}),
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
            const {percent} = msg.data
            progressDlg.setPercentage(percent/100)
            if (percent == 100) {
                await $$.util.wait(1000)
                progressDlg.hide()
            }
		})

        this.getButtons = function() {
            return {
                download: {
                    title: 'Download',
                    icon: 'fa fa-download',
                    onClick: function() {
                        console.log('onDownload', videoUrl)
                        const fileName = title + '.mp4'
                        ytdl.download(videoUrl, fileName)
                        progressDlg.show()
    
                    }
                }
            }
        }
    }
});
