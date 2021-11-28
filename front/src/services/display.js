//@ts-check
$$.service.registerService('breizbot.display', {

    deps: ['breizbot.params'],

    init: function (config, params) {

        console.log('params', params)
        const events = new EventEmitter2()

        const presentationRequest = new PresentationRequest($$.url.getUrlParams('/apps/cast', { id: params.$id }))
        let presentationConnection = null

        presentationRequest.addEventListener('connectionavailable', function (event) {
            console.log('connectionavailable', event)
            presentationConnection = event.connection

            presentationConnection.addEventListener('message', function (event) {
                //console.log('message', event.data)
                const msg = JSON.parse(event.data)
                switch(msg.type) {
                    case 'ready':
                        events.emit('ready')
                        break
                    case 'event':
                        events.emit(msg.name)
                }
            })

            presentationConnection.addEventListener('terminate', function() {
                events.emit('close')
            })

            events.emit('connectionavailable')
        })

        async function getAvailability() {
            const availability = await presentationRequest.getAvailability()

            console.log('Available presentation displays: ' + availability.value)

            availability.addEventListener('change', function () {
                console.log('> Available presentation displays: ' + availability.value)
                events.emit('availability', availability.value)
            })
        }

        async function start() {
            const connection = await presentationRequest.start()
        }

        function close() {
            presentationConnection.terminate()
            presentationConnection = null
        }

        function sendMsg(msg) {
            //console.log('sendMsg', msg)
            presentationConnection.send(JSON.stringify(msg))
        }

        function setUrl(url) {
            sendMsg({ type: 'url', url })
        }

        function setVolume(volume) {
            sendMsg({ type: 'volume', volume })
        }

        function play() {
            sendMsg({type: 'play'})
        }

        function pause() {
            sendMsg({type: 'pause'})
        }

        function isStarted() {
            return (presentationConnection != null)
        }

        function enableKaraoke(enabled) {
            sendMsg({type: 'enableKaraoke', enabled})
        }

        getAvailability()

        return {
            on: events.on.bind(events),
            start,
            close,
            isStarted,
            setUrl,
            setVolume,
            play,
            pause,
            enableKaraoke
        }
    }
});
