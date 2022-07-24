//@ts-check

self.onmessage = function (ev) {
    console.log('Message received:', ev.data)
    const {channelData, sampleRate} = ev.data
    const info = guess(channelData, sampleRate)
    console.log('tempoInfo', info)
    self.postMessage(info)
}

// Function to identify peaks

/**
 * 
 * @param {Float32Array} data 
 * @param {number} threshold 
 * @param {number} sampleRate
 * @returns 
 */
function getPeaksAtThreshold(data, threshold, sampleRate) {
    console.log('getPeaksAtThreshold', threshold)
    const peaksArray = [];
    const length = data.length;
    for (let i = 0; i < length;) {
        if (data[i] > threshold) {
            peaksArray.push(i);
            // Skip forward ~ 1/4s to get past this peak.
            i += sampleRate / 4 - 1;
        }
        i++;
    }
    return peaksArray;
}

// Function used to return a histogram of peak intervals

/**
 * 
 * @param {Array<number>} peaks 
 * @returns {Array<{interval: number, peaks: Array<number>}>}
 */
function countIntervalsBetweenNearbyPeaks(peaks) {
    //console.log('countIntervalsBetweenNearbyPeaks', peaks)
    const intervalCounts = [];
    peaks.forEach((peak, index) => {
        const length = Math.min(peaks.length - index, 10)

        for (let i = 1; i < length; i++) {
            const interval = peaks[index + i] - peak;
            //console.log('interval', interval)
            const foundInterval = intervalCounts.some((intervalCount) => {
                if (intervalCount.interval === interval) {
                    intervalCount.peaks.push(peak)
                    console.log('interval', intervalCount)
                    return true
                }
                return false
            });
            //console.log('foundInterval', foundInterval)
            if (!foundInterval) {
                //console.log('addInterval', interval)
                intervalCounts.push({
                    interval,
                    peaks: [peak]
                });
            }
        }
    });
    return intervalCounts;
}


function trunc(val) {
    return Math.trunc(val * 10) / 10
}
// Function used to return a histogram of tempo candidates.
/**
 * 
 * @param {Array<{interval: number, peaks: Array<number>}} intervalBuckets 
 * @param {number} sampleRate 
 * @returns 
 */
function groupNeighborsByTempo(intervalBuckets, sampleRate) {
    //console.log('groupNeighborsByTempo', intervalBuckets)

    /**@type {Array<{score: number, tempo: number, peaks: Array<number>}>} */
    const tempoBuckets = []
    
    intervalBuckets.forEach((intervalBucket, i) => {
        // Convert an interval to tempo
        //console.log(i, intervalBucket)
        let theoreticalTempo = 60 / (intervalBucket.interval / sampleRate);
        //console.log('theoreticalTempo', theoreticalTempo)

        // Adjust the tempo to fit within the 90-180 BPM range
        while (theoreticalTempo < 90) theoreticalTempo *= 2;
        while (theoreticalTempo > 160) theoreticalTempo /= 2;

        //theoreticalTempo = trunc(theoreticalTempo)

        //console.log('theoreticalTempo', theoreticalTempo)

        let score = intervalBucket.peaks.length
        let foundTempo = false

        tempoBuckets.forEach((tempoBucket) => {
            if (tempoBucket.tempo === theoreticalTempo) {
                tempoBucket.score += intervalBucket.peaks.length;
                tempoBucket.peaks = tempoBucket.peaks.concat(intervalBucket.peaks)
                foundTempo = true
            }

            if (tempoBucket.tempo > theoreticalTempo - 0.5 && tempoBucket.tempo < theoreticalTempo + 0.5) {
                const tempoDifference = Math.abs(tempoBucket.tempo - theoreticalTempo) * 2;

                const scoreInc = (1 - tempoDifference) * tempoBucket.peaks.length;
                score += scoreInc
                tempoBucket.score += scoreInc
            }

        });

        if (!foundTempo) {
            tempoBuckets.push({
                tempo: theoreticalTempo,
                score,
                peaks: intervalBucket.peaks
            });
        }
    });

    console.log('tempoBuckets', tempoBuckets)
    return tempoBuckets
}


function getMaximumValue(channelData) {
    let maximumValue = 0;

    const length = channelData.length;

    for (let i = 0; i < length; i += 1) {
        if (channelData[i] > maximumValue) {
            maximumValue = channelData[i];
        }
    }

    return maximumValue;
};

const MINUMUM_NUMBER_OF_PEAKS = 30



function computeTempoBuckets(channelData, sampleRate) {
    const maximumValue = getMaximumValue(channelData);
    console.log('maximumValue', maximumValue)
    const minimumThreshold = maximumValue * 0.3;

    let peaks = [];
    let threshold = maximumValue - maximumValue * 0.05;
    console.log('threshold', threshold)

    if (maximumValue > 0.25) {
        while (peaks.length < MINUMUM_NUMBER_OF_PEAKS && threshold >= minimumThreshold) {
            peaks = getPeaksAtThreshold(channelData, threshold, sampleRate);
            console.log('peaks length', peaks.length)
            threshold -= maximumValue * 0.05;
        }
    }

    const intervalBuckets = countIntervalsBetweenNearbyPeaks(peaks);
    const tempoBuckets = groupNeighborsByTempo(intervalBuckets, sampleRate);

    tempoBuckets.sort((a, b) => b.score - a.score);

    return tempoBuckets;
}

function guess(channelData, sampleRate) {
    const tempoBuckets = computeTempoBuckets(channelData, sampleRate);

    if (tempoBuckets.length === 0) {
        throw new Error('The given channelData does not contain any detectable beats.');
    }

    const { peaks, tempo } = tempoBuckets[0];
    const bpm = Math.round(tempo);
    const secondsPerBeat = 60 / bpm;

    peaks.sort((a, b) => a - b);

    let offset = peaks[0] / sampleRate;

    while (offset > secondsPerBeat) {
        offset -= secondsPerBeat;
    }

    return {
        bpm,
        offset,
        tempo
    };    
}