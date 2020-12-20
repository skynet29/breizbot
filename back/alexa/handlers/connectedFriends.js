//@ts-check

const dbFriends = require('../../db/friends.js')

const wss = require('../../lib/wss.js')
const ssml = require('../ssml.js')
const util = require('../util.js')

const ConnectedFriendsRequestHandler = {
    canHandle(handlerInput) {
        return util.isIntentRequest(handlerInput, 'ConnectedFriendsIntent')
    },
    async handle(handlerInput) {
        const { responseBuilder } = handlerInput

        const userName = util.getUserName(handlerInput)

        const friends = await dbFriends.getFriends(userName)
        const connectedFriends = friends
            .filter((f) => wss.isUserConnected(f))

        const speech = ssml.create()
        if (connectedFriends.length == 0) {
            speech.say(`Vous n'avez pas d'amis connectés`)
        }
        else {
            speech.say(`Vous avez ${connectedFriends.length} amis connectés`)
            connectedFriends.forEach((name) => {
                speech.pause('500ms')
                speech.say(name)
            })
        }


        return responseBuilder
            .speak(speech.build())
            .withShouldEndSession(true)
            .getResponse()
    }
}

module.exports = [
    ConnectedFriendsRequestHandler
]