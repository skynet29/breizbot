//@ts-check
$$.service.registerService('breizbot.gamepad', {

    init: function (config) {

        const event = new EventEmitter2()

        let buttons = []
        let axes = []

        window.addEventListener('gamepadconnected', (ev) => {
            //console.log('gamepadconnected', ev)
            for(const {pressed} of ev.gamepad.buttons) {
                buttons.push(pressed)
            }

            for(const val of ev.gamepad.axes) {
                axes.push(val)
            }
            //console.log('buttons', buttons)
            event.emit('connected', ev.gamepad)
        })

        window.addEventListener('gamepaddisconnected', (ev) => {
            //console.log('gamepaddisconnected', ev)

            event.emit('disconnected', ev.gamepad)
        })

        function checkGamePadStatus() {
			const info = navigator.getGamepads()[0]
			if (info) {
                for(let i = 0; i < buttons.length; i++) {
                    const {pressed} = info.buttons[i]
                    if (pressed != buttons[i]) {
                        event.emit(pressed ? 'buttonDown' : 'buttonUp', {id : i})
                        buttons[i] = pressed
                    }
                }
                for(let i = 0; i < axes.length; i++) {
                    const value = info.axes[i]
                    if( value != axes[i]) {
                        event.emit('axe', {id: i, value})
                        axes[i] = value
                    }
                }
				setTimeout(checkGamePadStatus, 50)
			}
		}

        return {
            on: event.on.bind(event),
            getGamepads: function() {
                return navigator.getGamepads()
            },
            checkGamePadStatus
        }
    }
});
