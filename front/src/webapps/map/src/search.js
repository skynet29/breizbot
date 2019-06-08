$$.control.registerControl('searchPage', {

	template: {gulp_inject: './search.html'},

	deps: ['breizbot.cities'],

	props: {
		$pager: null
	},

	init: function(elt, srvCities) {
		const {$pager} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				countries: [],
				currentCountry: '',
				cities: []
			},
			events: {
				onSubmit: function(ev) {
					ev.preventDefault()
					console.log('onSubmit')
					const {search} = $(this).getFormData()
					srvCities.getCities(ctrl.model.currentCountry, search).then((cities) => {
						console.log('cities', cities)
						ctrl.setData({cities})
					})
				},
				onItemClick: function(ev) {
					const idx = $(this).index()
					const info = ctrl.model.cities[idx]
					console.log('onItemClick', info)
					$pager.popPage(info.coord)

				}
			}
		})

		srvCities.getCountries().then((countries) => {
			ctrl.setData({countries, currentCountry: 'FR'})
		})
	}
});
