//@ts-check

const Alexa = require('ask-sdk-core')

const dbUsers = require('../../db/users.js')

const constants = require('../constants')

const RequestInterceptor = {
    async process(handlerInput) {
        const { requestEnvelope, attributesManager } = handlerInput
        //console.log('requestEnvelope', requestEnvelope)
        const type = Alexa.getRequestType(requestEnvelope)
        console.log('[Alexa] type', type)
        if (type === 'IntentRequest') {
            console.log('[Alexa] name', Alexa.getIntentName(requestEnvelope))
        }
        if (Alexa.isNewSession(requestEnvelope)) {
            const accessToken = Alexa.getAccountLinkingAccessToken(requestEnvelope)
            if (accessToken == undefined) {
                throw new Error(constants.SKILL_NOT_LINKED)
            }
            //console.log('accessToken', accessToken)

            const userInfo = await dbUsers.getUserInfoById(accessToken)
            //console.log('userInfo', userInfo)
            if (userInfo == null) {
                throw new Error(constants.USER_NOT_REGISTERED)
            }
            attributesManager.setSessionAttributes({ userName: userInfo.username })

        }
    }
}


module.exports = [
    RequestInterceptor
]