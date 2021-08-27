
//@ts-check

const Alexa = require('ask-sdk-core')

const util = require('./util.js')

const { domain } = require('../lib/config.js')

const PlayAction = {
    START: 'Start',
    NEXT: 'Next',
    PREV: 'Prev',
    RESUME: 'Resume'
}

function getIndex(songs, token) {
    return songs.findIndex((item) => {
        return (item._id == token)
    })
}

/**
 * 
 * @param {import('ask-sdk-core').HandlerInput} handlerInput 
 * @returns 
 */
async function getCurrentSong(handlerInput) {
    const { inPlayback, token, songs } = await util.getPersistentAttributes(handlerInput)

    if (inPlayback === true && token != undefined) {
        const index = getIndex(songs, token)
        return songs[index]
    }
    return null

}

/**
 *  
 * @param {import('ask-sdk-core').HandlerInput} handlerInput 
 * @param {string} playAction
 * @param {Boolean} enQueue
 */
async function playSong(handlerInput, playAction, enQueue = false) {

    const { responseBuilder, requestEnvelope } = handlerInput

    const attributes = await util.getPersistentAttributes(handlerInput)

    const { token, songs, action, shuffleIndexes, offsetInMilliseconds } = attributes

    let index = 0
    
    if (playAction != PlayAction.START) {
        index = getIndex(songs, token)

        if (shuffleIndexes) {
            index = shuffleIndexes.indexOf(index)
        }
    }

    if (playAction == PlayAction.NEXT) {

        if (index < songs.length - 1) {
            index++
        }
        else {
            if (!enQueue) {
                responseBuilder
                    .addAudioPlayerStopDirective()
                    .speak('Vous avez atteint la fin de la liste')
            }        
            return responseBuilder.getResponse()        
        }
    }
    else if (playAction == PlayAction.PREV) {

        if (index > 0) {
            index--
        }
        else {
            return responseBuilder
                .addAudioPlayerStopDirective()
                .speak('Vous avez atteint le début de la liste')
                .getResponse()    
        }
    }

    if (shuffleIndexes) {
        index = shuffleIndexes[index]
    }

    console.log('index', index)
    const { artist, title, _id } = songs[index]
    console.log('playSong', artist, title, playAction)
    
    const url = `https://${domain}/alexa/${action}/${_id}`

    const playBehavior = (enQueue) ? 'ENQUEUE' : 'REPLACE_ALL'

    const type = Alexa.getRequestType(requestEnvelope)

    if (!enQueue && !type.startsWith('PlaybackController.')) {
        responseBuilder.withSimpleCard(artist, title)
    }

    return responseBuilder
        .addAudioPlayerPlayDirective(playBehavior, url, _id, (playAction == PlayAction.RESUME) ? offsetInMilliseconds : 0, (enQueue) ? token: null)
        .getResponse()
    
}




/**
 * 
 * @param {import('ask-sdk-core').HandlerInput} handlerInput 
 * @returns 
 */
function stopPlayback(handlerInput) {
    return handlerInput.responseBuilder
        .addAudioPlayerStopDirective()
        .getResponse()

}

/**
 * 
 * @param {import('ask-sdk-core').HandlerInput} handlerInput 
 * @param {*} songs 
 * @param {*} action 
 * @param {*} shuffleIndexes 
 */
async function initAttributes(handlerInput, songs, action, shuffleIndexes) {
    const attributes = await util.getPersistentAttributes(handlerInput)
    attributes.songs = songs
    attributes.action = action
    attributes.shuffleIndexes = shuffleIndexes
}


module.exports = {
    stopPlayback,
    playSong,
    getCurrentSong,
    initAttributes,
    PlayAction
    
}