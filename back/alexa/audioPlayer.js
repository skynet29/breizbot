
//@ts-check

const Alexa = require('ask-sdk-core')

const { domain } = require('../lib/config.js')

function getIndex(songs, token) {
    return songs.findIndex((item) => {
        return (item._id == token)
    })
}


function getCurrentSong(attributes) {
    const { inPlayback, token, songs } = attributes

    if (inPlayback === true && token != undefined) {
        const index = getIndex(songs, token)
        return songs[index]
    }
    return null

}

function playSong(handlerInput, song, options) {
    options = options || {}
    const offsetInMilliseconds = options.offsetInMilliseconds || 0
    const prevToken = options.prevToken || null
    const action = options.action || 'music'

    const { responseBuilder, requestEnvelope } = handlerInput
    const { artist, title, _id } = song
    console.log('playSong', artist, title, options)
    const newToken = _id
    const url = `https://${domain}/alexa/${action}/${newToken}`
    //console.log('url', url)
    const playBehavior = (prevToken == null) ? 'REPLACE_ALL' : 'ENQUEUE'
    const type = Alexa.getRequestType(requestEnvelope)

    if (prevToken == null && !type.startsWith('PlaybackController.')) {
        responseBuilder.withSimpleCard(artist, title)
    }

    return responseBuilder
        .addAudioPlayerPlayDirective(playBehavior, url, newToken, offsetInMilliseconds, prevToken)
        .getResponse()

}

function playPrevious(handlerInput, attributes) {
    const { responseBuilder } = handlerInput

    const { token, songs, action, shuffleIndexes } = attributes

    let index = getIndex(songs, token)
    console.log('index', index)

    if (shuffleIndexes) {
        index = shuffleIndexes.indexOf(index)
        console.log('index', index)
        
    }

    if (index > 0) {
        let prevIndex = index - 1
        if (shuffleIndexes) {
            prevIndex = shuffleIndexes[prevIndex]
        }
        return playSong(handlerInput, songs[prevIndex], { action })
    }

    return responseBuilder
        .addAudioPlayerStopDirective()
        .speak('Vous avez atteint le début de la liste')
        .getResponse()

}

function playNext(handlerInput, attributes, enQueue = false) {
    console.log('playNext', enQueue)

    const { responseBuilder } = handlerInput

    const { token, songs, action, shuffleIndexes } = attributes

    let index = getIndex(songs, token)
    console.log('index', index)


    if (shuffleIndexes) {
        index = shuffleIndexes.indexOf(index)       
        console.log('index', index)
 
    }

    if (index < songs.length - 1) {
        let nextIndex = index + 1
        if (shuffleIndexes) {
            nextIndex = shuffleIndexes[nextIndex]
        }
        return playSong(handlerInput, songs[nextIndex], { prevToken: (enQueue) ? token : null, action })
    }

    attributes.isLast = true

    if (!enQueue) {
        responseBuilder.addAudioPlayerStopDirective()
        responseBuilder.speak('Vous avez atteint la fin de la liste')
    }

    return responseBuilder.getResponse()

}

function stopPlayback(handlerInput) {
    return handlerInput.responseBuilder
        .addAudioPlayerStopDirective()
        .getResponse()

}

async function initAttributes(handlerInput, songs, action, shuffleIndexes) {
    const attributes = await handlerInput.attributesManager.getPersistentAttributes()
    attributes.songs = songs
    attributes.action = action
    attributes.shuffleIndexes = shuffleIndexes
}


module.exports = {
    stopPlayback,
    playNext,
    playPrevious,
    playSong,
    getCurrentSong,
    initAttributes
}