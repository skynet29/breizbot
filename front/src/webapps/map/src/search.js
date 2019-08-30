$$.control.registerControl('searchPage', {

	template: {gulp_inject: './search.html'},

	deps: ['breizbot.cities', 'breizbot.pager'],

	init: function(elt, srvCities, pager) {

		const ctrl = $$.viewController(elt, {
			data: {
				countries: [],
				currentCountry: '',
				cities: [],
				message: '',
				running: false
			},
			events: {
				onSubmit: function(ev) {
					ev.preventDefault()
					console.log('onSubmit')
					const {search} = $(this).getFormData()
					ctrl.setData({message: '', running: true})
					srvCities.getCities(ctrl.model.currentCountry, search).then((cities) => {
						console.log('cities', cities)
						const length = cities.length
						ctrl.setData({
							running: false,
							cities,
							message: length == 0 ? 'No result': `${length} match`
						})
					})
				},
				onItemClick: function(ev) {
					const idx = $(this).index()
					const info = ctrl.model.cities[idx]
					console.log('onItemClick', info)
					pager.popPage(info.coord)

				}
			}
		})

		srvCities.getCountries().then((countries) => {
			ctrl.setData({countries, currentCountry: 'FR'})
		})
	}
});
