
const { collection } = require('../lib/dbUtil.js')


module.exports = {

	getFriends: async function (username) {
		console.log(`[DB] getFriends`, username)
		const friends = await collection('friends')
			.find({ username })
			.toArray()

		return friends.map((f) => f.friend)
	},

	getFriendInfo: async function (username, friend) {
		//console.log(`[DB] getFriends`, userName)
		const info = await collection('friends')
			.findOne({ username, friend })

		return info
	},

	getPositionAuthFriends: async function (username) {
		const friends = await collection('friends')
			.find({ username, positionAuth: true }).toArray()

		return friends.map((f) => f.friend)
	},

	setFriendInfo: async function (username, friend, groups, positionAuth) {
		//console.log(`[DB] getFriends`, userName)
		await collection('friends')
			.updateOne({ username, friend }, { $set: { groups, positionAuth } })

	},


	addFriend: async function (username, friend) {
		console.log(`[DB] addFriend`, username, friend)
		await collection('friends').insertOne({ username, friend, groups: [] })
		await collection('friends').insertOne({ username: friend, friend: username, groups: [] })
	}


}


