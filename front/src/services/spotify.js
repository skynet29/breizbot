//@ts-check
$$.service.registerService('breizbot.spotify', {

    init: function (config) {

        const baseUri = 'https://api.spotify.com/v1'
        const baseTokenUri = 'https://spotify-web-api-token.herokuapp.com'
        let token = null

        async function performRequest(url, params) {
            //console.log('performRequest', url, params)
            let ret = null
            const request = {
                method: 'GET'
            }
            if (token == null) {
                const rep = await fetch(baseTokenUri + '/token')
                if (!rep.ok) {
                    throw 'spotify fetch token error'
                }

                const json = await rep.json()
                //console.log('json', json)
                token = json.token
                console.log('token', token)

            }
            const headers = new Headers()
            headers.append('Authorization', 'Bearer ' + token)
            request.headers = headers

            const rep = await fetch($$.url.getUrlParams(url, params), request)
            if (rep.ok) {
                ret = await rep.json()
            }
            return ret
        }


        async function searchTracks(query) {
            console.log('searchTracks', query)
            const params = {
                q: query,
                type: 'track',
                limit: 1
            }
            const results = await performRequest(baseUri + '/search/', params)
            console.log('results', results)
            const track = results.tracks.items[0]
            return track
        }

        function getAudioFeaturesForTrack(trackId) {
            return performRequest(baseUri + '/audio-features/' + trackId)
        }

        return {
            searchTracks,
            getAudioFeaturesForTrack
        }
    }
});
