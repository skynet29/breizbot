//@ts-check

const dbFriends = require('../../db/friends.js')

const wss = require('../../lib/wss.js')
const ssml = require('../ssml.js')

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

module.exports = [
    ConnectedFriendsRequestHandler
]