
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

        const masks = {
            0o30: 0b111111111111111,
            0o31: 0b111111111111111,
            0o32: 0b010001111111111,
            0o33: 0b111111111111110

        }

        const channels = {
            0o30: 0b011110011011001,
            0o31: 0b111111111111111,
            0o32: 0b010001111111111,
            0o33: 0b101111111111110
        }

        function writeIo(channel, value, mask) {
            channel = parseInt(channel)
            // if (mask) {
            //     console.log('writeIo', channel.toString(8), value.toString(2).padStart(15, '0'),
            //      mask.toString(2).padStart(15, '0'))
            // }
            // else {
            //     console.log('writeIo', channel.toString(8), value)
            // }
            if (mask != undefined) {
                packetWrite(channel + 256, mask) // set mask bit 15
            }
            packetWrite(channel, value)
        }

        function setBit(varia, nbit, value) {
            const mask = bitMask(nbit)
            if (value == 0) {
                varia &= ~mask
            }
            else {
                varia |= mask
            }
            return varia

        }

        function writeIoBits(channel, bits) {
            let mask = 0
            let value = 0
            if (Object.keys(bits).length == 0) return
            //console.log('writeIoBits', channel.toString(8), bits)
            Object.entries(bits).forEach(([nbit, val]) => {
                mask = setBit(mask, nbit, 1)
                value = setBit(value, nbit, val)
                channels[channel] = setBit(channels[channel], nbit, val)
            })
            // console.log('mask ', mask.toString(2).padStart(15, '0'))
            // console.log('value', value.toString(2).padStart(15, '0'))
            console.log(`chan[${channel.toString(8).padStart(3, '0')}]=` + channels[channel].toString(2).padStart(15, '0'))

            writeIo(channel, value, mask)

        }

        function writeIoBit(channel, nbit, value) {
            const data = {}
            data[nbit] = value
            writeIoBits(channel, data)
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
            console.log('start')
            reset();

            setTimeout(()=>{
                Object.entries(channels).forEach(([chan, val]) => {
                    const mask = masks[chan]
                    writeIo(chan, val, mask)
                })
                
                const sets = [0o5, 0o6, 0o14]
                sets.forEach((chan) => {
                    channels[chan] = 0
                })
    
            }, 100)
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
            return (val >> (n-1)) & 1
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
                ret = { channel, value }
            }
            return ret
        }


        function bitMask(n) {
            return 1 << (n - 1)
        }

        return {
            writeIo,
            writeIoBit,
            writeIoBits,
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
            logAllChannelState
        }

    }
})


