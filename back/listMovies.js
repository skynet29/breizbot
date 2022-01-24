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

function getFolders(source) {
    return fs.readdirSync(source, { withFileTypes: true })
        .filter((ent) => ent.isDirectory())
        .map(ent => ent.name)
        .filter(ent => !ent.startsWith('.'))
        .filter(ent => !['Années', 'Nouveauté'].includes(ent))
}

function listMovies() {
    const styles = getFolders(folderPath)
    console.log(styles)
    //process.exit(1)

    const entries = fg.sync(filterPath)

    const ret = []
    for (const entry of entries) {
        //console.log(entry)
        const movieInfo = {}
        const pathInfo = path.parse(entry)
        const pathItem = pathInfo.dir.split('/')
        const nbItems = pathItem.length
        //console.log('nbItems', nbItems)
        let franchiseIdx = -1
        for (let i = 0; i < styles.length && franchiseIdx < 0; i++) {
            franchiseIdx = pathItem.indexOf(styles[i])
        }

        //console.log('franchiseIdx', franchiseIdx)

        if (franchiseIdx >= 0) {
            if (nbItems - franchiseIdx == 2) {
                if (pathItem[franchiseIdx] != 'Franchises') {
                    movieInfo.style = pathItem[franchiseIdx]
                }

                movieInfo.franchise = pathItem[franchiseIdx + 1]
            }
            if (nbItems - franchiseIdx == 3) {
                movieInfo.style = pathItem[franchiseIdx + 1]
                movieInfo.franchise = pathItem[franchiseIdx + 2]
            }
            if (nbItems - franchiseIdx == 1) {
                movieInfo.style = pathItem[franchiseIdx]
            }
        }
        const fullTitle = path.basename(entry, pathInfo.ext)
        movieInfo.year = parseInt(fullTitle.substr(0, 4))
        movieInfo.title = fullTitle.substr(4).replace(/\[.*\]/, '').trim()

        console.log(movieInfo)
        ret.push(movieInfo)
    }
    return ret


}

const movies = listMovies()
fs.writeFileSync(destPath, JSON.stringify(movies, null, 4))