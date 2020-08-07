const Alexa = require('ask-sdk-core')

module.exports = function (ctx) {

    const { skillInterface, app, util } = ctx

    const db = require('./lib/db.js')(ctx)

    const PlayPlayListRequestHandler = {
        canHandle(handlerInput) {
            return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
                Alexa.getIntentName(handlerInput.requestEnvelope) === 'PlayPlaylistIntent'
        },
        async handle(handlerInput) {
            const { requestEnvelope, attributesManager, responseBuilder } = handlerInput
            const { userName } = attributesManager.getSessionAttributes()
            //console.log('userName', userName)

            const playlist = Alexa.getSlotValue(requestEnvelope, 'playlist')

            console.log('playlist', playlist)
            let songs = await db.getPlaylistSongs(userName, playlist)
            //console.log('songs', songs)

            songs = songs
                .filter((item) => item.status === 'ok')
                .map((item) => {
                    const { artist, title } = item.mp3
                    return {
                        _id: item.id.toString(),
                        artist,
                        title
                    }
                })
            //console.log('songs', songs)
            if (songs.length == 0) {
                return responseBuilder
                    .speak(`Désolé, je n'ai pas trouvé la playlist ${playlist}`)
                    .getResponse()

            }

            const action = 'playlist'

            attributesManager.setPersistentAttributes({ songs, action })

            return skillInterface.playSong(handlerInput, songs[0], { action })

        }
    }

    skillInterface.skillBuilder.addRequestHandlers(
        PlayPlayListRequestHandler
    )

    app.get('/alexa/playlist/:id', async function (req, res) {
        //console.log('alexa playlist', req.params)

        const { id } = req.params

        const info = await db.getPlaylistSong(id)
        //console.log('info', info)

        const { fileName, rootDir, friendUser } = info.fileInfo

        const filePath = util.getFilePath(info.userName, rootDir + fileName, friendUser)
        //console.log('filePath', filePath)

        res.sendFile(filePath)

    })

}
