
$$.service.registerService('app.emuAgc', {

    deps: ['breizbot.files'],

    init: function (config) {

        const set_fixed = Module.cwrap('set_fixed', null, ['number'])
        const reset = Module.cwrap('cpu_reset')
        const stepCpu = Module.cwrap('cpu_step', null, ['number'])
        const packetRead = Module.cwrap('packet_read', 'number')
        const writeIo = Module.cwrap('packet_write', null, ['number', 'number'])
        const get_erasable_ptr = Module.cwrap('get_erasable_ptr', 'number')

        const events = new EventEmitter2()

        const cycleMs = 0.01172 // 11.72 microseconds per AGC instruction


        const state = {
            channels: {},
            lamps: 0
        }

        let startTime = 0
        let totalSteps = 0
        let erasableArray = null

        function getErasable() {
            if (!erasableArray) {
                const ptr = get_erasable_ptr()
                console.log('getErable', ptr)
                erasableArray = new Uint16Array(Module.HEAP8.buffer, ptr, 2048)
            }
            return erasableArray
        }


        function readIo(channel) {
            console.log('io', state.channels)
            return state.channels[channel]
        }

        async function loadRom(url) {
            const response = await fetch(url)
            const binary = await response.arrayBuffer()

            const romArray = new Uint8Array(binary)
            console.log('romArray', romArray.length)
            const romPtr = Module._malloc(romArray.length * romArray.BYTES_PER_ELEMENT)
            console.log('romPtr', romPtr)

            Module.HEAP8.set(romArray, romPtr)
            set_fixed(romPtr)
            Module._free(romPtr)
        }

        function start() {
            startTime = performance.now()
			totalSteps = 0

        }

        function loop() {
            const targetSteps = Math.floor((performance.now() - startTime) / cycleMs)
            const diffSteps = targetSteps - totalSteps
            //console.log('diffSteps', diffSteps)
            if (diffSteps < 0 || diffSteps > 100000) {
                // No matter which cause, prevent hanging due to high step counts due to integer overflows.
                startTime = performance.now()
                totalSteps = 0
                return
            }
            stepCpu(diffSteps)
            totalSteps += diffSteps
            readAllIo()            
        }


        function readAllIo() {
            let channel
            let value

            do {
                const data = packetRead()
                const channel = data >> 16
                const value = data & 0xffff                
                const previousValue = state.channels[channel]

                if (previousValue != value) {
                    state.channels[channel] = value
                    //console.log('readIo', channel.toString(8), value)
                    events.emit('channelUpdate', {channel, value})
                }
                if (channel === 0o11) {
                    const bitmask = 0b110
                    // Bit 2: COMP ACTY
                    // Bit 3: UPLINK ACTY
                    state.lamps = (state.lamps & (~bitmask >>> 0)) | (value & bitmask)
                    events.emit('lightsUpdate', state.lamps)
            
                }
                else if (channel === 0o163) {
                    // Fictitious port for blinking lights - apparently an emulation of hardware square-wave
                    // modulation of some signals, external to the AGC. yaAGC kindly supplies these signals to
                    // us already modulated.
                    // See https://www.ibiblio.org/apollo/developer.html
                    const bitmask = 0b111111000;
                    // console.log('blinking lamps', this.state.lamps);
                    state.lamps = (state.lamps & (~bitmask >>> 0)) | (value & bitmask);

                    events.emit('lightsUpdate', state.lamps)
                }


            } while (channel || value)

        }

        function bitMask(n) {
            return 1 << (n-1)
        }

        const lampMask = {
            COMP_ACTY   : bitMask(2),
            UPLINK_ACTY : bitMask(3),
            TEMP        : bitMask(4),
            KEY_REL     : bitMask(5),
            VERB_NOUN   : bitMask(6),
            OPER_ERR    : bitMask(7),
            RESTART     : bitMask(8),
            STBY        : bitMask(9)
        }

        const statusMask = {
            PRIO_DISP   : bitMask(1),
            NO_DAP      : bitMask(2),
            VEL         : bitMask(3),
            NO_ATT     : bitMask(4),
            ALT         : bitMask(5),
            GIMBAL_LOCK : bitMask(6),
            TRACKER     : bitMask(8),
            PROG        : bitMask(9)
        }

        return {
            writeIo,
            readIo,
            loadRom,
            reset,
            stepCpu,
            on: events.on.bind(events),
            start,
            loop,
            getErasable,
            lampMask,
            statusMask
        }

    }
})


