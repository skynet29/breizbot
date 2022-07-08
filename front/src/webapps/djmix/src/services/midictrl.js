//@ts-check


$$.service.registerService('MIDICtrl', {

    init: function (config) {

        const BtnIntensity = {
            MAX: 0x7F,
            MIN: 0x01,
            OFF: 0x00,
            ON: 0x01
        }

        const midiInputMapping = [
            { action: 'MASTER_LEVEL', cmd: 0xBF, note: 0X0A },
            { action: 'CUE_LEVEL', cmd: 0xBF, note: 0X0C },
            { action: 'CROSS_FADER', cmd: 0xBF, note: 0X08 },
            { action: 'LEVEL', cmd: 0xB0, note: 0X16, deck: 1 },
            { action: 'PITCH', cmd: 0xB0, note: 0X19, deck: 1 },
            { action: 'LEVEL', cmd: 0xB1, note: 0X16, deck: 2 },
            { action: 'PITCH', cmd: 0xB1, note: 0X19, deck: 2 },

            { action: 'SYNC', cmd: 0x90, note: 0X02, deck: 1, type: 'BTN' },
            { action: 'CUE', cmd: 0x90, note: 0X01, deck: 1, type: 'BTN' },
            { action: 'PLAY', cmd: 0x90, note: 0X00, deck: 1, type: 'BTN' },
            { action: 'PFL', cmd: 0x90, note: 0X1B, deck: 1, type: 'BTN2' },
            { action: 'JOGTOUCH', cmd: 0x90, note: 0X06, deck: 1 },

            { action: 'SYNC', cmd: 0x91, note: 0X02, deck: 2, type: 'BTN' },
            { action: 'CUE', cmd: 0x91, note: 0X01, deck: 2, type: 'BTN' },
            { action: 'PLAY', cmd: 0x91, note: 0X00, deck: 2, type: 'BTN' },
            { action: 'PFL', cmd: 0x91, note: 0X1B, deck: 2, type: 'BTN2' },
            { action: 'JOGTOUCH', cmd: 0x91, note: 0X06, deck: 2 },

            { action: 'LOAD', cmd: 0x9F, note: 0X02, deck: 1 },
            { action: 'LOAD', cmd: 0x9F, note: 0X03, deck: 2 },
            { action: 'ENTER', cmd: 0x9F, note: 0X06 },

            { action: 'JOG_WHEEL', cmd: 0xB0, note: 0X06, deck: 1 },
            { action: 'JOG_WHEEL', cmd: 0xB1, note: 0X06, deck: 2 },
            { action: 'BROWSE_WHEEL', cmd: 0xBF, note: 0X00 },

            { action: 'HOT_CUE', cmd: 0x94, note: 0X01, deck: 1, key: 1, type: 'BTN' },
            { action: 'HOT_CUE', cmd: 0x94, note: 0X02, deck: 1, key: 2, type: 'BTN' },
            { action: 'HOT_CUE', cmd: 0x94, note: 0X03, deck: 1, key: 3, type: 'BTN' },
            { action: 'HOT_CUE', cmd: 0x94, note: 0X04, deck: 1, key: 4, type: 'BTN' },

            { action: 'HOT_CUE', cmd: 0x95, note: 0X01, deck: 2, key: 1, type: 'BTN' },
            { action: 'HOT_CUE', cmd: 0x95, note: 0X02, deck: 2, key: 2, type: 'BTN' },
            { action: 'HOT_CUE', cmd: 0x95, note: 0X03, deck: 2, key: 3, type: 'BTN' },
            { action: 'HOT_CUE', cmd: 0x95, note: 0X04, deck: 2, key: 4, type: 'BTN' },


            { action: 'LOOP_AUTO', cmd: 0x94, note: 0X11, deck: 1, key: 1, type: 'BTN' },
            { action: 'LOOP_AUTO', cmd: 0x94, note: 0X12, deck: 1, key: 2, type: 'BTN' },
            { action: 'LOOP_AUTO', cmd: 0x94, note: 0X13, deck: 1, key: 3, type: 'BTN' },
            { action: 'LOOP_AUTO', cmd: 0x94, note: 0X14, deck: 1, key: 4, type: 'BTN' },

            { action: 'LOOP_AUTO', cmd: 0x95, note: 0X11, deck: 2, key: 1, type: 'BTN' },
            { action: 'LOOP_AUTO', cmd: 0x95, note: 0X12, deck: 2, key: 2, type: 'BTN' },
            { action: 'LOOP_AUTO', cmd: 0x95, note: 0X13, deck: 2, key: 3, type: 'BTN' },
            { action: 'LOOP_AUTO', cmd: 0x95, note: 0X14, deck: 2, key: 4, type: 'BTN' },

            { action: 'LOOP_MANUAL', cmd: 0x94, note: 0X21, deck: 1, key: 1, type: 'BTN' },
            { action: 'LOOP_MANUAL', cmd: 0x94, note: 0X22, deck: 1, key: 2, type: 'BTN' },
            { action: 'LOOP_MANUAL', cmd: 0x94, note: 0X23, deck: 1, key: 3, type: 'BTN' },
            { action: 'LOOP_MANUAL', cmd: 0x94, note: 0X24, deck: 1, key: 4, type: 'BTN' },

            { action: 'LOOP_MANUAL', cmd: 0x95, note: 0X21, deck: 2, key: 1, type: 'BTN' },
            { action: 'LOOP_MANUAL', cmd: 0x95, note: 0X22, deck: 2, key: 2, type: 'BTN' },
            { action: 'LOOP_MANUAL', cmd: 0x95, note: 0X23, deck: 2, key: 3, type: 'BTN' },
            { action: 'LOOP_MANUAL', cmd: 0x95, note: 0X24, deck: 2, key: 4, type: 'BTN' },

            { action: 'SAMPLER', cmd: 0x94, note: 0X31, deck: 1, key: 1, type: 'BTN' },
            { action: 'SAMPLER', cmd: 0x94, note: 0X32, deck: 1, key: 2, type: 'BTN' },
            { action: 'SAMPLER', cmd: 0x94, note: 0X33, deck: 1, key: 3, type: 'BTN' },
            { action: 'SAMPLER', cmd: 0x94, note: 0X34, deck: 1, key: 4, type: 'BTN' },

            { action: 'SAMPLER', cmd: 0x95, note: 0X31, deck: 2, key: 1, type: 'BTN' },
            { action: 'SAMPLER', cmd: 0x95, note: 0X32, deck: 2, key: 2, type: 'BTN' },
            { action: 'SAMPLER', cmd: 0x95, note: 0X33, deck: 2, key: 3, type: 'BTN' },
            { action: 'SAMPLER', cmd: 0x95, note: 0X34, deck: 2, key: 4, type: 'BTN' },

        ]


        function getActionDesc(data) {
            const [cmd, note] = data
            for (const e of midiInputMapping) {
                if (e.cmd == cmd && e.note == note) {
                    return e
                }
            }
            return null
        }

        const events = new EventEmitter2()

        /**@type {MIDIAccess} */
        let midiAccess = null

        /**@type {MIDIInput} */
        let midiIn = null
        /**@type {MIDIOutput} */
        let midiOut = null


        async function requestMIDIAccess() {
            midiAccess = await navigator.requestMIDIAccess()
            const midiInputs = []
            for (const { name, id } of midiAccess.inputs.values()) {
                midiInputs.push({ label: name, value: id })
            }
            const midiOutputs = []
            for (const { name, id } of midiAccess.outputs.values()) {
                midiOutputs.push({ label: name, value: id })
            }

            return { midiInputs, midiOutputs }
        }

        function selectMIDIInput(selectedId) {
            if (midiIn) {
                midiIn.onmidimessage = null
            }
            for (const input of midiAccess.inputs.values()) {
                if (input.id == selectedId) {
                    midiIn = input
                    midiIn.onmidimessage = onMidiMessage
                    return
                }
            }
        }

        function selectMIDIOutput(selectedId) {
            for (const output of midiAccess.outputs.values()) {
                if (output.id == selectedId) {
                    midiOut = output
                    break;
                }
            }
        }

        function clearAllButtons() {
            for (const { cmd, note, type } of midiInputMapping) {
                if (type == 'BTN' || type == 'BTN2') {
                    midiOut.send([cmd, note, type == 'BTN' ? BtnIntensity.MIN : BtnIntensity.OFF])
                }
            }
        }

        function setButtonIntensity(action, intensity, deck, key) {
            for (const e of midiInputMapping) {
                let ret = (e.action == action)
                if (deck != undefined) {
                    ret &= (e.deck == deck)
                }
                if (key != undefined) {
                    ret &= (e.key == key)
                }
                if (ret) {
                    midiOut.send([e.cmd, e.note, intensity])
                }
            }

        }

        function onMidiMessage(ev) {
            const [cmd, note, velocity] = ev.data
            //console.log('onMidiMessage', cmd.toString(16), note.toString(16), velocity)
            const desc = getActionDesc(ev.data)

            if (desc != null) {
                const { action, deck, key } = desc
                events.emit(action, { deck, key, velocity })
            }

        }

        return {
            selectMIDIInput,
            selectMIDIOutput,
            clearAllButtons,
            setButtonIntensity,
            requestMIDIAccess,
            on: events.on.bind(events),
            BtnIntensity
        }
    }
});
