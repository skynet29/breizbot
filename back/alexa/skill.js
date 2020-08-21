const Alexa = require('ask-sdk-core')

const dbUsers = require('../db/users.js')
const dbSongs = require('../db/songs.js')
const dbFriends = require('../db/friends.js')
const wss = require('../lib/wss')
const birthday = require('./birthday.js')
const reminder = require('./reminder.js')


const { getPersistenceAdapter } = require('./persistence.js')
const { domain } = require('../lib/config.js')

const USER_NOT_REGISTERD = 'User not registered'
const SKILL_NOT_LINKED = 'Skill not linked'

const ssml = require('./ssml.js')

const NETOS = 'Net' + ssml.sayAs('characters', 'OS')

let helpMessage = ''


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

        const title = Alexa.getSlotValue(requestEnvelope, 'song')
        const artist = Alexa.getSlotValue(requestEnvelope, 'artist')

        console.log('title', title)
        console.log('artist', artist)
        if (title == undefined && artist == undefined) {
            return responseBuilder
                .speak(`Désolé, je n'ai pas compris`)
                .withShouldEndSession(true)
                .getResponse()
        }

        let songs = []
        if (title != undefined) {
            let song = null
            const titleName = ssml.english(title)
            if (artist == undefined) {
                song = await dbSongs.getMusicByTitle(userName, title)
                if (song == null) {
                    return responseBuilder
                        .withShouldEndSession(true)
                        .speak(`Désolé, je n'ai pas trouvé le titre ${titleName}`)
                        .getResponse()

                }
                const artistName = ssml.english(song.artist)
                responseBuilder.speak(`${titleName} par ${artistName} ${ssml.pause('100ms')} C'est parti`)
            }
            else {
                const artistName = ssml.english(artist)
                song = await dbSongs.getMusicByTitleAndArtist(userName, title, artist)
                if (song == null) {
                    return responseBuilder
                        .withShouldEndSession(true)
                        .speak(`Désolé, je n'ai pas trouvé le titre ${titleName} par ${artistName}`)
                        .getResponse()

                }

                responseBuilder.speak(`C'est parti`)


            }
            songs = [song]
        }
        else {
            songs = await dbSongs.getMusicByArtist(userName, artist)
            if (songs.length == 0) {
                return responseBuilder
                    .speak(`Désolé, je n'ai pas trouvé de titre par ${artist}`)
                    .withShouldEndSession(true)
                    .getResponse()

            }
        }

        songs.forEach((item) => {
            item._id = item._id.toString()
        })

        attributesManager.setPersistentAttributes({ songs, action: 'music' })

        if (title == undefined) {
            responseBuilder.speak(`J'ai trouvé ${songs.length} titres par ${artist}`)
        }

        responseBuilder.withShouldEndSession(true)

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
    async canHandle(handlerInput) {
        const { request } = handlerInput.requestEnvelope

        const { inPlayback } = await handlerInput.attributesManager.getPersistentAttributes()

        return inPlayback &&
            request.type === 'IntentRequest' &&
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
        //console.log('attributes', attributes)
        const { inPlayback, isFirstVisit, token, songs } = attributes

        let reprompt = `Que puis je faire pour vous aujourd'hui ?`

        let speech = ''

        if (inPlayback === true && token != undefined) {
            const index = getIndex(songs, token)
            const { title, artist } = songs[index]

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

        if (error.message == USER_NOT_REGISTERD) {
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

const YesHandler = {
    async canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request

        return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.YesIntent'
    },
    async handle(handlerInput) {
        const attributes = await handlerInput.attributesManager.getPersistentAttributes()
        const { token, songs, offsetInMilliseconds, action } = attributes
        const index = getIndex(songs, token)

        handlerInput.responseBuilder.speak(`C'est parti`).withShouldEndSession(true)

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
        let message = ssml.sentence(`D'accord`)
        message += `Que puis je faire pour vous aujourd'hui ?`
        return responseBuilder
            .speak(ssml.toSpeak(message))
            .reprompt(`Que puis je faire pour vous aujourd'hui ?`)
            .getResponse()
    }
}

const ConnectedFriendsRequestHandler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request

        return request.type === 'IntentRequest' && request.intent.name === 'ConnectedFriendsIntent'
    },
    async handle(handlerInput) {
        const { responseBuilder, attributesManager } = handlerInput

        const { userName } = attributesManager.getSessionAttributes()

        const friends = await dbFriends.getFriends(userName)
        const connectedFriends = friends
            .filter((f) => wss.isUserConnected(f))

        let speech = ''
        if (connectedFriends.length == 0) {
            speech = `Vous n'avez pas d'amis connectés`
        }
        else {
            speech = `Vous avez ${connectedFriends.length} amis connectés`
            connectedFriends.forEach((name) => {
                speech += ssml.pause('500ms')
                speech += name
            })
        }


        return responseBuilder
            .speak(ssml.toSpeak(speech))
            .withShouldEndSession(true)
            .getResponse()
    }
}

const ActivateBirthdayNotifHandler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request

        return request.type === 'IntentRequest' && request.intent.name === 'ActivateBirthdayNotifIntent'

    },
    async handle(handlerInput) {
        const { responseBuilder, attributesManager, requestEnvelope, serviceClientFactory } = handlerInput

        const consentToken = requestEnvelope.context.System.user.permissions
            && requestEnvelope.context.System.user.permissions.consentToken

        if (!consentToken) {
            return responseBuilder
                .speak(`Pour activer la notification d'anniversaires, rendez vous dans l'application Alexa pour autoriser les Rappels`)
                .withAskForPermissionsConsentCard(['alexa::alerts:reminders:skill:readwrite'])
                .getResponse()
        }

        const { userName } = attributesManager.getSessionAttributes()
        //console.log('userName', userName)

        const nextBirthdayContact = await birthday.getNextBirthdayContact(userName)
        console.log('nextBirthdayContact', nextBirthdayContact)
        if (nextBirthdayContact == null) {
            let speech = ssml.sentence(`Vous n'avez pas de notification d'anniversaire d'activer pour vos contacts`)
            speech += ssml.sentence(`Rendez vous sur votre application contacts de ${NETOS}`)
            return responseBuilder
                .speak(ssml.toSpeak(speech))
                .withShouldEndSession(true)
                .getResponse()

        }

        const { birthdayScheduleTime } = await dbUsers.getUserSettings(userName)

        const birthdayDate = new Date(nextBirthdayContact.birthday)

        const { scheduledTime, remindDate, age } = birthday.getScheduledInfo(birthdayDate, birthdayScheduleTime)
        console.log('scheduledTime', scheduledTime)
        //console.log('remindDate', remindDate)

        const reminderManagementServiceClient = serviceClientFactory.getReminderManagementServiceClient()

        const persistentAttributes = await attributesManager.getPersistentAttributes()
        //console.log('persistentAttributes', persistentAttributes)
        const { reminderId } = persistentAttributes
        console.log('reminderId', reminderId)

        const reminderList = await reminderManagementServiceClient.getReminders()
        console.log('reminderList', reminderList)

        if (reminderId && reminderList.totalCount != 0) {
            try {
                await reminderManagementServiceClient.deleteReminder(reminderId)
            }
            catch(e) {
                console.log('failed to delete reminder')
            }
            delete persistentAttributes.reminderId
        }



        const text = `Aujourd'hui c'est l'anniversaire de ${nextBirthdayContact.name}.
            ${nextBirthdayContact.gender == 'female' ? 'elle' : 'il'} aura ${age} ans`

        const reminderPlayload = reminder.getPayload(scheduledTime, text)


        let speech = `Un rappel a été programmé pour le ${ssml.sayAs('date', remindDate)}`
        try {
            const ret = await reminderManagementServiceClient.createReminder(reminderPlayload)
            //console.log('ret', ret)
            persistentAttributes.reminderId = ret.alertToken
        }
        catch (e) {
            console.error(e)
            speech = `Quelque chose n'a pas marché`
        }

        return responseBuilder
            .speak(ssml.toSpeak(speech))
            .withShouldEndSession(true)
            .getResponse()

    }
}

const DesactivateBirthdayNotifHandler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request

        return request.type === 'IntentRequest' && request.intent.name === 'DesactivateBirthdayNotifIntent'

    },
    async handle(handlerInput) {
        const { responseBuilder, attributesManager, requestEnvelope, serviceClientFactory } = handlerInput

        const consentToken = requestEnvelope.context.System.user.permissions
            && requestEnvelope.context.System.user.permissions.consentToken

        if (!consentToken) {
            return responseBuilder
                .speak(`Pour désactiver la notification d'anniversaires, rendez vous dans l'application Alexa pour autoriser les Rappels`)
                .withAskForPermissionsConsentCard(['alexa::alerts:reminders:skill:readwrite'])
                .getResponse()
        }

        const reminderManagementServiceClient = serviceClientFactory.getReminderManagementServiceClient()

        const persistentAttributes = attributesManager.getPersistentAttributes()
        const { reminderId } = persistentAttributes
        console.log('reminderId', reminderId)

        const reminderList = await reminderManagementServiceClient.getReminders()
        console.log('reminderList', reminderList)

        if (reminderId) {
            delete persistentAttributes[reminderId]
        }

        for await (alert of reminderList.alerts) {
            if (alert.status != 'COMPLETED') {
                await reminderManagementServiceClient.deleteReminder(alert.alertToken)
            }
        }


        return responseBuilder
            .speak(`La notification d'anniversaire a été désactivé`)
            .withShouldEndSession(true)
            .getResponse()

    }
}

const RequestInterceptor = {
    async process(handlerInput) {
        const { requestEnvelope, attributesManager } = handlerInput
        //console.log('requestEnvelope', requestEnvelope)
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
            //console.log('accessToken', accessToken)

            const userInfo = await dbUsers.getUserInfoById(accessToken)
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
        AudioPlayerEventHandler,
        PlayRequestHandler,
        NextPlaybackHandler,
        PreviousPlaybackHandler,
        PausePlaybackHandler,
        ResumePlaybackHandler,
        YesHandler,
        NoHandler,
        SessionEndedRequestHandler,
        ConnectedFriendsRequestHandler,
        ActivateBirthdayNotifHandler,
        DesactivateBirthdayNotifHandler,
        ExitHandler
    )
    .addRequestInterceptors(RequestInterceptor)
    .addResponseInterceptors(SavePersistentAttributesResponseInterceptor)
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
    playSong,
    addHelpMessage,
    addPause,
    addCommand,
    start: function () {
        return skillBuilder
            .addRequestHandlers(HelpHandler)
            .create()
    }
}
