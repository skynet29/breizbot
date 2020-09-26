//@ts-check


function getPayload(scheduledTime, text) {
    return {
        trigger: {
            type: 'SCHEDULED_ABSOLUTE',
            scheduledTime
        },
        alertInfo: {
            spokenInfo: {
                content: [{
                    locale: 'fr-FR',
                    text
                }]
            }
        },
        pushNotification: {
            status: 'ENABLED'
        }
    }


}

module.exports = {
    getPayload
}