class KaraokeProcessor extends AudioWorkletProcessor {
    constructor() {
        super()
    }

    process(inputs, outputs, parameters) {
        console.log('inputs', inputs.length)
        const inputL = inputs[0]
        const inputR = inputs[1]
        const output = outputs[0]
        for (let i = 0; i < inputL.length; i++) {
            output[i] = inputL[i] - inputR[i]
        }
        return true
    }
}

registerProcessor('karaoke-processor', KaraokeProcessor)
