const fg = require('fast-glob')
const fs = require('fs')
const path = require('path')

if (process.argv.length != 4) {
    console.log('Missing args')
    process.exit(1)
}

const folderPath = process.argv[2]
const destPath = process.argv[3]

const filterPath = path.join(folderPath, '**/*.mkv')
console.log('folderPath', folderPath)


function listMovies() {

    const entries = fg.sync(filterPath)

    const ret = []
    for (const entry of entries) {
        console.log(entry)
        const movieInfo = {}
        const pathInfo = path.parse(entry)
        const pathItem = pathInfo.dir.split('/')
        const nbItems = pathItem.length
        console.log('nbItems', nbItems)
        let idx = pathItem.lastIndexOf('Acteurs') + 1
        let actor =  pathItem[idx]
        if (actor.length == 1) {
            actor = pathItem[++idx]
        }
        console.log('idx', idx)
        console.log('Actor', actor)
        movieInfo.mainActor = actor
        if (nbItems - idx == 2) {
            movieInfo.franchise = pathItem[++idx]
        }

        const fullTitle = path.basename(entry, pathInfo.ext)
        movieInfo.year = parseInt(fullTitle.substr(0, 4))
        movieInfo.title = fullTitle.substr(4).replace(/\[.*\]/, '').trim()

        //console.log(movieInfo)
        ret.push(movieInfo)
    }
    return ret


}

const movies = listMovies()
fs.writeFileSync(destPath, JSON.stringify(movies, null, 4))