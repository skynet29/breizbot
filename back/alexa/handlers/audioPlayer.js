//@ts-check

const Alexa = require('ask-sdk-core')

const dbSongs = require('../../db/songs.js')
const audioPlayer = require('../audioPlayer.js')
const ssml = require('../ssml.js')
const util = require('../util.js')


const PlayRequestHandler = {
    canHandle(handlerInput) {
        return util.isIntentRequest(handlerInput, 'PlayIntent')
    },
    async handle(handlerInput) {
        const { requestEnvelope, attributesManager, responseBuilder } = handlerInput
        const { userName } = attributesManager.getSessionAttributes()
        //console.log('userName', userName)

        const title = Alexa.getSlotValue(requestEnvelope, 'song')
        const artist = Alexa.getSlotValue(requestEnvelope, 'artist')

        console.log('title', title)
        console.log('artist', artist)
        if (title == undefined && artist == undefined) {
            return responseBuilder
                .speak(`Désolé, je n'ai pas compris`)
                .withShouldEndSession(true)
                .getResponse()
        }

        let songs = []
        if (title != undefined) {
            let song = null
            const titleName = ssml.english(title)
            if (artist == undefined) {
                song = await dbSongs.getMusicByTitle(userName, title)
                if (song == null) {
                    return responseBuilder
                        .withShouldEndSession(true)
                        .speak(`Désolé, je n'ai pas trouvé le titre ${titleName}`)
                        .getResponse()

                }
                const artistName = ssml.english(song.artist)
                responseBuilder.speak(`${titleName} par ${artistName} ${ssml.pause('100ms')} C'est parti`)
            }
            else {
                const artistName = ssml.english(artist)
                song = await dbSongs.getMusicByTitleAndArtist(userName, title, artist)
                if (song == null) {
                    return responseBuilder
                        .withShouldEndSession(true)
                        .speak(`Désolé, je n'ai pas trouvé le titre ${titleName} par ${artistName}`)
                        .getResponse()

                }

                responseBuilder.speak(`C'est parti`)


            }
            songs = [song]
        }
        else {
            songs = await dbSongs.getMusicByArtist(userName, artist)
            if (songs.length == 0) {
                return responseBuilder
                    .speak(`Désolé, je n'ai pas trouvé de titre par ${artist}`)
                    .withShouldEndSession(true)
                    .getResponse()

            }
        }

        songs.forEach((item) => {
            item._id = item._id.toString()
        })

        await audioPlayer.initAttributes(handlerInput, songs, 'music')

        if (title == undefined) {
            responseBuilder.speak(`J'ai trouvé ${songs.length} titres par ${artist}`)
        }

        responseBuilder.withShouldEndSession(true)

        return audioPlayer.playSong(handlerInput, songs[0])
    }
}

const PlayShuffleMusicHandler = {
    canHandle(handlerInput) {
        return util.isIntentRequest(handlerInput, 'PlayShuffleMusicIntent')
    },
    async handle(handlerInput) {
        const { attributesManager, responseBuilder } = handlerInput
        const { userName } = attributesManager.getSessionAttributes()
        //console.log('userName', userName)


        let songs = await dbSongs.getAllSongs(userName)

        songs.forEach((item) => {
            item._id = item._id.toString()
        })

        const shuffleIndexes = util.knuthShuffle(songs.length)

        await audioPlayer.initAttributes(handlerInput, songs, 'music', shuffleIndexes)

        responseBuilder.speak(`Lecture aléatoire. C'est parti`)
        responseBuilder.withShouldEndSession(true)

        const index = shuffleIndexes[0]

        return audioPlayer.playSong(handlerInput, songs[index])
    }
}


const NextPlaybackHandler = {
    canHandle(handlerInput) {
        return util.isPlaybackControllerCmd(handlerInput, 'NextCommandIssued') ||
            util.isIntentRequest(handlerInput, 'AMAZON.NextIntent')
    },
    async handle(handlerInput) {
        const attributes = await handlerInput.attributesManager.getPersistentAttributes()

        return audioPlayer.playNext(handlerInput, attributes)
    }
}

const PreviousPlaybackHandler = {
    canHandle(handlerInput) {
        return util.isPlaybackControllerCmd(handlerInput, 'PreviousCommandIssued') ||
            util.isIntentRequest(handlerInput, 'AMAZON.PreviousIntent')
    },
    async handle(handlerInput) {
        const attributes = await handlerInput.attributesManager.getPersistentAttributes()

        return audioPlayer.playPrevious(handlerInput, attributes)
    }
}


const ResumePlaybackHandler = {
    canHandle(handlerInput) {
        return util.isPlaybackControllerCmd(handlerInput, 'PlayCommandIssued') ||
            util.isIntentRequest(handlerInput, 'AMAZON.ResumeIntent')
    },
    async handle(handlerInput) {
        const attributes = await handlerInput.attributesManager.getPersistentAttributes()
        const { offsetInMilliseconds, action } = attributes
        const song = audioPlayer.getCurrentSong(attributes)

        return audioPlayer.playSong(handlerInput, song, { offsetInMilliseconds, action })
    }
}


const PausePlaybackHandler = {
    async canHandle(handlerInput) {
        const { inPlayback } = await handlerInput.attributesManager.getPersistentAttributes()

        return inPlayback && ( 
            util.isIntentRequest(handlerInput, 'AMAZON.StopIntent') ||
            util.isIntentRequest(handlerInput, 'AMAZON.CancelIntent') ||
            util.isIntentRequest(handlerInput, 'AMAZON.PauseIntent')
            )
    },
    handle(handlerInput) {
        return audioPlayer.stopPlayback(handlerInput)
    },
}

const AudioPlayerEventHandler = {
    canHandle(handlerInput) {
        return util.isAudioPlayerEvent(handlerInput)
    },
    async handle(handlerInput) {
        const { requestEnvelope, attributesManager, responseBuilder } = handlerInput

        const audioPlayerEventName = util.getAudioPlayerEventName(handlerInput)
        //console.log('audioPlayerEventName', audioPlayerEventName)
        const attributes = await attributesManager.getPersistentAttributes()

        const { token, offsetInMilliseconds } = requestEnvelope.request
        //console.log('token', token)
        //console.log('offsetInMilliseconds', offsetInMilliseconds)

        switch (audioPlayerEventName) {
            case 'PlaybackStarted':
                attributes.token = token
                attributes.inPlayback = true
                attributes.isLast = false
                break
            case 'PlaybackFinished':
                attributes.inPlayback = false
                break
            case 'PlaybackStopped':
                attributes.offsetInMilliseconds = offsetInMilliseconds
                break
            case 'PlaybackNearlyFinished':
                return await audioPlayer.playNext(handlerInput, attributes, true)

            case 'PlaybackFailed':
                break
            default:
                throw new Error('Should never reach here!')
        }

        return responseBuilder.getResponse()
    }
}

module.exports = [
    NextPlaybackHandler,
    PausePlaybackHandler,
    PlayRequestHandler,
    PreviousPlaybackHandler,
    ResumePlaybackHandler,
    AudioPlayerEventHandler,
    PlayShuffleMusicHandler
]