//@ts-check

$$.service.registerService('AudioTools', {

    init: function() {

        const audioCtx = new AudioContext()

        /**
         * 
         * @param {AudioNode} source1 
         * @param {AudioNode} source2 
         */
        function createStereoMerger(source1, source2) {
            const splitter1 = audioCtx.createChannelSplitter(2)
            source1.connect(splitter1)
            const splitter2 = audioCtx.createChannelSplitter(2)
            source2.connect(splitter2)
            
            const merger = audioCtx.createChannelMerger(4)
            splitter1.connect(merger, 0, 0)
            splitter1.connect(merger, 1, 1)
            splitter2.connect(merger, 0, 2)
            splitter2.connect(merger, 1, 3)  
            
            return merger
        }

        /**
         * 
         * @param {number} channelCount 
         * @param {AudioNode} inputNode 
         */
        function createDestination(channelCount, inputNode) {
            const dest = audioCtx.createMediaStreamDestination()
            dest.channelCount = channelCount
            const audio = new Audio()
            //await audio.setSinkId(audioDevice[0].deviceId)
            audio.srcObject = dest.stream
            inputNode.connect(dest)
            audio.play()            
        }

        function createMediaSource(audio) {
            return audioCtx.createMediaElementSource(audio)
        }

        /**
         * 
         * @param {AudioNode} source1 
         * @param {AudioNode} source2 
         */
        function createCrossFaderWithMasterLevel(source1, source2) {
            const gain1 = audioCtx.createGain()
            gain1.gain.value = 0.5
            source1.connect(gain1)

            const gain2 = audioCtx.createGain()
            gain2.gain.value = 0.5
            source2.connect(gain2)

            const masterGain = audioCtx.createGain()
            masterGain.gain.value = 0.5

            gain1.connect(masterGain)
            gain2.connect(masterGain)


            function setFaderLevel(value) {
                gain2.gain.value = Math.cos((1.0 - value) * 0.5 * Math.PI)
                gain1.gain.value = Math.cos(value * 0.5 * Math.PI)
            }

            function setMasterLevel(value) {
                masterGain.gain.value = value
            }
            return {
                setFaderLevel,
                setMasterLevel,
                getOutputNode: function() {
                    return masterGain
                }
            }

        }

        return {
            createStereoMerger,
            createDestination,
            createMediaSource,
            createCrossFaderWithMasterLevel
        }
    }
});
