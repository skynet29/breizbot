const Alexa = require('ask-sdk-core')
const AmazonSpeech = require('ssml-builder/amazon_speech')

const db = require('../lib/db.js')
const { getPersistenceAdapter } = require('./persistence.js')
const { domain } = require('../lib/config.js')
const { buildDbId, collection } = require('../lib/dbUtil.js')
const util = require('../lib/util.js')

const OS = { word: 'OS', interpret: 'characters' }
const USER_NOT_REGISTERD = 'User not registered'
const SKILL_NOT_LINKED = 'Skill not linked'


function getIndex(songs, token) {
    return songs.findIndex((item) => {
        return (item._id == token)
    })
}


const PlayRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
            Alexa.getIntentName(handlerInput.requestEnvelope) === 'PlayIntent'
    },
    async handle(handlerInput) {
        const { requestEnvelope, attributesManager, responseBuilder } = handlerInput
        const { userName } = attributesManager.getSessionAttributes()
        //console.log('userName', userName)

        const song = Alexa.getSlotValue(requestEnvelope, 'song')
        const artist = Alexa.getSlotValue(requestEnvelope, 'artist')

        console.log('song', song)
        console.log('artist', artist)
        const songs = await db.getMusicByArtist(userName, artist)
        //console.log('songs', songs)
        if (songs.length == 0) {
            return responseBuilder
                .speak(`Désolé, je n'ai pas trouvé de titre par ${artist}`)
                .getResponse()

        }

        songs.forEach((item) => {
            item._id = item._id.toString()
        })

        attributesManager.setPersistentAttributes({ songs, action: 'music' })

        responseBuilder.speak(`J'ai trouvé ${songs.length} titres par ${artist}`)

        return playSong(handlerInput, songs[0])
    }
}

const NextPlaybackHandler = {
    canHandle(handlerInput) {
        const { request } = handlerInput.requestEnvelope

        return (request.type === 'PlaybackController.NextCommandIssued' ||
            (request.type === 'IntentRequest' && request.intent.name === 'AMAZON.NextIntent'))
    },
    async handle(handlerInput) {
        const attributes = await handlerInput.attributesManager.getPersistentAttributes()

        return playNext(handlerInput, attributes)
    }
}

const PreviousPlaybackHandler = {
    canHandle(handlerInput) {
        const { request } = handlerInput.requestEnvelope

        return (request.type === 'PlaybackController.PreviousCommandIssued' ||
            (request.type === 'IntentRequest' && request.intent.name === 'AMAZON.PreviousIntent'))
    },
    async handle(handlerInput) {
        const attributes = await handlerInput.attributesManager.getPersistentAttributes()

        return playPrevious(handlerInput, attributes)
    }
}


const ResumePlaybackHandler = {
    canHandle(handlerInput) {
        const { request } = handlerInput.requestEnvelope

        return (request.type === 'PlaybackController.PlayCommandIssued' ||
            (request.type === 'IntentRequest' && request.intent.name === 'AMAZON.ResumeIntent'))
    },
    async handle(handlerInput) {
        const { songs, token, offsetInMilliseconds, action } = await handlerInput.attributesManager.getPersistentAttributes()
        const index = getIndex(songs, token)
        const song = songs[index]

        return playSong(handlerInput, song, { offsetInMilliseconds, action })
    }
}


const PausePlaybackHandler = {
    canHandle(handlerInput) {
        const { request } = handlerInput.requestEnvelope

        return request.type === 'IntentRequest' &&
            (request.intent.name === 'AMAZON.StopIntent' ||
                request.intent.name === 'AMAZON.CancelIntent' ||
                request.intent.name === 'AMAZON.PauseIntent')
    },
    handle(handlerInput) {
        return stopPlayback(handlerInput)
    },
}

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest'
    },
    handle(handlerInput) {
        const { responseBuilder, attributesManager } = handlerInput

        const speech = new AmazonSpeech()
            .say("Bienvenue sur l'interface vocale du système Net")
            .sayAs(OS)

        const speakOutput = speech.ssml()

        return responseBuilder
            .speak(speakOutput)
            .reprompt(`Que puis je faire pour vous aujourd'hui ?`)
            .getResponse()
    }
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

    const { token, songs, action } = attributes

    const index = getIndex(songs, token)
    console.log('index', index)

    if (index > 0) {
        return playSong(handlerInput, songs[index - 1], { action })
    }

    return responseBuilder
        .addAudioPlayerStopDirective()
        .speak('Vous avez atteint le début de la liste')
        .getResponse()

}

function playNext(handlerInput, attributes, enQueue = false) {
    console.log('playNext', enQueue)

    const { responseBuilder } = handlerInput

    const { token, songs, action } = attributes

    const index = getIndex(songs, token)
    console.log('index', index)

    if (index < songs.length - 1) {
        return playSong(handlerInput, songs[index + 1], { prevToken: (enQueue) ? token : null, action })
    }

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

const AudioPlayerEventHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope).startsWith('AudioPlayer.')
    },
    async handle(handlerInput) {
        const { requestEnvelope, attributesManager, responseBuilder } = handlerInput

        const audioPlayerEventName = Alexa.getRequestType(requestEnvelope).split('.')[1]
        //console.log('audioPlayerEventName', audioPlayerEventName)
        const attributes = await attributesManager.getPersistentAttributes()

        const { token, offsetInMilliseconds } = requestEnvelope.request
        // console.log('token', token)
        //console.log('offsetInMilliseconds', offsetInMilliseconds)

        switch (audioPlayerEventName) {
            case 'PlaybackStarted':
                attributes.token = token
                break
            case 'PlaybackFinished':
                break
            case 'PlaybackStopped':
                attributes.offsetInMilliseconds = offsetInMilliseconds
                break
            case 'PlaybackNearlyFinished':
                return await playNext(handlerInput, attributes, true)

            case 'PlaybackFailed':
                break
            default:
                throw new Error('Should never reach here!')
        }

        return responseBuilder.getResponse()
    }
}

const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest'
    },
    handle(handlerInput) {
        console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`)

        return handlerInput.responseBuilder.getResponse()
    }
}

const ErrorHandler = {
    canHandle() {
        return true
    },
    handle(handlerInput, error) {
        console.log(`Error handled: ${error.message}`)
        const { responseBuilder } = handlerInput
        let message = 'Désolé, il y a un bug dans la machine'
        if (error.message == USER_NOT_REGISTERD) {
            const speech = new AmazonSpeech()
            message = 'Utilisateur non identifié'
            // .say('Utilisateur non identifié')
            // .pause('500ms')
            // .say('Rendez vous sur votre compte Net')
            // .sayAs(OS)
            // .say('dans la menu settings')
            // .pause('500ms')
            // .say('Renseigner cette identifiant sur votre compte Net')
        }

        if (error.message == SKILL_NOT_LINKED) {
            const speech = new AmazonSpeech()
            speech
                .say('La skill Net')
                .sayAs(OS)
                .say(`n'est pas associé avec votre compte Net`)
                .sayAs(OS)
            message = speech.ssml()

            responseBuilder.withLinkAccountCard()

        }

        return responseBuilder
            .speak(message)
            //.withShouldEndSession(true)
            .getResponse()
    },
}

const RequestInterceptor = {
    async process(handlerInput) {
        const { requestEnvelope, attributesManager } = handlerInput
        console.log('requestEnvelope', requestEnvelope)
        const type = Alexa.getRequestType(requestEnvelope)
        console.log('type', type)
        if (type === 'IntentRequest') {
            console.log('name', Alexa.getIntentName(requestEnvelope))
        }
        if (requestEnvelope.session && requestEnvelope.session.new === true) {
            const { accessToken } = requestEnvelope.session.user
            if (accessToken == undefined) {
                throw new Error(SKILL_NOT_LINKED)
            }
            console.log('accessToken', accessToken)

            const userInfo = await db.getUserInfoById(accessToken)
            //console.log('userInfo', userInfo)
            if (userInfo == null) {
                throw new Error(USER_NOT_REGISTERD)
            }
            attributesManager.setSessionAttributes({ userName: userInfo.username })

        }
    }
}

const SavePersistentAttributesResponseInterceptor = {
    async process(handlerInput) {
        //console.log('SAVE ATTRIBUTES')
        await handlerInput.attributesManager.savePersistentAttributes()
    }
}

const skillBuilder = Alexa.SkillBuilders.custom()

skillBuilder
    .addRequestHandlers(
        LaunchRequestHandler,
        AudioPlayerEventHandler,
        PlayRequestHandler,
        NextPlaybackHandler,
        PreviousPlaybackHandler,
        PausePlaybackHandler,
        ResumePlaybackHandler,
        SessionEndedRequestHandler
    )
    .addRequestInterceptors(RequestInterceptor)
    .addResponseInterceptors(SavePersistentAttributesResponseInterceptor)
    .addErrorHandlers(ErrorHandler)
    .withPersistenceAdapter(getPersistenceAdapter())



module.exports = {
    skillBuilder,
    playSong
}
