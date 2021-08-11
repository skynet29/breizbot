$$.service.registerService('breizbot.friends', {

	deps: ['brainjs.resource'],

	init: function (config, resource) {

		const http = resource('/api/friends')

		return {

			getFriends: function () {
				return http.get(`/getFriends`)
			},

			getFriendInfo: function (friend) {
				return http.post('/getFriendInfo', { friend })
			},

			setFriendInfo: function (friend, groups, positionAuth) {
				return http.post('/setFriendInfo', { friend, groups, positionAuth })
			},

			addFriend: function (friendUserName) {
				return http.post(`/addFriend`, { friendUserName })
			}


		}
	}
});
