
const { collection } = require('../lib/dbUtil.js')

const db = collection('friends')

const events = require('../lib/events')

events.on('userDeleted', async (userName) => {
    await db.deleteMany({ $or: [{ username }, { friend: username }] })
})

module.exports = {

	getFriends: async function (username) {
		console.log(`[DB] getFriends`, username)
		const friends = await db
			.find({ username })
			.toArray()

		return friends.map((f) => f.friend)
	},

	getFriendInfo: async function (username, friend) {
		//console.log(`[DB] getFriends`, userName)
		const info = await db
			.findOne({ username, friend })

		return info
	},

	getPositionAuthFriends: async function (username) {
		const friends = await db
			.find({ username, positionAuth: true }).toArray()

		return friends.map((f) => f.friend)
	},

	setFriendInfo: async function (username, friend, groups, positionAuth) {
		//console.log(`[DB] getFriends`, userName)
		await db
			.updateOne({ username, friend }, { $set: { groups, positionAuth } })

	},


	addFriend: async function (username, friend) {
		console.log(`[DB] addFriend`, username, friend)
		await db.insertOne({ username, friend, groups: [] })
		await db.insertOne({ username: friend, friend: username, groups: [] })
	}


}


