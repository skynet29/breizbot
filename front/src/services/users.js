//@ts-check
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

			resetPwd: function(userName) {
				return http.post('/resetPwd', {userName})
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

			getUserSettings: function () {
				return http.post(`/getUserSettings`)
			},

			setUserSettings: function (settings) {
				return http.post(`/setUserSettings`, settings)
			}

		}
	}
});
