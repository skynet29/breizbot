const { XMLParser } = require("fast-xml-parser")
const fs = require('fs-extra')
const fetch = require('node-fetch')
const osmtogeojson = require('osmtogeojson')
const { DOMParser } = require('xmldom')

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


    router.post('/importOSMObject', async (req, res) => {
        const { objectId } = req.body
        const url = `https://www.openstreetmap.org/api/0.6/relation/${objectId}/full`
        try {
            const response = await fetch(url)
            const osmData = await response.text()
            console.log('length', osmData.length)
    
            console.dir({osmData})
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(osmData, "application/xml");
    
            const geojsonData = osmtogeojson(xmlDoc)
            console.log({geojsonData})
    
            res.json(geojsonData)
        }
        catch(e) {
            console.error(e)
            res.status(400).send(e.message)
        }

    })
}