self.onmessage = function (ev) {
    console.log('Message received:', ev.data)
    const {channelData, sampleRate} = ev.data
    const tempos = computeTempo(channelData, sampleRate)
    console.log('tempos', tempos)
    self.postMessage({tempo: tempos[0].tempo})
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImJlYXRkZXRlY3Rvci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJ3b3JrZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJzZWxmLm9ubWVzc2FnZSA9IGZ1bmN0aW9uIChldikge1xuICAgIGNvbnNvbGUubG9nKCdNZXNzYWdlIHJlY2VpdmVkOicsIGV2LmRhdGEpXG4gICAgY29uc3Qge2NoYW5uZWxEYXRhLCBzYW1wbGVSYXRlfSA9IGV2LmRhdGFcbiAgICBjb25zdCB0ZW1wb3MgPSBjb21wdXRlVGVtcG8oY2hhbm5lbERhdGEsIHNhbXBsZVJhdGUpXG4gICAgY29uc29sZS5sb2coJ3RlbXBvcycsIHRlbXBvcylcbiAgICBzZWxmLnBvc3RNZXNzYWdlKHt0ZW1wbzogdGVtcG9zWzBdLnRlbXBvfSlcbn1cblxuLy8gRnVuY3Rpb24gdG8gaWRlbnRpZnkgcGVha3NcblxuLyoqXG4gKiBcbiAqIEBwYXJhbSB7RmxvYXQzMkFycmF5fSBkYXRhIFxuICogQHBhcmFtIHtudW1iZXJ9IHRocmVzaG9sZCBcbiAqIEBwYXJhbSB7bnVtYmVyfSBzYW1wbGVSYXRlXG4gKiBAcmV0dXJucyBcbiAqL1xuZnVuY3Rpb24gZ2V0UGVha3NBdFRocmVzaG9sZChkYXRhLCB0aHJlc2hvbGQsIHNhbXBsZVJhdGUpIHtcbiAgICBjb25zb2xlLmxvZygnZ2V0UGVha3NBdFRocmVzaG9sZCcsIHRocmVzaG9sZClcbiAgICBjb25zdCBwZWFrc0FycmF5ID0gW107XG4gICAgY29uc3QgbGVuZ3RoID0gZGF0YS5sZW5ndGg7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW5ndGg7KSB7XG4gICAgICAgIGlmIChkYXRhW2ldID4gdGhyZXNob2xkKSB7XG4gICAgICAgICAgICBwZWFrc0FycmF5LnB1c2goaSk7XG4gICAgICAgICAgICAvLyBTa2lwIGZvcndhcmQgfiAxLzRzIHRvIGdldCBwYXN0IHRoaXMgcGVhay5cbiAgICAgICAgICAgIGkgKz0gc2FtcGxlUmF0ZSAvIDQgLSAxO1xuICAgICAgICB9XG4gICAgICAgIGkrKztcbiAgICB9XG4gICAgcmV0dXJuIHBlYWtzQXJyYXk7XG59XG5cbi8vIEZ1bmN0aW9uIHVzZWQgdG8gcmV0dXJuIGEgaGlzdG9ncmFtIG9mIHBlYWsgaW50ZXJ2YWxzXG5cbi8qKlxuICogXG4gKiBAcGFyYW0ge0FycmF5PG51bWJlcj59IHBlYWtzIFxuICogQHJldHVybnMge0FycmF5PHtpbnRlcnZhbDogbnVtYmVyLCBjb3VudDogbnVtYmVyfT59XG4gKi9cbmZ1bmN0aW9uIGNvdW50SW50ZXJ2YWxzQmV0d2Vlbk5lYXJieVBlYWtzKHBlYWtzKSB7XG4gICAgY29uc29sZS5sb2coJ2NvdW50SW50ZXJ2YWxzQmV0d2Vlbk5lYXJieVBlYWtzJywgcGVha3MpXG4gICAgY29uc3QgaW50ZXJ2YWxDb3VudHMgPSBbXTtcbiAgICBwZWFrcy5mb3JFYWNoKChwZWFrLCBpbmRleCkgPT4ge1xuICAgICAgICBjb25zdCBsZW5ndGggPSBNYXRoLm1pbihwZWFrcy5sZW5ndGggLSBpbmRleCwgMTApXG5cbiAgICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgaW50ZXJ2YWwgPSBwZWFrc1tpbmRleCArIGldIC0gcGVhaztcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ2ludGVydmFsJywgaW50ZXJ2YWwpXG4gICAgICAgICAgICBjb25zdCBmb3VuZEludGVydmFsID0gaW50ZXJ2YWxDb3VudHMuc29tZSgoaW50ZXJ2YWxDb3VudCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChpbnRlcnZhbENvdW50LmludGVydmFsID09PSBpbnRlcnZhbCkge1xuICAgICAgICAgICAgICAgICAgICBpbnRlcnZhbENvdW50LmNvdW50KytcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2ludGVydmFsJywgaW50ZXJ2YWxDb3VudClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ2ZvdW5kSW50ZXJ2YWwnLCBmb3VuZEludGVydmFsKVxuICAgICAgICAgICAgaWYgKCFmb3VuZEludGVydmFsKSB7XG4gICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnYWRkSW50ZXJ2YWwnLCBpbnRlcnZhbClcbiAgICAgICAgICAgICAgICBpbnRlcnZhbENvdW50cy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgaW50ZXJ2YWwsXG4gICAgICAgICAgICAgICAgICAgIGNvdW50OiAxXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gaW50ZXJ2YWxDb3VudHM7XG59XG5cblxuZnVuY3Rpb24gdHJ1bmModmFsKSB7XG4gICAgcmV0dXJuIE1hdGgudHJ1bmModmFsICogMTApIC8gMTBcbn1cbi8vIEZ1bmN0aW9uIHVzZWQgdG8gcmV0dXJuIGEgaGlzdG9ncmFtIG9mIHRlbXBvIGNhbmRpZGF0ZXMuXG5cbmZ1bmN0aW9uIGdyb3VwTmVpZ2hib3JzQnlUZW1wbyhpbnRlcnZhbENvdW50cywgc2FtcGxlUmF0ZSkge1xuICAgIGNvbnNvbGUubG9nKCdncm91cE5laWdoYm9yc0J5VGVtcG8nLCBpbnRlcnZhbENvdW50cylcblxuICAgIGNvbnN0IHRlbXBvQ291bnRzID0gW11cbiAgICBpbnRlcnZhbENvdW50cy5mb3JFYWNoKChpbnRlcnZhbENvdW50LCBpKSA9PiB7XG4gICAgICAgIC8vIENvbnZlcnQgYW4gaW50ZXJ2YWwgdG8gdGVtcG9cbiAgICAgICAgY29uc29sZS5sb2coaSwgaW50ZXJ2YWxDb3VudClcbiAgICAgICAgbGV0IHRoZW9yZXRpY2FsVGVtcG8gPSA2MCAvIChpbnRlcnZhbENvdW50LmludGVydmFsIC8gc2FtcGxlUmF0ZSk7XG4gICAgICAgIGNvbnNvbGUubG9nKCd0aGVvcmV0aWNhbFRlbXBvJywgdGhlb3JldGljYWxUZW1wbylcblxuICAgICAgICAvLyBBZGp1c3QgdGhlIHRlbXBvIHRvIGZpdCB3aXRoaW4gdGhlIDkwLTE4MCBCUE0gcmFuZ2VcbiAgICAgICAgd2hpbGUgKHRoZW9yZXRpY2FsVGVtcG8gPCA5MCkgdGhlb3JldGljYWxUZW1wbyAqPSAyO1xuICAgICAgICB3aGlsZSAodGhlb3JldGljYWxUZW1wbyA+IDE2MCkgdGhlb3JldGljYWxUZW1wbyAvPSAyO1xuXG4gICAgICAgIHRoZW9yZXRpY2FsVGVtcG8gPSB0cnVuYyh0aGVvcmV0aWNhbFRlbXBvKVxuXG4gICAgICAgIGNvbnNvbGUubG9nKCd0aGVvcmV0aWNhbFRlbXBvJywgdGhlb3JldGljYWxUZW1wbylcblxuXG4gICAgICAgIGNvbnN0IGZvdW5kVGVtcG8gPSB0ZW1wb0NvdW50cy5zb21lKCh0ZW1wb0NvdW50KSA9PiB7XG4gICAgICAgICAgICBpZiAodGVtcG9Db3VudC50ZW1wbyA9PT0gdGhlb3JldGljYWxUZW1wbylcbiAgICAgICAgICAgICAgICByZXR1cm4gdGVtcG9Db3VudC5jb3VudCArPSBpbnRlcnZhbENvdW50LmNvdW50O1xuICAgICAgICB9KTtcbiAgICAgICAgaWYgKCFmb3VuZFRlbXBvKSB7XG4gICAgICAgICAgICB0ZW1wb0NvdW50cy5wdXNoKHtcbiAgICAgICAgICAgICAgICB0ZW1wbzogdGhlb3JldGljYWxUZW1wbyxcbiAgICAgICAgICAgICAgICBjb3VudDogaW50ZXJ2YWxDb3VudC5jb3VudFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiB0ZW1wb0NvdW50c1xufVxuXG5cbmZ1bmN0aW9uIGdldE1heGltdW1WYWx1ZShjaGFubmVsRGF0YSkge1xuICAgIGxldCBtYXhpbXVtVmFsdWUgPSAwO1xuXG4gICAgY29uc3QgbGVuZ3RoID0gY2hhbm5lbERhdGEubGVuZ3RoO1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICBpZiAoY2hhbm5lbERhdGFbaV0gPiBtYXhpbXVtVmFsdWUpIHtcbiAgICAgICAgICAgIG1heGltdW1WYWx1ZSA9IGNoYW5uZWxEYXRhW2ldO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG1heGltdW1WYWx1ZTtcbn07XG5cbmNvbnN0IE1JTlVNVU1fTlVNQkVSX09GX1BFQUtTID0gMzBcblxuXG5mdW5jdGlvbiBjb21wdXRlVGVtcG8oY2hhbm5lbERhdGEsIHNhbXBsZVJhdGUpIHtcbiAgICBjb25zdCBtYXhpbXVtVmFsdWUgPSBnZXRNYXhpbXVtVmFsdWUoY2hhbm5lbERhdGEpO1xuICAgIGNvbnNvbGUubG9nKCdtYXhpbXVtVmFsdWUnLCBtYXhpbXVtVmFsdWUpXG4gICAgY29uc3QgbWluaW11bVRocmVzaG9sZCA9IG1heGltdW1WYWx1ZSAqIDAuMztcblxuICAgIGxldCBwZWFrcyA9IFtdO1xuICAgIGxldCB0aHJlc2hvbGQgPSBtYXhpbXVtVmFsdWUgLSBtYXhpbXVtVmFsdWUgKiAwLjA1O1xuICAgIGNvbnNvbGUubG9nKCd0aHJlc2hvbGQnLCB0aHJlc2hvbGQpXG5cbiAgICBpZiAobWF4aW11bVZhbHVlID4gMC4yNSkge1xuICAgICAgICB3aGlsZSAocGVha3MubGVuZ3RoIDwgTUlOVU1VTV9OVU1CRVJfT0ZfUEVBS1MgJiYgdGhyZXNob2xkID49IG1pbmltdW1UaHJlc2hvbGQpIHtcbiAgICAgICAgICAgIHBlYWtzID0gZ2V0UGVha3NBdFRocmVzaG9sZChjaGFubmVsRGF0YSwgdGhyZXNob2xkLCBzYW1wbGVSYXRlKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdwZWFrcyBsZW5ndGgnLCBwZWFrcy5sZW5ndGgpXG4gICAgICAgICAgICB0aHJlc2hvbGQgLT0gbWF4aW11bVZhbHVlICogMC4wNTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IGludGVydmFsQnVja2V0cyA9IGNvdW50SW50ZXJ2YWxzQmV0d2Vlbk5lYXJieVBlYWtzKHBlYWtzKTtcbiAgICBjb25zdCB0ZW1wb0J1Y2tldHMgPSBncm91cE5laWdoYm9yc0J5VGVtcG8oaW50ZXJ2YWxCdWNrZXRzLCBzYW1wbGVSYXRlKTtcblxuICAgIHRlbXBvQnVja2V0cy5zb3J0KChhLCBiKSA9PiBiLmNvdW50IC0gYS5jb3VudCk7XG5cbiAgICByZXR1cm4gdGVtcG9CdWNrZXRzO1xufSJdfQ==
