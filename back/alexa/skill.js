const Alexa = require('ask-sdk-core')

const db = require('../lib/db.js')
const { getPersistenceAdapter } = require('./persistence.js')
const { domain } = require('../lib/config.js')
const { buildDbId, collection } = require('../lib/dbUtil.js')
const util = require('../lib/util.js')

const USER_NOT_REGISTERD = 'User not registered'
const SKILL_NOT_LINKED = 'Skill not linked'

const ssml = {
    sayAs: function(interpret, word) {
        return `<say-as interpret-as="${interpret}">${word}</say-as>`
    },
    pause: function(duration) {
        return `<break time="${duration}" />`
    },
    say: function(lang, text) {
        return `<lang xml:lang="${lang}">${text}</lang>`
    },
    toSpeak: function(text) {
        return `<speak>${text}</speak>`
    }
}

const NETOS = 'Net' + ssml.sayAs('characters', 'OS')

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
    async handle(handlerInput) {
        const { responseBuilder, attributesManager } = handlerInput

        const attributes = await attributesManager.getPersistentAttributes()
        console.log('attributes', attributes)
        const { inPlayback, isLast, token, songs } = attributes

        let reprompt = `Que puis je faire pour vous aujourd'hui ?`

        let speech = `Bienvenue sur l'interface vocale du système ${NETOS}`

        if (inPlayback === true && token != undefined) {
            const index = getIndex(songs, token)
            const { title, artist } = songs[index]

            speech += ssml.pause('100ms')
            speech += `Vous étiez en train d'écouter ${ssml.say('en-US', title)} par ${artist}`
            speech += ssml.pause('100ms')
            speech += `Voulez vous reprendre ?`

            reprompt = `Vous pouvez repondre par oui ou par non`

        }

        //console.log('speech', speech)

        return responseBuilder
            .speak(ssml.toSpeak(speech))
            .reprompt(reprompt)
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
                attributes.inPlayback = true
                attributes.isLast = false
                break
            case 'PlaybackFinished':
                attributes.inPlayback = false
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
            message = 'Utilisateur non identifié'
        }

        if (error.message == SKILL_NOT_LINKED) {
            message = `La skill ${NETOS} n'est pas associée avec votre compte ${NETOS}`

            responseBuilder.withLinkAccountCard()

        }

        return responseBuilder
            .speak(ssml.toSpeak(message))
            //.withShouldEndSession(true)
            .getResponse()
    },
}

const YesHandler = {
    async canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request

        return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.YesIntent'
    },
    async handle(handlerInput) {
        const attributes = await handlerInput.attributesManager.getPersistentAttributes()
        const { token, songs, offsetInMilliseconds, action } = attributes
        const index = getIndex(songs, token)

        handlerInput.responseBuilder.speak(`C'est parti`)

        return playSong(handlerInput, songs[index], { offsetInMilliseconds, action })
    }
}

const NoHandler = {
    async canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request

        return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.NoIntent'
    },
    async handle(handlerInput) {
        const { responseBuilder, attributesManager } = handlerInput
        const attributes = await attributesManager.getPersistentAttributes()
        attributes.inPlayback = false
        return responseBuilder
            .speak(`D'accord`)
            .reprompt(`Que puis je faire pour vous aujourd'hui ?`)
            .getResponse()
    }
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
        YesHandler,
        NoHandler,
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
