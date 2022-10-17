//@ts-check

const Alexa = require('ask-sdk-core')

const { SKILL_NOT_LINKED, USER_NOT_REGISTERED } = require('./constants')
const audioPlayer = require('./audioPlayer.js')

const config = require('../lib/config')

const { MongoDBPersistenceAdapter } = require('ask-sdk-mongodb-persistence-adapter');


const options = {
  collectionName: 'alexa',
  mongoURI: config.dbUrl,
  partitionKeyGenerator: (requestEnvelope) => {
    const userId = Alexa.getUserId(requestEnvelope)
    return userId.substr(userId.lastIndexOf(".") + 1)
  }

}

const persistenceAdapter =  new MongoDBPersistenceAdapter(options)

const ssml = require('./ssml.js')
const util = require('./util.js')


const helpMessage = ssml.create()


const LaunchRequestHandler = {
    /**
     * @param {import("ask-sdk-core").HandlerInput} handlerInput
     */
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest'
    },
    /**
     * @param {import("ask-sdk-core").HandlerInput} handlerInput
     */
     async handle(handlerInput) {
        const { responseBuilder } = handlerInput

        const attributes = await util.getPersistentAttributes(handlerInput)
        //console.log('attributes', attributes)
        const { isFirstVisit } = attributes

        let reprompt = `Que puis je faire pour vous aujourd'hui ?`

        const speech = ssml.create()

        const currentSong = await audioPlayer.getCurrentSong(handlerInput)

        if (currentSong != null) {
            const { title, artist } = currentSong

            speech.pause('100ms')
            speech.say(`Vous étiez en train d'écouter`)
            speech.english(title)
            speech.say(`par ${artist}`)
            speech.pause('100ms')
            speech.say(`Voulez vous reprendre ?`)

            reprompt = `Vous pouvez repondre par oui ou par non`

        }

        else if (isFirstVisit === undefined) {
            attributes.isFirstVisit = false
            speech.say(`Bienvenue sur l'interface vocale du système`)
            speech.NetOS()
            speech.sentence(`Comme c'est votre première visite,je vais vous 
                expliquer certaines choses que vous pouvez faire.`)

            speech.sentence(`Vous pouvez dire par exemple:`)
            speech.sentence(`joue le titre`)
            speech.english('Beat it') 
            speech.say(`pour écouter le titre de Michael Jackson`)
            speech.sentence(`ou encore`)
            speech.sentence(`joue les titres par Depeche Mode`)
            speech.sentence(`pour écouter tous les titres de Depeche Mode présent dans votre bibliothèque`)
            speech.sentence(`Vous pouvez demander de l’aide à tout moment.`)
            speech.sentence(`Que voulez vous faire maintenant ?`)
        }
        else {
            speech.say(`Bon retour sur l'interface vocale du système`)
            speech.NetOS()         
            speech.sentence(`C'est bon de vous revoir`)
            speech.sentence(`Que puis je faire pour vous aujourd'hui ?`)
        }

        //console.log('speech', speech)

        return responseBuilder
            .speak(speech.build())
            .reprompt(reprompt)
            .getResponse()
    }
}

const YesHandler = {
    /**
     * 
     * @param {import('ask-sdk-core').HandlerInput} handlerInput 
     * @returns 
     */    
    canHandle(handlerInput) {
        return util.isIntentRequest(handlerInput, 'AMAZON.YesIntent')
    },

    /**
     * 
     * @param {import('ask-sdk-core').HandlerInput} handlerInput 
     * @returns 
     */
    async handle(handlerInput) {
        handlerInput.responseBuilder.speak(`C'est parti`).withShouldEndSession(true)

        return audioPlayer.playSong(handlerInput, audioPlayer.PlayAction.RESUME)
    }
}

const NoHandler = {
    /**
     * 
     * @param {import('ask-sdk-core').HandlerInput} handlerInput 
     * @returns 
     */
    canHandle(handlerInput) {
        return util.isIntentRequest(handlerInput, 'AMAZON.NoIntent')
    },
    /**
     * 
     * @param {import('ask-sdk-core').HandlerInput} handlerInput 
     * @returns 
     */
    async handle(handlerInput) {
        const { responseBuilder, attributesManager } = handlerInput
        const attributes = await attributesManager.getPersistentAttributes()
        attributes.inPlayback = false
        const message = ssml.create()
        message.sentence(`D'accord`)
        message.sentence(`Que puis je faire pour vous aujourd'hui ?`)
        return responseBuilder
            .speak(message.build())
            .reprompt(`Que puis je faire pour vous aujourd'hui ?`)
            .getResponse()
    }
}



const SessionEndedRequestHandler = {
    /**
     * 
     * @param {import('ask-sdk-core').HandlerInput} handlerInput 
     * @returns 
     */
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest'
    },
    /**
     * 
     * @param {import('ask-sdk-core').HandlerInput} handlerInput 
     * @returns 
     */
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
    /**
     * 
     * @param {import('ask-sdk-core').HandlerInput} handlerInput 
     * @param {*} error 
     * @returns 
     */
    handle(handlerInput, error) {
        console.log(`[Alexa] Error handled: ${error.message}`)
        const { responseBuilder } = handlerInput

        const message = ssml.create()


        if (error.message == USER_NOT_REGISTERED) {
            message.say('Utilisateur non identifié')
        }

        else if (error.message == SKILL_NOT_LINKED) {
            message.say(`La skill`)
            message.NetOS()
            message.say(`n'est pas associée avec votre compte`)
            message.NetOS()
            message.pause('100ms')
            message.say(`Rendez vous sur l'application Alexa pour associer votre compte Amazon avec votre compte`)
            message.NetOS()

            responseBuilder.withLinkAccountCard()

        }
        else {
            message.say('Désolé, il y a eu un problème')
        }

        return responseBuilder
            .speak(message.build())
            .withShouldEndSession(true)
            .getResponse()
    }
}

const ExitHandler = {
    /**
     * 
     * @param {import('ask-sdk-core').HandlerInput} handlerInput 
     * @returns 
     */
    async canHandle(handlerInput) {
        const { inPlayback } = await util.getPersistentAttributes(handlerInput)

        return !inPlayback && (util.isIntentRequest(handlerInput, 'AMAZON.StopIntent') || util.isIntentRequest(handlerInput, 'AMAZON.CancelIntent'))
    },
    /**
     * 
     * @param {import('ask-sdk-core').HandlerInput} handlerInput 
     * @returns 
     */
    handle(handlerInput) {
        return handlerInput.responseBuilder
            .speak('Au revoir !')
            .withShouldEndSession(true)
            .getResponse()
    },
}


const HelpHandler = {
    /**
     * 
     * @param {import('ask-sdk-core').HandlerInput} handlerInput 
     * @returns 
     */
    canHandle(handlerInput) {
        return util.isIntentRequest(handlerInput, 'AMAZON.HelpIntent')
    },
    /**
     * 
     * @param {import('ask-sdk-core').HandlerInput} handlerInput 
     * @returns 
     */
    async handle(handlerInput) {

        return handlerInput.responseBuilder
            .speak(helpMessage.build())
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
    .withPersistenceAdapter(persistenceAdapter)
    .withApiClient(new Alexa.DefaultApiClient())



function addHelpMessage(text) {
    helpMessage.sentence(text)
}

function addPause(duration) {
    helpMessage.pause(duration)
}

function addCommand(commandText, explainText, addNetOS) {
    helpMessage.voice('Lea', commandText)
    helpMessage.say(explainText)
    if (addNetOS === true) {
        helpMessage.NetOS()
    }
}

function help() {
    addHelpMessage(`Voici une liste des choses que vous pouvez demander.`)
    addPause('500ms')
    addCommand(`Est ce que j'ai des amis connectés ?`, `pour savoir si vous avez des amis conectés à`, true)

    addPause('500ms')
    addHelpMessage(`Vous pouvez aussi dire`)
    addCommand(`Active ou annule la notification d'anniversaire ?`, `pour programmer ou annuler un rappel d'anniversaire d'une personne présentes dans vos contacts`)

    addPause('500ms')

    addHelpMessage(`Vous pouvez dire par exemple:`)
    addHelpMessage(`joue le titre Beat it`)
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
    },
    alexa: util,
    ssml
}
