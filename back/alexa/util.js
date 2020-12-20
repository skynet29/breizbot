//@ts-check

const Alexa = require('ask-sdk-core')


function knuthShuffle(length) {
    //console.log('knuthShuffle', length)
    let arr = []
    for (let k = 0; k < length; k++) {
        arr.push(k)
    }

    var rand, temp, i;

    for (i = arr.length - 1; i > 0; i -= 1) {
        rand = Math.floor((i + 1) * Math.random());//get random between zero and i (inclusive)
        temp = arr[rand];//swap i and the zero-indexed number
        arr[rand] = arr[i];
        arr[i] = temp;
    }
    return arr;
}

/**
 * @param {string} intentName
 */
function isIntentRequest(handlerInput, intentName) {
    const { request } = handlerInput.requestEnvelope
    return (request.type === 'IntentRequest' && request.intent.name === intentName)
}

/**
 * @param {string} cmdName
 */
function isPlaybackControllerCmd(handlerInput, cmdName) {
    const { request } = handlerInput.requestEnvelope
    return (request.type === `PlaybackController.${cmdName}`)
}

function isAudioPlayerEvent(handlerInput) {
    const { request } = handlerInput.requestEnvelope

    return request.type.startsWith('AudioPlayer.')
}

function getAudioPlayerEventName(handlerInput) {
    const { request } = handlerInput.requestEnvelope

    return request.type.split('.')[1]
}

async function getPersistentAttributes(handlerInput) {
    let { attributes } = handlerInput
    if (attributes == undefined) {
        attributes = await handlerInput.attributesManager.getPersistentAttributes()
        handlerInput.attributes = attributes
    }
    return attributes
}

function getSlotValue(handlerInput, slotName) {
    return Alexa.getSlotValue(handlerInput.requestEnvelope, slotName)
}

function getUserName(handlerInput) {
    const { userName } = handlerInput.attributesManager.getSessionAttributes()
    return userName
}

function getConsentToken(handlerInput) {
    const { permissions } = handlerInput.requestEnvelope.context.System.user

    return permissions && permissions.consentToken
}


module.exports = {
    knuthShuffle,
    isIntentRequest,
    isPlaybackControllerCmd,
    isAudioPlayerEvent,
    getAudioPlayerEventName,
    getPersistentAttributes,
    getSlotValue,
    getUserName,
    getConsentToken
}