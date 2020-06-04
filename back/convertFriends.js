const {MongoClient,  ObjectID} = require('mongodb')

const dbUrl ='mongodb://localhost:27017'
const dbName ='breizbot'


MongoClient.connect(dbUrl, async (err, client) => {
	if (err) {
		console.log('Error', err)
		return
	}

    db = client.db(dbName)
    const friendsCollection = db.collection('friends')
    const friends = await friendsCollection.find({}).toArray()
    console.log('friends', friends)
    for(const f of friends)  {
        await friendsCollection.insertOne({user1: f.user2, user2: f.user1})
    }

    process.exit()
    
})




