class CallbackEmitter {
    constructor() {
        this.callbacks = []
    }

    /**
     * 
     * @param {(data) => boolean} callback 
     */
    on(callback) {
        this.callbacks.push(callback)
    }

    emit(data) {
        let i = this.callbacks.length

        while (i--) {
            const callback = this.callbacks[i]
            if (callback(data)) {
                this.callbacks.splice(i, 1)
            }
        }
    }
}

module.exports = CallbackEmitter