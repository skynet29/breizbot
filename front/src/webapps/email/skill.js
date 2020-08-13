const Alexa = require('ask-sdk-core')
const ssml = require('../../../../back/alexa/ssml.js')

//const PROMPT = `Que puis je faire pour vous aujourd'hui ?`

module.exports = function (ctx) {

    const { skillInterface } = ctx

    skillInterface.addPause('500ms')
    skillInterface.addHelpMessage(`Vous pouvez dire aussi`)
    skillInterface.addCommand(`est ce que j'ai des nouveaux messages`, `pour savoir si vous avez de nouveaux emails non lus`)


    const db = require('./lib/db.js')(ctx.db)
    const mails = require('./lib/mails.js')(ctx)

    const MessageRequestHandler = {
        canHandle(handlerInput) {
            return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
                Alexa.getIntentName(handlerInput.requestEnvelope) === 'MessageIntent'
        },
        async handle(handlerInput) {
            const { attributesManager, responseBuilder } = handlerInput
            const { userName } = attributesManager.getSessionAttributes()
            //console.log('userName', userName)

            const accounts = await db.getMailAccounts(userName)
            console.log('accounts', accounts)
            if (accounts.length == 0) {
                return responseBuilder
                    .speak(`Vous n'avez pas encore de compte email de créé`)
                    .getResponse()
            }

            let speech = ''

            for await (acc of accounts) {
                const accountName = acc.name
                const unreadMessages = await mails.getUnreadInboxMessages(userName, accountName)
                console.log('unreadMessages', unreadMessages)
                if (unreadMessages == 0) {
                    speech += `Vous n'avez pas de messages non lus sur votre compte ${accountName}`
                }
                else {
                    speech += `Vous avez ${unreadMessages} messages non lus sur votre compte ${accountName}`
                }
            }

            return responseBuilder
                .speak(speech)
                .withShouldEndSession(true)
                .getResponse()

        }
    }



    skillInterface.skillBuilder.addRequestHandlers(
        MessageRequestHandler
    )



}
