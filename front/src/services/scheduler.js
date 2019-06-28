$$.service.registerService('breizbot.scheduler', {

	deps: ['brainjs.http', 'breizbot.params'],

	init: function(config, http, params) {

		return {
			openApp: function(appName, appParams) {
				console.log('[scheduler] openApp', appName, appParams)
				return http.post(`/api/rtc/sendToClient`, {
					destId: params.$rootId,
					type: 'openApp', 
					data: {appName, appParams}
				})
			}		
		}
	},

	$iface: `
		openApp(appName, appParams):Promise;
		`
});
