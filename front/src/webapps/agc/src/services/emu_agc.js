
$$.service.registerService('app.emuAgc', {

    deps: ['breizbot.files'],

    init: function (config) {

        const set_fixed = Module.cwrap('set_fixed', null, ['number'])
        const reset = Module.cwrap('cpu_reset')
        const stepCpu = Module.cwrap('cpu_step', null, ['number'])
        const packetRead = Module.cwrap('packet_read', 'number')
        const packetWrite = Module.cwrap('packet_write', null, ['number', 'number'])
        const get_erasable_ptr = Module.cwrap('get_erasable_ptr', 'number')

        const cycleMs = 0.01172 // 11.72 microseconds per AGC instruction


        let startTime = 0
        let totalSteps = 0
        let erasablePtr = null

        const channels = {
            0o30: 0b011110011011001,
            0o31: 0b111111111111111,
            0o32: 0b010001111111111,
            0o33: 0b111111111111110
        }

        function writeIo(channel, value, mask) {
            if (mask != undefined) {
                packetWrite(channel + 256, mask) // set mask bit 15
            }
            packetWrite(channel, value)
        }

        function writeIoBit(channel, nbit, value) {
            console.log('writeIoBit', channel.toString(8), nbit, value)
            const mask = bitMask(nbit)
            if( value == 0) {
                channels[channel] &= ~mask
            }
            else {
                channels[channel] |= mask
            }
            writeIo(channel, (value == 0) ? 0 : mask, mask)
        }        

        function peek(offset) {
            const ret = Module.getValue(erasablePtr + offset * 2, 'i16') & 0x7fff
            //console.log('peek', {offset, ret})
            return ret
        }

        function poke(offset, value) {
            //console.log('poke', {offset, value})
            Module.setValue(erasablePtr + offset * 2, value, 'i16')
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
            erasablePtr = get_erasable_ptr()
            console.log('erasablePtr', erasablePtr)
        }

        function start() {
            reset();
            [5, 6].forEach((chan) => {
                channels[chan] = 0
            })
            startTime = performance.now()
			totalSteps = 0

        }

        function run() {
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
            //readAllIo()            
        }

        function bit(val, n) {
            n--
            return (val >> n) & 1
        }

        function getChannelState(channel) {
            return channels[channel]
        }

        function logChannelState(channel) {
            const channelOctal = parseInt(channel).toString(8).padStart('3', '0')
            console.log(`channel[${channelOctal}] = ` + channels[channel].toString(2).padStart(15, '0'))
        }

        function logAllChannelState() {
            Object.keys(channels).forEach((channel) => {
                logChannelState(channel)
            })
        }

        function getChannelBitState(channel, nbit) {
            return bit(channels[channel], nbit)
        }

        function readIo() {
            let ret = null
            const data = packetRead()
            if (data) {
                const channel = data >> 16 
                const value = data & 0xffff

                channels[channel] = value
                ret = {channel, value}
            }
            return ret
        }


        function bitMask(n) {
            return 1 << (n-1)
        }

        function bit(val, n) {
            n--
            return ((val >> n) & 1) == 1
        }

        const inputsMask = {
            LIFTOFF     : bitMask(5),
            ISS_TURN_ON : bitMask(14),
            PROCEED     : bitMask(14)
        }

        const outputsMask = {
            ZERO_IMU    : bitMask(5)
        }

        return {
            writeIo,
            writeIoBit,
            loadRom,
            start,
            run,
            readIo,
            peek,
            poke,
            getChannelState,
            getChannelBitState,
            bitMask,
            bit,
            logChannelState,
            logAllChannelState,
            inputsMask,
            outputsMask
        }

    }
})


