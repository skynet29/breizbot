//@ts-check
$$.control.registerControl('breizbot.alexa', {

	deps: ['brainjs.http'],

	init(elt, http) {
		const hash = window.location.hash.substr(1)

		//console.log('hash', hash)
		const params = $$.url.parseUrlParams(hash)
		//console.log('params', params)
		http.post('/api/alexa/auth', params).then(() => {
			window.close()
		})
	}
});
