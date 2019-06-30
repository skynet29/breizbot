$$.control.registerControl('rootPage', {

	template: {gulp_inject: './main.html'},

	deps: ['app.browser'],

	init: function(elt, browser) {


		const ctrl = $$.viewController(elt, {
			data: {
				url: 'about:blank',
				results: []
			},
			events: {
				onSearch: function(ev) {					
					ev.preventDefault()
					const {url} = $(this).getFormData()
					console.log('onSearch', url)
					if (url.startsWith('https://') || url.startsWith('http://')) {
						ctrl.setData({results: [], url})	
					}
					else {
						browser.search(url).then((results) => {
							console.log('results', results)
							ctrl.setData({
								results, 
								url: 'about:blank'
							})
						})
					}					
				}

			}
		})

	}


});




