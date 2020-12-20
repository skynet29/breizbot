//@ts-check


const dbSongs = require('../../db/songs.js')
const audioPlayer = require('../audioPlayer.js')
const ssml = require('../ssml.js')
const util = require('../util.js')


const PlayRequestHandler = {
    canHandle(handlerInput) {
        return util.isIntentRequest(handlerInput, 'PlayIntent')
    },
    async handle(handlerInput) {
        const { responseBuilder } = handlerInput
        const userName  = util.getUserName(handlerInput)
        //console.log('userName', userName)

        const title = util.getSlotValue(handlerInput, 'song')
        const artist = util.getSlotValue(handlerInput, 'artist')

        console.log('title', title)
        console.log('artist', artist)
        if (title == undefined && artist == undefined) {
            return responseBuilder
                .speak(`Désolé, je n'ai pas compris`)
                .withShouldEndSession(true)
                .getResponse()
        }

        let songs = []
        const speech = ssml.create()
        if (title != undefined) {
            let song = null
            if (artist == undefined) {
                song = await dbSongs.getMusicByTitle(userName, title)
                if (song == null) {
                    speech.say(`Désolé, je n'ai pas trouvé le titre`)
                    speech.english(title)

                    return responseBuilder
                        .withShouldEndSession(true)
                        .speak(speech.build())
                        .getResponse()

                }
                speech.english(title)
                speech.say('par')
                speech.english(artist)
                speech.pause('100ms')
                speech.say(`C'est parti`)
                responseBuilder.speak(speech.build())
            }
            else {
                song = await dbSongs.getMusicByTitleAndArtist(userName, title, artist)
                if (song == null) {
                    speech.say(`Désolé, je n'ai pas trouvé le titre`)
                    speech.english(title)
                    speech.say('par')
                    speech.english(artist)
                    return responseBuilder
                        .withShouldEndSession(true)
                        .speak(speech.build())
                        .getResponse()

                }

                responseBuilder.speak(`C'est parti`)


            }
            songs = [song]
        }
        else {
            songs = await dbSongs.getMusicByArtist(userName, artist)
            if (songs.length == 0) {
                speech.say(`Désolé, je n'ai pas trouvé le titre par`)
                speech.english(artist)
                return responseBuilder
                    .speak(speech.build())
                    .withShouldEndSession(true)
                    .getResponse()

            }
        }

        songs.forEach((item) => {
            item._id = item._id.toString()
        })

        await audioPlayer.initAttributes(handlerInput, songs, 'music')

        if (title == undefined) {
            speech.say(`J'ai trouvé ${songs.length} titres par`)
            speech.english(artist)
            responseBuilder.speak(speech.build())
        }

        responseBuilder.withShouldEndSession(true)

        return await audioPlayer.playSong(handlerInput, audioPlayer.PlayAction.START)
    }
}

const PlayShuffleMusicHandler = {
    canHandle(handlerInput) {
        return util.isIntentRequest(handlerInput, 'PlayShuffleMusicIntent')
    },
    async handle(handlerInput) {
        const { responseBuilder } = handlerInput
        const userName  = util.getUserName(handlerInput)
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

        return await audioPlayer.playSong(handlerInput, audioPlayer.PlayAction.START)
    }
}


const NextPlaybackHandler = {
    canHandle(handlerInput) {
        return util.isPlaybackControllerCmd(handlerInput, 'NextCommandIssued') ||
            util.isIntentRequest(handlerInput, 'AMAZON.NextIntent')
    },
    async handle(handlerInput) {

        return await audioPlayer.playSong(handlerInput, audioPlayer.PlayAction.NEXT)
    }
}

const PreviousPlaybackHandler = {
    canHandle(handlerInput) {
        return util.isPlaybackControllerCmd(handlerInput, 'PreviousCommandIssued') ||
            util.isIntentRequest(handlerInput, 'AMAZON.PreviousIntent')
    },
    async handle(handlerInput) {

        return await audioPlayer.playSong(handlerInput, audioPlayer.PlayAction.PREV)
    }
}


const ResumePlaybackHandler = {
    canHandle(handlerInput) {
        return util.isPlaybackControllerCmd(handlerInput, 'PlayCommandIssued') ||
            util.isIntentRequest(handlerInput, 'AMAZON.ResumeIntent')
    },
    async handle(handlerInput) {

        return await audioPlayer.playSong(handlerInput, audioPlayer.PlayAction.RESUME)
    }
}


const PausePlaybackHandler = {
    async canHandle(handlerInput) {
        const { inPlayback } = await util.getPersistentAttributes(handlerInput)

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
        const { requestEnvelope, responseBuilder } = handlerInput

        const audioPlayerEventName = util.getAudioPlayerEventName(handlerInput)
        //console.log('audioPlayerEventName', audioPlayerEventName)
        const attributes = await util.getPersistentAttributes(handlerInput)

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
                return await audioPlayer.playSong(handlerInput, audioPlayer.PlayAction.NEXT, true)

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