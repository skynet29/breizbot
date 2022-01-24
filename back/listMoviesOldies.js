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
        if (nbItems == 6 || nbItems == 7) {
            const lastItem = pathItem.pop()
            if (['Animation', 'Français', 'Catastrophe'].includes(lastItem)) {
                movieInfo.style = lastItem            
            }
            if (lastItem == 'WWII') {
                movieInfo.style = 'Guerre'
                movieInfo.franchise = 'WWII'
            }
            if (lastItem == 'la 7ème compagnie') {
                movieInfo.style = 'Français'
                movieInfo.franchise = 'la 7ème compagnie'
            }
            if (lastItem == 'Twilight') {
                movieInfo.franchise = 'Twilight'
            }
        }
        if (nbItems == 8) {
            movieInfo.mainActor = pathItem.pop()
            movieInfo.franchise = pathItem.pop()
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