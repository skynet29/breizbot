const path = require('path')
const fg = require('fast-glob')
const { MongoClient, ObjectID } = require('mongodb')


const config = require('../../lib/config')
const util = require('../../lib/util')
const { getFileInfo } = util

const cloudPath = config.CLOUD_HOME

async function findFiles() {
    const filterPath = path.join(cloudPath, '**/*.mp3')
    const entries = await fg(filterPath)
    const ret = []	
    for await (const entry of entries) {
        const filePath = entry.replace(cloudPath, '')
        const owner = filePath.split('/')[1]
        const fileName = filePath.replace('/' + owner, '')
        const info = await getFileInfo(entry, {getMP3Info: true})
        if (info.mp3) {
            const {title, artist} = info.mp3
            if (title != undefined && artist != undefined) {
                ret.push({
                    owner,
                    fileName,       
                    title,
                    artist
                })
            }
        }
    }
    console.log('ret', ret)
    return ret

}

function generateDb() {
    MongoClient.connect(config.dbUrl, async (err, client) => {
        if (err) {
            console.log(err)
            return
        }

        const db = client.db(config.dbName)
        const entries = await findFiles()
        const tracksCollection = db.collection('music-songs')
        let resp
        try {

            await tracksCollection.drop()
        }
        catch(e) {
            console.log(e)
        }
        //await artists.drop()
        resp = await tracksCollection.insertMany(entries)
        //console.log('resp', resp)
        process.exit(0)
    })

}

generateDb()