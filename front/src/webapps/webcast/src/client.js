$$.control.registerControl('client', {

    template: { gulp_inject: './client.html' },

    props: {
        id: null,
        mimeType: ''
    },

    init: function (elt) {

        const { id, mimeType } = this.props

        let sock = null
        let mediaSource = null
        let sourceBuffer = null


        function start() {

            console.log('try to connect...')

            let { host, protocol } = location
            protocol = (protocol == 'http:') ? 'ws:' : 'wss:'


            const url = `${protocol}//${host}/stream/client/${id}`
            //console.log('url', url)

            sock = new WebSocket(url)
            sock.binaryType = 'arraybuffer'

            sock.onopen = async () => {
                console.log("Connected to streamer")
                try {
                    mediaSource = new MediaSource()
                    const video = ctrl.scope.video.get(0)
                    video.src = URL.createObjectURL(mediaSource)
                    mediaSource.addEventListener('sourceopen', () => {
                        console.log('source opened')
                        URL.revokeObjectURL(video.src)
                        sourceBuffer = mediaSource.addSourceBuffer(mimeType)

                    })
                }
                catch (e) {
                    console.error(e)
                }
            }

			sock.onmessage = (ev) => {
				//console.log('onmessage', ev.data)
				sourceBuffer.appendBuffer(ev.data)
			}            

            sock.onclose = (ev) => {
                console.log("Disconnected to streamer")
            }

        }


        const ctrl = $$.viewController(elt, {

        })

        this.dispose = function() {
            console.log('client dispose')
            sock.close()
        }


        start()

    }
})