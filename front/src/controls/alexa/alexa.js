$$.control.registerControl('breizbot.alexa', {

	deps: ['brainjs.http'],

	init(elt, http) {
		const hash = window.location.hash.substr(1)

		//console.log('hash', hash)
		const params = new URLSearchParams(hash)
		//console.log('params', params)
		const ret = {}
		for(let p of params) {
			//console.log('p', p)
			ret[p[0]] = p[1]
		}
		console.log('ret', ret)
		http.post('/api/alexa/auth', ret).then(() => {
			window.close()
		})
	}
});