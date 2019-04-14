$$.service.registerService('breizbot.users', {

	deps: ['brainjs.http'],

	init: function(config, http) {

		return {
			list: function() {
				return http.get('/api/users')
			},

			add: function(data) {
				return http.post('/api/users', data)
			},

			remove: function(user) {
				return http.delete(`/api/users/${user}`)
			},

			update: function(user, data) {
				return http.put(`/api/users/${user}`, data)
			},

			get: function(user) {
				return http.get(`/api/users/${user}`)
			},

			activateApp: function(appName, activated) {
				return http.post(`/api/users/activateApp`, {appName, activated})
			},

			sendNotif: function(to, notif) {
				return http.post(`/api/users/sendNotif`, {to, notif})
			},

			removeNotif: function(notifId) {
				return http.delete(`/api/users/removeNotif/${notifId}`)
			},

			getNotifs: function() {
				return http.get(`/api/users/getNotifs`)
			},
			
			getNotifCount: function() {
				return http.get(`/api/users/getNotifCount`)
			},
		}
	},
	$iface: `
		list():Promise;
		add(data):Promise;
		remove(user):Promise;
		update(user, data):Promise;
		get(user):Promise;
		activateApp(appName, activated):Promise;
		sendNotif(to, notif):Promise;
		removeNotif(notifId):Promise;
		getNotifs():Promise;
		getNotifCount():Promise
	`
});
