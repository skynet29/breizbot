//@ts-check
(function () {

    class MyGamepad extends EventEmitter2 {
        constructor() {
            super()

            this.buttons = []
            this.axes = []

            window.addEventListener('gamepadconnected', (ev) => {
                //console.log('gamepadconnected', ev)
                for (const { pressed } of ev.gamepad.buttons) {
                    this.buttons.push(pressed)
                }

                for (const val of ev.gamepad.axes) {
                    this.axes.push(val)
                }
                //console.log('buttons', buttons)
                this.emit('connected', ev.gamepad)
            })

            window.addEventListener('gamepaddisconnected', (ev) => {
                //console.log('gamepaddisconnected', ev)
                this.buttons = []
                this.axes = []

                this.emit('disconnected', ev.gamepad)
            })
        }

        checkGamePadStatus() {
            const info = navigator.getGamepads()[0]
            if (info) {
                for (let i = 0; i < this.buttons.length; i++) {
                    const { pressed } = info.buttons[i]
                    if (pressed != this.buttons[i]) {
                        this.emit(pressed ? 'buttonDown' : 'buttonUp', { id: i })
                        this.buttons[i] = pressed
                    }
                }
                for (let i = 0; i < this.axes.length; i++) {
                    const value = info.axes[i]
                    if (value != this.axes[i]) {
                        this.emit('axe', { id: i, value })
                        this.axes[i] = value
                    }
                }
                setTimeout(this.checkGamePadStatus.bind(this), 50)
            }
        }

        getButtonState(buttonId) {
            return navigator.getGamepads()[0].buttons[buttonId].pressed
        }

        getAxeValue(axeId) {
            return navigator.getGamepads()[0].axes[axeId]
        }

        getGamepads() {
            return navigator.getGamepads()
        }
    }


    $$.service.registerService('breizbot.gamepad', {

        init: function (config) {

            return new MyGamepad()
        }
    });

})();


