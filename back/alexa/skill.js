const Alexa = require('ask-sdk-core')

const { NETOS, SKILL_NOT_LINKED, USER_NOT_REGISTERED } = require('./constants')
const audioPlayer = require('./audioPlayer.js')

const { getPersistenceAdapter } = require('./persistence.js')

const ssml = require('./ssml.js')


let helpMessage = ''


const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest'
    },
    async handle(handlerInput) {
        const { responseBuilder, attributesManager } = handlerInput

        const attributes = await attributesManager.getPersistentAttributes()
        //console.log('attributes', attributes)
        const { isFirstVisit } = attributes

        let reprompt = `Que puis je faire pour vous aujourd'hui ?`

        let speech = ''

        const currentSong = audioPlayer.getCurrentSong(attributes)

        if (currentSong != null) {
            const { title, artist } = currentSong

            speech += ssml.pause('100ms')
            speech += `Vous étiez en train d'écouter ${ssml.english(title)} par ${artist}`
            speech += ssml.pause('100ms')
            speech += `Voulez vous reprendre ?`

            reprompt = `Vous pouvez repondre par oui ou par non`

        }

        else if (isFirstVisit === undefined) {
            attributes.isFirstVisit = false
            speech = `Bienvenue sur l'interface vocale du système ${NETOS}`
            speech += ssml.sentence(`Comme c'est votre première visite,je vais vous 
                expliquer certaines choses que vous pouvez faire.`)

            speech += ssml.sentence(`Vous pouvez dire par exemple:`)
            speech += ssml.sentence(`joue le titre ${ssml.english('Beat it')} pour écouter le titre ${ssml.english('Beat it')} de Michael Jackson`)
            speech += ssml.sentence(`ou encore`)
            speech += ssml.sentence(`joue les titres par Depeche Mode`)
            speech += ssml.sentence(`pour écouter tous les titres de Depeche Mode présent dans votre bibliothèque`)
            speech += ssml.sentence(`Vous pouvez demander de l’aide à tout moment.`)
            speech += ssml.sentence(`Que voulez vous faire maintenant ?`)
        }
        else {
            speech = ssml.sentence(`Bon retour sur l'interface vocale du système ${NETOS}`)
            speech += ssml.sentence(`C'est bon de vous revoir`)
            speech += ssml.sentence(`Que puis je faire pour vous aujourd'hui ?`)
        }

        //console.log('speech', speech)

        return responseBuilder
            .speak(ssml.toSpeak(speech))
            .reprompt(reprompt)
            .getResponse()
    }
}

const YesHandler = {
    async canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request

        return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.YesIntent'
    },
    async handle(handlerInput) {
        const attributes = await handlerInput.attributesManager.getPersistentAttributes()
        const { offsetInMilliseconds, action } = attributes
        const song = audioPlayer.getCurrentSong(attributes)
        handlerInput.responseBuilder.speak(`C'est parti`).withShouldEndSession(true)

        return audioPlayer.playSong(handlerInput, song, { offsetInMilliseconds, action })
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
        let message = ssml.sentence(`D'accord`)
        message += `Que puis je faire pour vous aujourd'hui ?`
        return responseBuilder
            .speak(ssml.toSpeak(message))
            .reprompt(`Que puis je faire pour vous aujourd'hui ?`)
            .getResponse()
    }
}



const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest'
    },
    handle(handlerInput) {
        console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`)
        if (handlerInput.requestEnvelope.request.error) {
            console.log('error:', handlerInput.requestEnvelope.request.error.message)
        }
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

        let message = 'Désolé, il y a eu un problème'

        if (error.message == USER_NOT_REGISTERED) {
            message = 'Utilisateur non identifié'
        }

        if (error.message == SKILL_NOT_LINKED) {
            message = `La skill ${NETOS} n'est pas associée avec votre compte ${NETOS}.`
            message += ssml.pause('100ms')
            message += `Rendez vous sur l'application Alexa pour associer votre compte Amazon avec votre compte ${NETOS}.`

            responseBuilder.withLinkAccountCard()

        }

        return responseBuilder
            .speak(ssml.toSpeak(message))
            .withShouldEndSession(true)
            .getResponse()
    }
}

const ExitHandler = {
    async canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request

        const { inPlayback } = await handlerInput.attributesManager.getPersistentAttributes()

        return !inPlayback &&
            request.type === 'IntentRequest' &&
            (request.intent.name === 'AMAZON.StopIntent' ||
                request.intent.name === 'AMAZON.CancelIntent')
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder
            .speak('Au revoir !')
            .withShouldEndSession(true)
            .getResponse()
    },
}


const HelpHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
            handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent'
    },
    async handle(handlerInput) {

        return handlerInput.responseBuilder
            .speak(helpMessage)
            .reprompt(`Que voulez vous faire ?`)
            .getResponse()
    },
}

const skillBuilder = Alexa.SkillBuilders.custom()

skillBuilder
    .addRequestHandlers(
        LaunchRequestHandler,
        YesHandler,
        NoHandler,
        SessionEndedRequestHandler,
        ExitHandler
    )
    .addRequestHandlers(...require('./handlers/audioPlayer'))
    .addRequestHandlers(...require('./handlers/birthday'))
    .addRequestHandlers(...require('./handlers/connectedFriends'))
    .addRequestInterceptors(...require('./interceptors/request.js'))
    .addResponseInterceptors(...require('./interceptors/response.js'))
    .addErrorHandlers(ErrorHandler)
    .withPersistenceAdapter(getPersistenceAdapter())
    .withApiClient(new Alexa.DefaultApiClient())



function addHelpMessage(text) {
    helpMessage += ssml.sentence(text)
}

function addPause(duration) {
    helpMessage += ssml.pause(duration)
}

function addCommand(commandText, explainText) {
    helpMessage += ssml.sentence(ssml.voice('Lea', commandText) + explainText)
}

function help() {
    addHelpMessage(`Voici une liste des choses que vous pouvez demander.`)
    addPause('500ms')
    addCommand(`Est ce que j'ai des amis connectés ?`, `pour savoir si vous avez des amis conectés à ${NETOS}`)

    addPause('500ms')
    addHelpMessage(`Vous pouvez aussi dire`)
    addCommand(`Active ou annule la notification d'anniversaire ?`, `pour programmer ou annuler un rappel d'anniversaire d'une personne présentes dans vos contacts`)

    addPause('500ms')

    addHelpMessage(`Vous pouvez dire par exemple:`)
    addHelpMessage(`joue le titre ${ssml.english('Beat it')}`)
    addHelpMessage(`ou encore`)
    addHelpMessage(`joue les titres par Depeche Mode`)
    addHelpMessage(`Quand vous écouter un titre, vous pouvez dire à tout moment`)
    addPause('500ms')
    addCommand(`Alexa suivant`, `pour écouter le titre suivant`)
    addCommand(`Alexa précedant`, `pour écouter le titre précédant`)
    addCommand(`Alexa pause ou Alexa stop`, `pour mettre en pause`)
    addCommand(`Alexa reprendre`, `pour reprendre la lecture là où elle s'est arrêtés`)


}

help()

module.exports = {
    skillBuilder,
    audioPlayer,
    addHelpMessage,
    addPause,
    addCommand,
    start: function () {
        return skillBuilder
            .addRequestHandlers(HelpHandler)
            .create()
    }
}
