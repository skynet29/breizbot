const Alexa = require('ask-sdk-core')
const PROMPT = `Que puis je faire pour vous aujourd'hui ?`

module.exports = function (ctx) {

    const { skillInterface, app, util, ssml } = ctx

    const db = require('./lib/db.js')(ctx)

    skillInterface.addHelpMessage(`Vous pouvez dire aussi`)
    skillInterface.addCommand(`quelles sont mes playlists`, `pour connaitre la liste de vos playlistes`)
    skillInterface.addCommand(`lance ma playliste Acropole`, `pour lancer votre playliste Acropole`)

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
                    .withShouldEndSession(true)
                    .getResponse()

            }

            const action = 'playlist'

            attributesManager.setPersistentAttributes({ songs, action })

            responseBuilder.speak(`c'est parti`).withShouldEndSession(true)


            return skillInterface.playSong(handlerInput, songs[0], { action })

        }
    }


    const GetPlayListRequestHandler = {
        canHandle(handlerInput) {
            return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
                Alexa.getIntentName(handlerInput.requestEnvelope) === 'GetPlaylistIntent'
        },
        async handle(handlerInput) {
            const { requestEnvelope, attributesManager, responseBuilder } = handlerInput
            const { userName } = attributesManager.getSessionAttributes()
            //console.log('userName', userName)

            let playlists = await db.getPlaylist(userName)
            console.log('playlists', playlists)

            let speech = ''
            if (playlists.length == 0) {
                speech = `Vous n'avez pas encore de playlist`
            }
            else {
                speech = `Vous avez ${playlists.length} playlist` 
                speech += ssml.pause('100ms')
                speech += `Voici la liste`
                playlists.forEach((name) => {
                    speech += ssml.pause('500ms')
                    speech += name
                })
    
            }

            return responseBuilder
                .speak(speech)
                .withShouldEndSession(true)
                .getResponse()

        }
    }

    skillInterface.skillBuilder.addRequestHandlers(
        PlayPlayListRequestHandler,
        GetPlayListRequestHandler
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
