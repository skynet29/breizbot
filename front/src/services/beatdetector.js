//@ts-check
$$.service.registerService('breizbot.beatdetector', {

	init: function(config) {

        if (typeof config.workerPath != 'string') {
            throw 'beatdetector worker path is not defined'
        }
        
        const worker = new Worker(config.workerPath)        

        function computeBeatDetection(audioBuffer) {

            return new Promise(async (resolve) => {

                const sampleRate = audioBuffer.sampleRate
                const offlineContext = new OfflineAudioContext(1, audioBuffer.length, sampleRate)

                // Create buffer source
                const source = offlineContext.createBufferSource()
                source.buffer = audioBuffer

                // Create filter
                const filter = offlineContext.createBiquadFilter()
                filter.type = "lowpass"
                filter.frequency.value = 240

                // Pipe the song into the filter, and the filter into the offline context
                source.connect(filter)
                filter.connect(offlineContext.destination)

                // Schedule the song to start playing at time:0
                source.start(0);

                // Render the song
                offlineContext.startRendering()

                // Act on the result
                offlineContext.oncomplete = function (e) {
                    // Filtered buffer!
                    const channelData = e.renderedBuffer.getChannelData(0)
                    worker.postMessage({ channelData, sampleRate })
                    worker.onmessage = function (ev) {
                        resolve(ev.data)
                    }
                }
            })
        }        

		return  {
            computeBeatDetection
		}

	}


});






