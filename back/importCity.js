const {MongoClient,  ObjectID} = require('mongodb')

const dbUrl ='mongodb://localhost:27017'
const dbName ='breizbot'

const data = require('./city.json')
console.log('length', data.length)
data.forEach((d) => {
	delete d.id
})
//process.exit(0)

MongoClient.connect(dbUrl, (err, client) => {
	if (err) {
		console.log('Error', err)
		return
	}

	db = client.db(dbName)
	db.collection('cities').insertMany(data).then(() => {
		console.log('Inport finished')
	})
	.catch((e) => {
		console.log('Error', e)
	})
})




