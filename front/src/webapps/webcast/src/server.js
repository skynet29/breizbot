
$$.control.registerControl('server', {

    template: { gulp_inject: './server.html' },

    deps: ['breizbot.pager', 'breizbot.http', 'breizbot.broker'],

    props: {
        id: null,
        mimeType: ''
    },

    init: function (elt, pager, http, broker) {

        const { id, mimeType } = this.props

		const constraints = { video: true, audio: true }
        let sock = null
        let mediaRecorder = null   
        let stream = null     

        
		function start() {

			console.log('try to connect...')

			let { host, protocol } = location
			protocol = (protocol == 'http:') ? 'ws:' : 'wss:'


			const url = `${protocol}//${host}/stream/server/${id}`
			//console.log('url', url)

			sock = new WebSocket(url)
			sock.binaryType = 'arraybuffer'

			sock.onopen = async () => {
                console.log("Connected to streamer")
                try {
                    stream = await navigator.mediaDevices.getUserMedia(constraints)
                    const video = ctrl.scope.video.get(0)
                    video.srcObject = stream

                    mediaRecorder = new MediaRecorder(stream, { type: mimeType })
                    mediaRecorder.ondataavailable = async function (ev) {
                        //console.log('ondataavailable', ev.data)
                        const buffer = await ev.data.arrayBuffer()
                        if (sock.readyState == 1) {
                            sock.send(buffer)
                        }
                    }

                    mediaRecorder.start(500)
                    pager.setButtonVisible({start: false, stop: true})
                }
                catch (e) {
                    console.error(e)
                }
            

			}

			sock.onclose = (ev) => {
                console.log("Disconnected to streamer")
                mediaRecorder.stop()
                pager.setButtonVisible({start: true, stop: false})
                if (stream != null) {
                    stream.getTracks().forEach(function (track) {
                        track.stop();
                    })
                    stream = null                
                }
                }

		}        



        const ctrl = $$.viewController(elt, {
            data: {
                users: [],
				class1: function(scope) {

				}                
            }

        })

        async function getUserStatus() {
            //console.log('getUserStatus')
            const users = await http.get(`/${id}/users`)
            //console.log('users', users)
            ctrl.setData({users})
        }

        getUserStatus()

        function updateUserStatus(msg) {
            if (msg.hist) {
                return
            }
            //console.log('updateUserStatus', msg)
            const {userName, connected} = msg.data
            const userInfo = ctrl.model.users.find((i) => i.userName == userName)
            if (userInfo) {
                userInfo.connected = connected
                ctrl.update()    
            }
        }

        broker.register('webcast.userstatus', updateUserStatus)

        this.getButtons = function() {
            return {
                start: {
                    title: 'Start',
                    icon: 'far fa-play-circle',
                    onClick: start,
                    visible: true
                },
                stop: {
                    title: 'Stop',
                    icon: 'far fa-stop-circle',
                    onClick: stop,
                    visible: false
                }
            }
        }

        function stop() {
            if (sock != null) {
                sock.close()
            }
        }

        this.dispose = function() {
            console.log('server dispose')
            stop()
            broker.unregister('webcast.userstatus', updateUserStatus)

        }

    }
})