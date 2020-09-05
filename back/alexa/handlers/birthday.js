const birthday = require('../birthday.js')
const reminder = require('../reminder.js')
const ssml = require('../ssml.js')

const dbUsers = require('../../db/users.js')


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

module.exports = [
    ActivateBirthdayNotifHandler,
    DesactivateBirthdayNotifHandler
]