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
    return parseFloat(val.toFixed(2))
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

        theoreticalTempo = trunc(theoreticalTempo)

        //console.log('theoreticalTempo', theoreticalTempo)

        let score = intervalBucket.peaks.length
        let foundTempo = false

        tempoBuckets.forEach((tempoBucket) => {
            if (Math.abs(tempoBucket.tempo - theoreticalTempo) < 0.1) {
                tempoBucket.score += intervalBucket.peaks.length;
                tempoBucket.peaks = tempoBucket.peaks.concat(intervalBucket.peaks)
                foundTempo = true
            }

            // if (tempoBucket.tempo > theoreticalTempo - 0.5 && tempoBucket.tempo < theoreticalTempo + 0.5) {
            //     const tempoDifference = Math.abs(tempoBucket.tempo - theoreticalTempo) * 2;

            //     const scoreInc = (1 - tempoDifference) * tempoBucket.peaks.length;
            //     score += scoreInc
            //     tempoBucket.score += scoreInc
            // }

        });

        if (!foundTempo) {
            tempoBuckets.push({
                tempo: theoreticalTempo,
                score,
                peaks: intervalBucket.peaks
            });
        }
    });

    //console.log('tempoBuckets', tempoBuckets)
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImJlYXRkZXRlY3Rvci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYmVhdGRldGVjdG9yLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy9AdHMtY2hlY2tcblxuc2VsZi5vbm1lc3NhZ2UgPSBmdW5jdGlvbiAoZXYpIHtcbiAgICBjb25zb2xlLmxvZygnTWVzc2FnZSByZWNlaXZlZDonLCBldi5kYXRhKVxuICAgIGNvbnN0IHtjaGFubmVsRGF0YSwgc2FtcGxlUmF0ZX0gPSBldi5kYXRhXG4gICAgY29uc3QgaW5mbyA9IGd1ZXNzKGNoYW5uZWxEYXRhLCBzYW1wbGVSYXRlKVxuICAgIGNvbnNvbGUubG9nKCd0ZW1wb0luZm8nLCBpbmZvKVxuICAgIHNlbGYucG9zdE1lc3NhZ2UoaW5mbylcbn1cblxuLy8gRnVuY3Rpb24gdG8gaWRlbnRpZnkgcGVha3NcblxuLyoqXG4gKiBcbiAqIEBwYXJhbSB7RmxvYXQzMkFycmF5fSBkYXRhIFxuICogQHBhcmFtIHtudW1iZXJ9IHRocmVzaG9sZCBcbiAqIEBwYXJhbSB7bnVtYmVyfSBzYW1wbGVSYXRlXG4gKiBAcmV0dXJucyBcbiAqL1xuZnVuY3Rpb24gZ2V0UGVha3NBdFRocmVzaG9sZChkYXRhLCB0aHJlc2hvbGQsIHNhbXBsZVJhdGUpIHtcbiAgICBjb25zb2xlLmxvZygnZ2V0UGVha3NBdFRocmVzaG9sZCcsIHRocmVzaG9sZClcbiAgICBjb25zdCBwZWFrc0FycmF5ID0gW107XG4gICAgY29uc3QgbGVuZ3RoID0gZGF0YS5sZW5ndGg7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW5ndGg7KSB7XG4gICAgICAgIGlmIChkYXRhW2ldID4gdGhyZXNob2xkKSB7XG4gICAgICAgICAgICBwZWFrc0FycmF5LnB1c2goaSk7XG4gICAgICAgICAgICAvLyBTa2lwIGZvcndhcmQgfiAxLzRzIHRvIGdldCBwYXN0IHRoaXMgcGVhay5cbiAgICAgICAgICAgIGkgKz0gc2FtcGxlUmF0ZSAvIDQgLSAxO1xuICAgICAgICB9XG4gICAgICAgIGkrKztcbiAgICB9XG4gICAgcmV0dXJuIHBlYWtzQXJyYXk7XG59XG5cbi8vIEZ1bmN0aW9uIHVzZWQgdG8gcmV0dXJuIGEgaGlzdG9ncmFtIG9mIHBlYWsgaW50ZXJ2YWxzXG5cbi8qKlxuICogXG4gKiBAcGFyYW0ge0FycmF5PG51bWJlcj59IHBlYWtzIFxuICogQHJldHVybnMge0FycmF5PHtpbnRlcnZhbDogbnVtYmVyLCBwZWFrczogQXJyYXk8bnVtYmVyPn0+fVxuICovXG5mdW5jdGlvbiBjb3VudEludGVydmFsc0JldHdlZW5OZWFyYnlQZWFrcyhwZWFrcykge1xuICAgIC8vY29uc29sZS5sb2coJ2NvdW50SW50ZXJ2YWxzQmV0d2Vlbk5lYXJieVBlYWtzJywgcGVha3MpXG4gICAgY29uc3QgaW50ZXJ2YWxDb3VudHMgPSBbXTtcbiAgICBwZWFrcy5mb3JFYWNoKChwZWFrLCBpbmRleCkgPT4ge1xuICAgICAgICBjb25zdCBsZW5ndGggPSBNYXRoLm1pbihwZWFrcy5sZW5ndGggLSBpbmRleCwgMTApXG5cbiAgICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgaW50ZXJ2YWwgPSBwZWFrc1tpbmRleCArIGldIC0gcGVhaztcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ2ludGVydmFsJywgaW50ZXJ2YWwpXG4gICAgICAgICAgICBjb25zdCBmb3VuZEludGVydmFsID0gaW50ZXJ2YWxDb3VudHMuc29tZSgoaW50ZXJ2YWxDb3VudCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChpbnRlcnZhbENvdW50LmludGVydmFsID09PSBpbnRlcnZhbCkge1xuICAgICAgICAgICAgICAgICAgICBpbnRlcnZhbENvdW50LnBlYWtzLnB1c2gocGVhaylcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2ludGVydmFsJywgaW50ZXJ2YWxDb3VudClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ2ZvdW5kSW50ZXJ2YWwnLCBmb3VuZEludGVydmFsKVxuICAgICAgICAgICAgaWYgKCFmb3VuZEludGVydmFsKSB7XG4gICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnYWRkSW50ZXJ2YWwnLCBpbnRlcnZhbClcbiAgICAgICAgICAgICAgICBpbnRlcnZhbENvdW50cy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgaW50ZXJ2YWwsXG4gICAgICAgICAgICAgICAgICAgIHBlYWtzOiBbcGVha11cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBpbnRlcnZhbENvdW50cztcbn1cblxuXG5mdW5jdGlvbiB0cnVuYyh2YWwpIHtcbiAgICByZXR1cm4gcGFyc2VGbG9hdCh2YWwudG9GaXhlZCgyKSlcbn1cbi8vIEZ1bmN0aW9uIHVzZWQgdG8gcmV0dXJuIGEgaGlzdG9ncmFtIG9mIHRlbXBvIGNhbmRpZGF0ZXMuXG4vKipcbiAqIFxuICogQHBhcmFtIHtBcnJheTx7aW50ZXJ2YWw6IG51bWJlciwgcGVha3M6IEFycmF5PG51bWJlcj59fSBpbnRlcnZhbEJ1Y2tldHMgXG4gKiBAcGFyYW0ge251bWJlcn0gc2FtcGxlUmF0ZSBcbiAqIEByZXR1cm5zIFxuICovXG5mdW5jdGlvbiBncm91cE5laWdoYm9yc0J5VGVtcG8oaW50ZXJ2YWxCdWNrZXRzLCBzYW1wbGVSYXRlKSB7XG4gICAgLy9jb25zb2xlLmxvZygnZ3JvdXBOZWlnaGJvcnNCeVRlbXBvJywgaW50ZXJ2YWxCdWNrZXRzKVxuXG4gICAgLyoqQHR5cGUge0FycmF5PHtzY29yZTogbnVtYmVyLCB0ZW1wbzogbnVtYmVyLCBwZWFrczogQXJyYXk8bnVtYmVyPn0+fSAqL1xuICAgIGNvbnN0IHRlbXBvQnVja2V0cyA9IFtdXG4gICAgXG4gICAgaW50ZXJ2YWxCdWNrZXRzLmZvckVhY2goKGludGVydmFsQnVja2V0LCBpKSA9PiB7XG4gICAgICAgIC8vIENvbnZlcnQgYW4gaW50ZXJ2YWwgdG8gdGVtcG9cbiAgICAgICAgLy9jb25zb2xlLmxvZyhpLCBpbnRlcnZhbEJ1Y2tldClcbiAgICAgICAgbGV0IHRoZW9yZXRpY2FsVGVtcG8gPSA2MCAvIChpbnRlcnZhbEJ1Y2tldC5pbnRlcnZhbCAvIHNhbXBsZVJhdGUpO1xuICAgICAgICAvL2NvbnNvbGUubG9nKCd0aGVvcmV0aWNhbFRlbXBvJywgdGhlb3JldGljYWxUZW1wbylcblxuICAgICAgICAvLyBBZGp1c3QgdGhlIHRlbXBvIHRvIGZpdCB3aXRoaW4gdGhlIDkwLTE4MCBCUE0gcmFuZ2VcbiAgICAgICAgd2hpbGUgKHRoZW9yZXRpY2FsVGVtcG8gPCA5MCkgdGhlb3JldGljYWxUZW1wbyAqPSAyO1xuICAgICAgICB3aGlsZSAodGhlb3JldGljYWxUZW1wbyA+IDE2MCkgdGhlb3JldGljYWxUZW1wbyAvPSAyO1xuXG4gICAgICAgIHRoZW9yZXRpY2FsVGVtcG8gPSB0cnVuYyh0aGVvcmV0aWNhbFRlbXBvKVxuXG4gICAgICAgIC8vY29uc29sZS5sb2coJ3RoZW9yZXRpY2FsVGVtcG8nLCB0aGVvcmV0aWNhbFRlbXBvKVxuXG4gICAgICAgIGxldCBzY29yZSA9IGludGVydmFsQnVja2V0LnBlYWtzLmxlbmd0aFxuICAgICAgICBsZXQgZm91bmRUZW1wbyA9IGZhbHNlXG5cbiAgICAgICAgdGVtcG9CdWNrZXRzLmZvckVhY2goKHRlbXBvQnVja2V0KSA9PiB7XG4gICAgICAgICAgICBpZiAoTWF0aC5hYnModGVtcG9CdWNrZXQudGVtcG8gLSB0aGVvcmV0aWNhbFRlbXBvKSA8IDAuMSkge1xuICAgICAgICAgICAgICAgIHRlbXBvQnVja2V0LnNjb3JlICs9IGludGVydmFsQnVja2V0LnBlYWtzLmxlbmd0aDtcbiAgICAgICAgICAgICAgICB0ZW1wb0J1Y2tldC5wZWFrcyA9IHRlbXBvQnVja2V0LnBlYWtzLmNvbmNhdChpbnRlcnZhbEJ1Y2tldC5wZWFrcylcbiAgICAgICAgICAgICAgICBmb3VuZFRlbXBvID0gdHJ1ZVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBpZiAodGVtcG9CdWNrZXQudGVtcG8gPiB0aGVvcmV0aWNhbFRlbXBvIC0gMC41ICYmIHRlbXBvQnVja2V0LnRlbXBvIDwgdGhlb3JldGljYWxUZW1wbyArIDAuNSkge1xuICAgICAgICAgICAgLy8gICAgIGNvbnN0IHRlbXBvRGlmZmVyZW5jZSA9IE1hdGguYWJzKHRlbXBvQnVja2V0LnRlbXBvIC0gdGhlb3JldGljYWxUZW1wbykgKiAyO1xuXG4gICAgICAgICAgICAvLyAgICAgY29uc3Qgc2NvcmVJbmMgPSAoMSAtIHRlbXBvRGlmZmVyZW5jZSkgKiB0ZW1wb0J1Y2tldC5wZWFrcy5sZW5ndGg7XG4gICAgICAgICAgICAvLyAgICAgc2NvcmUgKz0gc2NvcmVJbmNcbiAgICAgICAgICAgIC8vICAgICB0ZW1wb0J1Y2tldC5zY29yZSArPSBzY29yZUluY1xuICAgICAgICAgICAgLy8gfVxuXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICghZm91bmRUZW1wbykge1xuICAgICAgICAgICAgdGVtcG9CdWNrZXRzLnB1c2goe1xuICAgICAgICAgICAgICAgIHRlbXBvOiB0aGVvcmV0aWNhbFRlbXBvLFxuICAgICAgICAgICAgICAgIHNjb3JlLFxuICAgICAgICAgICAgICAgIHBlYWtzOiBpbnRlcnZhbEJ1Y2tldC5wZWFrc1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vY29uc29sZS5sb2coJ3RlbXBvQnVja2V0cycsIHRlbXBvQnVja2V0cylcbiAgICByZXR1cm4gdGVtcG9CdWNrZXRzXG59XG5cblxuZnVuY3Rpb24gZ2V0TWF4aW11bVZhbHVlKGNoYW5uZWxEYXRhKSB7XG4gICAgbGV0IG1heGltdW1WYWx1ZSA9IDA7XG5cbiAgICBjb25zdCBsZW5ndGggPSBjaGFubmVsRGF0YS5sZW5ndGg7XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgIGlmIChjaGFubmVsRGF0YVtpXSA+IG1heGltdW1WYWx1ZSkge1xuICAgICAgICAgICAgbWF4aW11bVZhbHVlID0gY2hhbm5lbERhdGFbaV07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbWF4aW11bVZhbHVlO1xufTtcblxuY29uc3QgTUlOVU1VTV9OVU1CRVJfT0ZfUEVBS1MgPSAzMFxuXG5cblxuZnVuY3Rpb24gY29tcHV0ZVRlbXBvQnVja2V0cyhjaGFubmVsRGF0YSwgc2FtcGxlUmF0ZSkge1xuICAgIGNvbnN0IG1heGltdW1WYWx1ZSA9IGdldE1heGltdW1WYWx1ZShjaGFubmVsRGF0YSk7XG4gICAgY29uc29sZS5sb2coJ21heGltdW1WYWx1ZScsIG1heGltdW1WYWx1ZSlcbiAgICBjb25zdCBtaW5pbXVtVGhyZXNob2xkID0gbWF4aW11bVZhbHVlICogMC4zO1xuXG4gICAgbGV0IHBlYWtzID0gW107XG4gICAgbGV0IHRocmVzaG9sZCA9IG1heGltdW1WYWx1ZSAtIG1heGltdW1WYWx1ZSAqIDAuMDU7XG4gICAgY29uc29sZS5sb2coJ3RocmVzaG9sZCcsIHRocmVzaG9sZClcblxuICAgIGlmIChtYXhpbXVtVmFsdWUgPiAwLjI1KSB7XG4gICAgICAgIHdoaWxlIChwZWFrcy5sZW5ndGggPCBNSU5VTVVNX05VTUJFUl9PRl9QRUFLUyAmJiB0aHJlc2hvbGQgPj0gbWluaW11bVRocmVzaG9sZCkge1xuICAgICAgICAgICAgcGVha3MgPSBnZXRQZWFrc0F0VGhyZXNob2xkKGNoYW5uZWxEYXRhLCB0aHJlc2hvbGQsIHNhbXBsZVJhdGUpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ3BlYWtzIGxlbmd0aCcsIHBlYWtzLmxlbmd0aClcbiAgICAgICAgICAgIHRocmVzaG9sZCAtPSBtYXhpbXVtVmFsdWUgKiAwLjA1O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgaW50ZXJ2YWxCdWNrZXRzID0gY291bnRJbnRlcnZhbHNCZXR3ZWVuTmVhcmJ5UGVha3MocGVha3MpO1xuICAgIGNvbnN0IHRlbXBvQnVja2V0cyA9IGdyb3VwTmVpZ2hib3JzQnlUZW1wbyhpbnRlcnZhbEJ1Y2tldHMsIHNhbXBsZVJhdGUpO1xuXG4gICAgdGVtcG9CdWNrZXRzLnNvcnQoKGEsIGIpID0+IGIuc2NvcmUgLSBhLnNjb3JlKTtcblxuICAgIHJldHVybiB0ZW1wb0J1Y2tldHM7XG59XG5cbmZ1bmN0aW9uIGd1ZXNzKGNoYW5uZWxEYXRhLCBzYW1wbGVSYXRlKSB7XG4gICAgY29uc3QgdGVtcG9CdWNrZXRzID0gY29tcHV0ZVRlbXBvQnVja2V0cyhjaGFubmVsRGF0YSwgc2FtcGxlUmF0ZSk7XG5cbiAgICBpZiAodGVtcG9CdWNrZXRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoZSBnaXZlbiBjaGFubmVsRGF0YSBkb2VzIG5vdCBjb250YWluIGFueSBkZXRlY3RhYmxlIGJlYXRzLicpO1xuICAgIH1cblxuICAgIGNvbnN0IHsgcGVha3MsIHRlbXBvIH0gPSB0ZW1wb0J1Y2tldHNbMF07XG4gICAgY29uc3QgYnBtID0gTWF0aC5yb3VuZCh0ZW1wbyk7XG4gICAgY29uc3Qgc2Vjb25kc1BlckJlYXQgPSA2MCAvIGJwbTtcblxuICAgIHBlYWtzLnNvcnQoKGEsIGIpID0+IGEgLSBiKTtcblxuICAgIGxldCBvZmZzZXQgPSBwZWFrc1swXSAvIHNhbXBsZVJhdGU7XG5cbiAgICB3aGlsZSAob2Zmc2V0ID4gc2Vjb25kc1BlckJlYXQpIHtcbiAgICAgICAgb2Zmc2V0IC09IHNlY29uZHNQZXJCZWF0O1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICAgIGJwbSxcbiAgICAgICAgb2Zmc2V0LFxuICAgICAgICB0ZW1wb1xuICAgIH07ICAgIFxufSJdfQ==
