$$.control.registerControl('rootPage', {

	template: {gulp_inject: './main.html'},

	deps: ['app.browser'],

	init: function(elt, browser) {


		const ctrl = $$.viewController(elt, {
			data: {
				url: 'about:blank',
				results: [],
				showClear: false
			},
			events: {
				onSearch: async function(ev, data) {					
					console.log('onSearch', data)
					const url = data.value
					if (url.startsWith('https://') || url.startsWith('http://')) {
						ctrl.setData({results: [], url})	
					}
					else {
						const results = await browser.search(url)
						//console.log('results', results)
						ctrl.setData({
							results, 
							url: 'about:blank'
						})
					}					
				}

			}
		})

	}


});




