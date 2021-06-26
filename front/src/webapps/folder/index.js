const path = require('path')
const fs = require('fs-extra')
//const zipFolder = require('zip-a-folder')
//const unzipper = require('unzipper')
const ffmpeg = require('fluent-ffmpeg')
const unpacker = require('unpacker-with-progress')
const archiver = require('archiver')
const request = require('request')
const progress = require('request-progress')


module.exports = function (ctx, router) {

    const { util, wss } = ctx
    const { getFileInfo } = util


    async function resizeImage(filePath, fileName, resizeFormat) {
        const extname = path.extname(fileName)
        const basename = path.basename(fileName, extname)

        const fullName = path.join(filePath, fileName)
        const resizedFileName = basename + '_resized' + extname
        const resizedFullName = path.join(filePath, resizedFileName)
        await util.genThumbnail(fullName, resizedFullName, resizeFormat)
        return getFileInfo(resizedFullName)

    }

    router.post('/mkdir', async function (req, res) {
        console.log('mkdir req', req.body)
        const { fileName } = req.body
        const user = req.session.user
        const folderPath = util.getFilePath(user, fileName)
        try {
            await fs.mkdirp(folderPath)
            res.json(await getFileInfo(folderPath))
        }
        catch (e) {
            console.log('error', e)
            res.status(400).send(e.message)
        }
    })

    router.post('/delete', function (req, res) {
        console.log('delete req', req.body)
        const fileNames = req.body
        const user = req.session.user

        const promises = fileNames.map(function (fileName) {
            return fs.remove(util.getFilePath(user, fileName))
        })

        Promise.all(promises)
            .then(function () {
                res.status(200).send('File removed !')
            })
            .catch(function (e) {
                console.log('error', e)
                res.status(400).send(e.message)
            })
    })

    router.post('/move', function (req, res) {
        console.log('move req', req.body)
        var fileNames = req.body.fileNames
        var destPath = req.body.destPath

        var user = req.session.user

        var promises = fileNames.map(function (fileName) {
            var fullPath = util.getFilePath(user, fileName)
            var fullDest = path.join(util.getFilePath(user, destPath), path.basename(fileName))
            console.log('fullDest', fullDest)
            return fs.move(fullPath, fullDest)
        })

        Promise.all(promises)
            .then(function () {
                res.status(200).send('File moved !')
            })
            .catch(function (e) {
                console.log('error', e)
                res.status(400).send(e.message)
            })
    })

    router.post('/rename', async function (req, res) {
        console.log('move req', req.body)
        const { filePath, oldFileName, newFileName } = req.body

        var user = req.session.user

        const userFilePath = util.getFilePath(user, filePath)

        const oldFullPath = path.join(userFilePath, oldFileName)
        const newFullPath = path.join(userFilePath, newFileName)

        try {
            await fs.move(oldFullPath, newFullPath)
            const info = await getFileInfo(newFullPath)
            res.json(info)
        }
        catch (e) {
            console.log('error', e)
            res.status(400).send(e.message)
        }
    })

    router.post('/resizeImage', async function (req, res) {
        console.log('resizeImage', req.body)
        const { filePath, fileName, resizeFormat } = req.body

        var user = req.session.user

        const fullPath = util.getFilePath(user, filePath)

        try {
            const info = await resizeImage(fullPath, fileName, resizeFormat)
            res.json(info)
        }
        catch (e) {
            console.log('error', e)
            res.status(400).send(e.message)
        }
    })

    router.post('/convertToMP3', async function (req, res) {
        console.log('convertToMP3', req.body)
        const { filePath, fileName, srcId } = req.body

        const user = req.session.user

        const fullPath = util.getFilePath(user, filePath)

        const extname = path.extname(fileName)
        const basename = path.basename(fileName, extname)

        const outFileName = basename + '.mp3'
        console.log('outFileName', outFileName)

        var process = new ffmpeg()

        ffmpeg(path.join(fullPath, fileName))
            .output(path.join(fullPath, outFileName))
            .noVideo()
            .format('mp3')
            .outputOptions('-ab', '192k')
            .on('error', (e) => {
                console.log('ffpmeg error', e)
                wss.sendToClient(srcId, { topic: 'breizbot.mp3.progress', data: { error: e.message } })
            })
            .on('progress', (event) => {
                const { percent } = event
                wss.sendToClient(srcId, { topic: 'breizbot.mp3.progress', data: { percent } })
            })
            .on('end', () => {
                console.log('Finsihed!')
                wss.sendToClient(srcId, { topic: 'breizbot.mp3.progress', data: { finish: true } })
            })
            .run()

        res.status(200).json({ outFileName: path.join(filePath, outFileName) })
    })

    router.post('/zipFolder', async function (req, res) {
        const { folderPath, folderName, srcId } = req.body

        const user = req.session.user

        const userFilePath = util.getFilePath(user, folderPath)

        const fullFolderPath = path.join(userFilePath, folderName)
        const fileName = folderName + '.zip'
        const fullZipFilePath = path.join(userFilePath, fileName)

        try {
            var output = fs.createWriteStream(fullZipFilePath)
            var zipArchive = archiver('zip')
            let started = false

            output.on('close', function () {
                console.log('finished')
            });

            zipArchive.on('entry', (data) => {
                const { name, type } = data
                //console.log('entry', type, name)
                if (type == 'file') {
                    started = true
                }
            })

            zipArchive.on('progress', (data) => {
                //console.log('progress', data)
                const { total, processed } = data.entries
                if (started) {
                    wss.sendToClient(srcId, {
                        topic: 'breizbot.zip.progress',
                        data: {
                            percent: (processed / total) * 100
                        }
                    })
                }
            })

            zipArchive.pipe(output)
            zipArchive.directory(fullFolderPath, false)
            zipArchive.finalize()

            res.status(200).json({ outFileName: path.join(folderPath, fileName) })


        }
        catch (e) {
            console.log('error', e)
            res.status(400).send(e.message)
        }

    })

    router.post('/unzipFile', async function (req, res) {
        console.log('unzipFile', req.body)
        const { folderPath, fileName, srcId } = req.body

        const user = req.session.user

        const fullFolderPath = util.getFilePath(user, folderPath)
        const fullZipFileName = path.join(fullFolderPath, fileName)

        try {
            unpacker(fullZipFileName, fullFolderPath, {
                onprogress: (data) => {
                    //console.log('data', data)
                    wss.sendToClient(srcId, { topic: 'breizbot.unzip.progress', data: { percent: data.percent * 100 } })

                }
            })
            res.sendStatus(200)
        }
        catch (e) {
            res.status(400).send(e.message)
        }


    })

    router.post('/copy', function (req, res) {
        console.log('copy req', req.body)
        const { fileNames, destPath } = req.body

        const user = req.session.user

        const promises = fileNames.map(function (fileName) {
            const fullPath = util.getFilePath(user, fileName)
            const fullDest = path.join(util.getFilePath(user, destPath), path.basename(fileName))
            console.log('fullDest', fullDest)
            return fs.copy(fullPath, fullDest)
        })

        Promise.all(promises)
            .then(function () {
                res.status(200).send('File copied !')
            })
            .catch(function (e) {
                console.log('error', e)
                res.status(400).send(e.message)
            })
    })

    router.post('/importUrl', function (req, res) {
        console.log('folder/importUrl', req.body)
        let { url, folderPath, srcId } = req.body
        const userName = req.session.user
        const fileName = url.split('/').pop()

        const fullFileName = path.join(util.getFilePath(userName, folderPath), fileName)
        console.log('fullFileName', fullFileName)

        progress(request(url), {

        })
            .on('progress', (state) => {
                //console.log('progress', state)
                wss.sendToClient(srcId, { topic: 'breizbot.importUrl.progress', data: { percent: state.percent * 100} })
            })
            .on('eeror', (e) => {
                console.error(e)
                wss.sendToClient(srcId, { topic: 'breizbot.importUrl.progress', data: { error: e } })

            })
            .on('end', () => {
                console.log('end')
                wss.sendToClient(srcId, { topic: 'breizbot.importUrl.progress', data: { percent: 100 } })
             })
            .pipe(fs.createWriteStream(fullFileName))

        res.status(200).json({ outFileName: path.join(folderPath, fileName) })
    })


}




