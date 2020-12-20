const PROMPT = `Que puis je faire pour vous aujourd'hui ?`

module.exports = function (ctx) {

    const { skillInterface, app, util } = ctx

    const { audioPlayer, alexa, ssml } = skillInterface

    const db = require('./lib/db.js')(ctx)

    skillInterface.addHelpMessage(`Vous pouvez dire aussi`)
    skillInterface.addCommand(`quelles sont mes playlists`, `pour connaitre la liste de vos playlistes`)
    skillInterface.addCommand(`lance ma playliste Acropole`, `pour lancer votre playliste Acropole`)

    const PlayPlayListRequestHandler = {
        canHandle(handlerInput) {
            return alexa.isIntentRequest(handlerInput, 'PlayPlaylistIntent')
        },
        async handle(handlerInput) {
            const { responseBuilder } = handlerInput
            const userName  = alexa.getUserName(handlerInput)
            //console.log('userName', userName)

            const playlist = alexa.getSlotValue(handlerInput, 'playlist')

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

            await audioPlayer.initAttributes(handlerInput, songs, 'playlist')

            responseBuilder.speak(`c'est parti`).withShouldEndSession(true)

            return await audioPlayer.playSong(handlerInput, audioPlayer.PlayAction.START)

        }
    }


    const GetPlayListRequestHandler = {
        canHandle(handlerInput) {
            return alexa.isIntentRequest(handlerInput, 'GetPlaylistIntent')
        },
        async handle(handlerInput) {
            const { responseBuilder } = handlerInput
            const userName  = alexa.getUserName(handlerInput)
            //console.log('userName', userName)

            let playlists = await db.getPlaylist(userName)
            console.log('playlists', playlists)

            let speech = ssml.create()
            if (playlists.length == 0) {
                speech.say(`Vous n'avez pas encore de playlist`)
            }
            else {
                speech.say(`Vous avez ${playlists.length} playlist`)
                speech.pause('100ms')
                speech.say(`Voici la liste`)
                playlists.forEach((name) => {
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
