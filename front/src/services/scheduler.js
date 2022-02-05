//@ts-check
$$.service.registerService('breizbot.scheduler', {

	deps: ['brainjs.http'],

	init: function(config, http) {

		return {
			openApp: function(appName, appParams, newTabTitle) {
				//console.log('[scheduler] openApp', appName, appParams, newTab)
				window.parent.postMessage({
					type: 'openApp',
					 data: {appName, appParams, newTabTitle}
					}, location.href)

			},
			logout: function() {
				console.log('[scheduler] logout')
				return http.post('/api/logout')
			}		 
		}
	}
});
