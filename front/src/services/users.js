$$.service.registerService('breizbot.users', {

	deps: ['brainjs.resource'],

	init: function (config, resource) {

		const http = resource('/api/users')

		return {
			list: function () {
				return http.get('/')
			},

			match: function (match) {
				return http.get('/', { match })
			},

			add: function (data) {
				return http.post('/', data)
			},

			remove: function (user) {
				return http.delete(`/${user}`)
			},

			update: function (user, data) {
				return http.put(`/${user}`, data)
			},

			get: function (user) {
				return http.get(`/${user}`)
			},

			activateApp: function (appName, activated) {
				return http.post(`/activateApp`, { appName, activated })
			},

			changePwd: function (newPwd) {
				return http.post(`/changePwd`, { newPwd })
			},



			sendPosition: function (coords) {
				//console.log('sendFriendPosition', coords)
				return http.post('/position', coords)
			}
		}
	},
	$iface: `
		list():Promise;
		add(data):Promise;
		remove(user):Promise;
		update(user, data):Promise;
		get(user):Promise;
		activateApp(appName, activated):Promise;
		changePwd(newPwd):Promise;
	`
});
