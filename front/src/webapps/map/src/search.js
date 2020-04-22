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
				running: false,
				show1: function() {
					return this.countries.length > 0
				},
				show2: function() {
					return this.countries.length > 0 && this.cities.length > 0
				},
				show3: function() {
					return this.cities.length > 0
				}
			},
			events: {
				onSubmit: async function(ev) {
					ev.preventDefault()
					console.log('onSubmit')
					const {search} = $(this).getFormData()
					ctrl.setData({message: '', running: true})
					const cities = await srvCities.getCities(ctrl.model.currentCountry, search)
					console.log('cities', cities)
					const length = cities.length
					ctrl.setData({
						running: false,
						cities,
						message: length == 0 ? 'No result': `${length} match`
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

		async function getCountries() {
			const countries = await srvCities.getCountries()
			ctrl.setData({countries, currentCountry: 'FR'})
		}

		getCountries()
	}
});
