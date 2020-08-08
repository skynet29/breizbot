$$.service.registerService('breizbot.notifs', {

	deps: ['brainjs.resource'],

	init: function (config, resource) {

		const http = resource('/api/notifs')

		return {
			sendNotif: function (to, notif) {
				return http.post(`/sendNotif`, { to, notif })
			},

			removeNotif: function (notifId) {
				return http.delete(`/removeNotif/${notifId}`)
			},

			getNotifs: function () {
				return http.get(`/getNotifs`)
			},

			getNotifCount: function () {
				return http.get(`/getNotifCount`)
			}

		}
	},
	$iface: `
		sendNotif(to, notif):Promise
		removeNotif(notifId):Promise
		getNotifs():Promise
		getNotifCount():Promise
	`
});
