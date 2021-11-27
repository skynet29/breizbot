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
                console.log('message', event.data)
                const msg = JSON.parse(event.data)
                if (msg.type == 'ready') {
                    events.emit('ready')
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

        function setUrl(url) {
            console.log('setUrl', url)
            presentationConnection.send(JSON.stringify({ type: 'url', url }))
        }

        function isStarted() {
            return (presentationConnection != null)
        }


        getAvailability()

        return {
            on: events.on.bind(events),
            start,
            close,
            isStarted,
            setUrl
        }
    }
});
