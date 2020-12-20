const Alexa = require('ask-sdk-core')

//const PROMPT = `Que puis je faire pour vous aujourd'hui ?`

module.exports = function (ctx) {

    const { skillInterface } = ctx
    const { ssml, alexa } = skillInterface

    skillInterface.addPause('500ms')
    skillInterface.addHelpMessage(`Vous pouvez dire aussi`)
    skillInterface.addCommand(`est ce que j'ai des nouveaux messages`, `pour savoir si vous avez de nouveaux emails non lus`)


    const db = require('./lib/db.js')(ctx.db)
    const mails = require('./lib/mails.js')(ctx)

    const MessageRequestHandler = {
        canHandle(handlerInput) {
            return alexa.isIntentRequest(handlerInput, 'MessageIntent')
        },
        async handle(handlerInput) {
            const { responseBuilder } = handlerInput
            const userName  = alexa.getUserName(handlerInput)
            //console.log('userName', userName)

            const accounts = await db.getMailAccounts(userName)
            console.log('accounts', accounts)
            if (accounts.length == 0) {
                return responseBuilder
                    .speak(`Vous n'avez pas encore de compte email de créé`)
                    .getResponse()
            }

            const speech = ssml.create()

            for await (acc of accounts) {
                const accountName = acc.name
                const unreadMessages = await mails.getUnreadInboxMessages(userName, accountName)
                console.log('unreadMessages', unreadMessages)
                if (unreadMessages == 0) {
                    speech.say(`Vous n'avez pas de messages non lus sur votre compte ${accountName}`)
                }
                else {
                    speech.say(`Vous avez ${unreadMessages} messages non lus sur votre compte ${accountName}`)
                }
                speech.pause('500ms')
            }

            return responseBuilder
                .speak(speech.build())
                .withShouldEndSession(true)
                .getResponse()

        }
    }



    skillInterface.skillBuilder.addRequestHandlers(
        MessageRequestHandler
    )



}
