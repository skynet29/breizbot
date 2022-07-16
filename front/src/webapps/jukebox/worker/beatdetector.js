self.onmessage = function (ev) {
    console.log('Message received:', ev.data)
    const {channelData, sampleRate} = ev.data
    const tempos = computeTempo(channelData, sampleRate)
    console.log('tempos', tempos)
    self.postMessage(tempos[0])
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
 * @returns {Array<{interval: number, count: number}>}
 */
function countIntervalsBetweenNearbyPeaks(peaks) {
    console.log('countIntervalsBetweenNearbyPeaks', peaks)
    const intervalCounts = [];
    peaks.forEach((peak, index) => {
        const length = Math.min(peaks.length - index, 10)

        for (let i = 1; i < length; i++) {
            const interval = peaks[index + i] - peak;
            //console.log('interval', interval)
            const foundInterval = intervalCounts.some((intervalCount) => {
                if (intervalCount.interval === interval) {
                    intervalCount.count++
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
                    count: 1
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

function groupNeighborsByTempo(intervalCounts, sampleRate) {
    console.log('groupNeighborsByTempo', intervalCounts)

    const tempoCounts = []
    intervalCounts.forEach((intervalCount, i) => {
        // Convert an interval to tempo
        console.log(i, intervalCount)
        let theoreticalTempo = 60 / (intervalCount.interval / sampleRate);
        console.log('theoreticalTempo', theoreticalTempo)

        // Adjust the tempo to fit within the 90-180 BPM range
        while (theoreticalTempo < 90) theoreticalTempo *= 2;
        while (theoreticalTempo > 160) theoreticalTempo /= 2;

        theoreticalTempo = trunc(theoreticalTempo)

        console.log('theoreticalTempo', theoreticalTempo)


        const foundTempo = tempoCounts.some((tempoCount) => {
            if (tempoCount.tempo === theoreticalTempo)
                return tempoCount.count += intervalCount.count;
        });
        if (!foundTempo) {
            tempoCounts.push({
                tempo: theoreticalTempo,
                count: intervalCount.count
            });
        }
    });

    return tempoCounts
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


function computeTempo(channelData, sampleRate) {
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

    tempoBuckets.sort((a, b) => b.count - a.count);

    return tempoBuckets;
}