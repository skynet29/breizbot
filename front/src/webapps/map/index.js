const { XMLParser } = require("fast-xml-parser")
const fs = require('fs-extra')




module.exports = function (ctx, router) {

    const { util } = ctx

    router.post('/importKml', async (req, res) => {

        console.log('importKml', req.body)
        const { fileName, rootDir } = req.body
        const user = req.session.user
        const filePath = util.getFilePath(user, rootDir + fileName)
        try {
            const xmlData = await fs.readFile(filePath, 'utf-8')
            const parser = new XMLParser()
            let jObj = parser.parse(xmlData)
            console.log(jObj)
            res.json(jObj.kml.Document.Folder.Placemark)
        }
        catch (e) {
            res.status(400).send(e.message)
        }


    })
}