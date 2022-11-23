const {MongoClient,  ObjectID} = require('mongodb')

const fs = require('fs')


const fileName = process.argv[2]
console.log({fileName})

const text = fs.readFileSync(fileName, 'utf8')
const lines = text.split('\n')

console.log({lines})

const fields = lines[0].split(',')
console.log({fields})
const latitudeIdx = fields.findIndex((e) => e  == 'latitude')
const longitudeIdx = fields.findIndex((e) => e  == 'longitude')
const typeIdx = fields.findIndex((e) => e  == 'type')
const speedIdx = fields.findIndex((e) => e  == 'vitesse_vehicules_legers_kmh')
const equipementIdx = fields.findIndex((e) => e  == 'equipement')
const departementIdx = fields.findIndex((e) => e  == 'departement')
const routeIdx = fields.findIndex((e) => e  == 'route')

console.log({latitudeIdx, longitudeIdx, typeIdx, speedIdx, equipementIdx, departementIdx, routeIdx})

const data = []
for(let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',')
    const latitude = parseFloat(values[longitudeIdx])
    const longitude = parseFloat(values[latitudeIdx])
    if (isNaN(latitude)) {
        console.log({i})
        continue
    }
    const type = values[typeIdx]
    const equipement = values[equipementIdx]
    const departement = values[departementIdx]
    const route = values[routeIdx]
    const speed = parseInt(values[speedIdx])
    data.push({
        type: 'Feature',
        geometry: {type: 'Point', coordinates: [latitude, longitude]},
        properties: {
            type,
            speed,
            equipement,
            departement,
            route    
        }
    })
}


const dbUrl ='mongodb://localhost:27017'
const dbName ='breizbot'


//process.exit(0)

MongoClient.connect(dbUrl, (err, client) => {
	if (err) {
		console.log('Error', err)
		return
	}

	db = client.db(dbName)
	db.collection('radar').insertMany(data).then(() => {
		console.log('Inport finished')
	})
	.catch((e) => {
		console.log('Error', e)
	})
})




