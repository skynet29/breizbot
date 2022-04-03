//@ts-check
$$.service.registerService('breizbot.gamepad', {

    init: function (config) {

        const event = new EventEmitter2()

        window.addEventListener('gamepadconnected', (ev) => {
            //console.log('gamepadconnected', ev)
            event.emit('connected', ev.gamepad)
        })

        window.addEventListener('gamepaddisconnected', (ev) => {
            //console.log('gamepaddisconnected', ev)

            event.emit('disconnected', ev.gamepad)
        })

        return {
            on: event.on.bind(event),
            getGamepads: function() {
                return navigator.getGamepads()
            }
        }
    }
});
