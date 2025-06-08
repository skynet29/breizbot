const { XMLParser } = require("fast-xml-parser")
const fs = require('fs-extra')
const fetch = require('node-fetch')
const osmtogeojson = require('osmtogeojson')
const { DOMParser } = require('xmldom')

module.exports = function (ctx, router) {

    const { util, db } = ctx
    const { buildDbId } = db.constructor


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

    router.get('/osmObject', async (req, res) => {
        const ret = await db.find({ type: 'osmObject' }, { projection: { name: 1 } }).toArray()
        res.json(ret)
    })

    router.get('/osmObject/:id', async (req, res) => {
        const { id } = req.params
        const ret = await db.findOne(buildDbId(id))
        res.json(ret)
    })

    router.post('/importOSMObject', async (req, res) => {
        const { objectId, type } = req.body
        const url = `https://www.openstreetmap.org/api/0.6/${type}/${objectId}/full`
        try {
            const response = await fetch(url)
            const osmData = await response.text()
            console.log('length', osmData.length)

            console.dir({ osmData })
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(osmData, "application/xml");

            const geojsonData = osmtogeojson(xmlDoc)
            console.log({ geojsonData })
            let geoData = geojsonData.features.filter(e => ['Polygon', 'MultiPolygon'].includes(e.geometry.type))
            if (geoData.length > 0) {
                geoData = geoData.slice(0, 1)
                const name = geoData[0].properties['name:fr'] || geoData[0].properties.name
                await db.insertOne({ name, objectId, geoData, type: 'osmObject' })
            }

            res.json(geoData)
        }
        catch (e) {
            console.error(e)
            res.status(400).send(e.message)
        }

    })
}