$$.control.registerControl('rootPage', {

	deps: ['breizbot.broker', 'breizbot.appData', 'breizbot.pager'],

	template: "<div bn-control=\"brainjs.map\" \n	style=\"height: 100%\"\n	bn-iface=\"map\"\n	class=\"map\" \n	bn-data=\"{center, zoom, scale: true, coordinates: true}\"\n	></div>	\n<div class=\"toolbar\">\n	<div class=\"location\">\n		<label>Geolocation</label>\n		<div \n			bn-control=\"brainjs.flipswitch\"\n			bn-event=\"flipswitchchange: onLocationChange\"\n			data-width=\"100\"\n			data-height=\"25\"\n			>\n			\n		</div>		\n	</div>\n\n	<div bn-show=\"show1\">\n		<button class=\"w3-button w3-blue\" bn-event=\"click: onSearch\" title=\"Search city\">\n			<i class=\"fa fa-search-location\"></i>\n		</button>		\n	</div>\n\n</div>\n",

	init: function(elt, broker, appData, pager) {

		const {zoom, center} = appData.getData()
		console.log('center', center)

		const ctrl = $$.viewController(elt, {
			data: {
				center: center || {lat: 48.39, lng: -4.486},
				zoom: zoom || 13,
				watchID: null,
				show1: function() {
					return this.watchID == null
				}
			},
			events: {
				onSearch: function() {
					console.log('onSearch')
					pager.pushPage('searchPage', {
						title: 'Search City',
						onReturn: function(coord) {
							console.log('onReturn', coord)
							const latlng = {lat: coord.lat, lng: coord.lon}
							try {
								ctrl.scope.map.updateShape('marker', {latlng})
							}
							catch(e) {
								ctrl.scope.map.addShape('marker', {
									type: 'marker',
									latlng
								})
							}
							ctrl.scope.map.flyTo(latlng, 13)
						}						
					})
				},
				onLocationChange: function(ev, state) {
					console.log('onLocationChange', state)
					if (state == 'ON') {
						navigator.geolocation.getCurrentPosition(updateLocation)
						
						const watchID = navigator.geolocation.watchPosition(
							updateLocation,
							geoError,
							{
								enableHighAccuracy: true
							}
						)
						ctrl.setData({watchID})
					}
					else {
						navigator.geolocation.clearWatch(ctrl.model.watchID)
						ctrl.setData({watchID: null})
						ctrl.scope.map.removeShape('location')
					}
				}
			}
		})

		function geoError() {
			console.log('geolocation error')
		}

		function updateLocation(position) {
			const latlng = {
				lat: position.coords.latitude,
				lng: position.coords.longitude
			}
			console.log('updateLocation', latlng)
			try {
				ctrl.scope.map.updateShape('location', {latlng})
			}
			catch(e) {
				ctrl.scope.map.addShape('location', {
					type: 'marker',
					icon: {
						type: 'font',
						className: 'far fa-dot-circle',
						color: 'red',
						fontSize: 20
					},
					latlng
				})
			}
			ctrl.scope.map.panTo(latlng)			
		}

		broker.register('homebox.map.updateShape.*', (msg) => {

			const shapeId = msg.topic.split('.').pop()
			//console.log('shapeId', shapeId)

			const shape = msg.data

			if (shape == undefined) {
				ctrl.scope.map.removeShape(shapeId)
				return
			}

			try {
				ctrl.scope.map.updateShape(shapeId, shape)
			}
			catch(e) {
				ctrl.scope.map.addShape(shapeId, shape)
			}
		})

		this.onAppExit = function() {
			console.log('[map] onAppExit')
			const {map} = ctrl.scope
			return appData.saveData({zoom: map.getZoom(), center: map.getCenter()})
		}
	}
});





$$.control.registerControl('searchPage', {

	template: "<form bn-event=\"submit: onSubmit\" bn-show=\"show1\">\n	<div class=\"inputgroup\">\n		<label>Country:</label>\n		<span \n			bn-control=\"brainjs.selectmenu\"\n			bn-data=\"{items: countries}\"\n			bn-val=\"currentCountry\"\n			bn-update=\"selectmenuchange\"\n		></span>			\n	</div>\n	<div bn-control=\"brainjs.inputgroup\" class=\"inputgroup\">\n		<label>City</label>\n		<input type=\"text\" name=\"search\" required=\"\">\n	</div>\n	<div>\n		<button class=\"w3-button w3-blue\" type=\"submit\">\n			<i class=\"fa fa-search\"></i>\n		</button>\n	</div>\n\n</form>\n\n<div>\n	<strong bn-text=\"message\"></strong>\n</div>\n\n<div bn-show=\"running\">\n	<i class=\"fa fa-spinner fa-pulse\"></i> Running...\n</div>\n\n<div class=\"scrollPanel\" bn-show=\"show2\">\n	<ul class=\"w3-ul w3-border w3-white\" \n		bn-event=\"click.w3-bar: onItemClick\"\n		bn-each=\"cities\"\n		bn-show=\"show3\"\n		>\n		<li class=\"w3-bar\">\n\n			<div class=\"w3-bar-item\">\n				<span bn-text=\"$scope.$i.name\"></span>\n			</div>\n		</li>\n	</ul>	\n</div>\n	",

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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiLCJzZWFyY2guanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMzSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImFwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdyb290UGFnZScsIHtcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LmJyb2tlcicsICdicmVpemJvdC5hcHBEYXRhJywgJ2JyZWl6Ym90LnBhZ2VyJ10sXG5cblx0dGVtcGxhdGU6IFwiPGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLm1hcFxcXCIgXFxuXHRzdHlsZT1cXFwiaGVpZ2h0OiAxMDAlXFxcIlxcblx0Ym4taWZhY2U9XFxcIm1hcFxcXCJcXG5cdGNsYXNzPVxcXCJtYXBcXFwiIFxcblx0Ym4tZGF0YT1cXFwie2NlbnRlciwgem9vbSwgc2NhbGU6IHRydWUsIGNvb3JkaW5hdGVzOiB0cnVlfVxcXCJcXG5cdD48L2Rpdj5cdFxcbjxkaXYgY2xhc3M9XFxcInRvb2xiYXJcXFwiPlxcblx0PGRpdiBjbGFzcz1cXFwibG9jYXRpb25cXFwiPlxcblx0XHQ8bGFiZWw+R2VvbG9jYXRpb248L2xhYmVsPlxcblx0XHQ8ZGl2IFxcblx0XHRcdGJuLWNvbnRyb2w9XFxcImJyYWluanMuZmxpcHN3aXRjaFxcXCJcXG5cdFx0XHRibi1ldmVudD1cXFwiZmxpcHN3aXRjaGNoYW5nZTogb25Mb2NhdGlvbkNoYW5nZVxcXCJcXG5cdFx0XHRkYXRhLXdpZHRoPVxcXCIxMDBcXFwiXFxuXHRcdFx0ZGF0YS1oZWlnaHQ9XFxcIjI1XFxcIlxcblx0XHRcdD5cXG5cdFx0XHRcXG5cdFx0PC9kaXY+XHRcdFxcblx0PC9kaXY+XFxuXFxuXHQ8ZGl2IGJuLXNob3c9XFxcInNob3cxXFxcIj5cXG5cdFx0PGJ1dHRvbiBjbGFzcz1cXFwidzMtYnV0dG9uIHczLWJsdWVcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25TZWFyY2hcXFwiIHRpdGxlPVxcXCJTZWFyY2ggY2l0eVxcXCI+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLXNlYXJjaC1sb2NhdGlvblxcXCI+PC9pPlxcblx0XHQ8L2J1dHRvbj5cdFx0XFxuXHQ8L2Rpdj5cXG5cXG48L2Rpdj5cXG5cIixcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIGJyb2tlciwgYXBwRGF0YSwgcGFnZXIpIHtcblxuXHRcdGNvbnN0IHt6b29tLCBjZW50ZXJ9ID0gYXBwRGF0YS5nZXREYXRhKClcblx0XHRjb25zb2xlLmxvZygnY2VudGVyJywgY2VudGVyKVxuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRjZW50ZXI6IGNlbnRlciB8fCB7bGF0OiA0OC4zOSwgbG5nOiAtNC40ODZ9LFxuXHRcdFx0XHR6b29tOiB6b29tIHx8IDEzLFxuXHRcdFx0XHR3YXRjaElEOiBudWxsLFxuXHRcdFx0XHRzaG93MTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMud2F0Y2hJRCA9PSBudWxsXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25TZWFyY2g6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvblNlYXJjaCcpXG5cdFx0XHRcdFx0cGFnZXIucHVzaFBhZ2UoJ3NlYXJjaFBhZ2UnLCB7XG5cdFx0XHRcdFx0XHR0aXRsZTogJ1NlYXJjaCBDaXR5Jyxcblx0XHRcdFx0XHRcdG9uUmV0dXJuOiBmdW5jdGlvbihjb29yZCkge1xuXHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25SZXR1cm4nLCBjb29yZClcblx0XHRcdFx0XHRcdFx0Y29uc3QgbGF0bG5nID0ge2xhdDogY29vcmQubGF0LCBsbmc6IGNvb3JkLmxvbn1cblx0XHRcdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdFx0XHRjdHJsLnNjb3BlLm1hcC51cGRhdGVTaGFwZSgnbWFya2VyJywge2xhdGxuZ30pXG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0Y2F0Y2goZSkge1xuXHRcdFx0XHRcdFx0XHRcdGN0cmwuc2NvcGUubWFwLmFkZFNoYXBlKCdtYXJrZXInLCB7XG5cdFx0XHRcdFx0XHRcdFx0XHR0eXBlOiAnbWFya2VyJyxcblx0XHRcdFx0XHRcdFx0XHRcdGxhdGxuZ1xuXHRcdFx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0Y3RybC5zY29wZS5tYXAuZmx5VG8obGF0bG5nLCAxMylcblx0XHRcdFx0XHRcdH1cdFx0XHRcdFx0XHRcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkxvY2F0aW9uQ2hhbmdlOiBmdW5jdGlvbihldiwgc3RhdGUpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25Mb2NhdGlvbkNoYW5nZScsIHN0YXRlKVxuXHRcdFx0XHRcdGlmIChzdGF0ZSA9PSAnT04nKSB7XG5cdFx0XHRcdFx0XHRuYXZpZ2F0b3IuZ2VvbG9jYXRpb24uZ2V0Q3VycmVudFBvc2l0aW9uKHVwZGF0ZUxvY2F0aW9uKVxuXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRjb25zdCB3YXRjaElEID0gbmF2aWdhdG9yLmdlb2xvY2F0aW9uLndhdGNoUG9zaXRpb24oXG5cdFx0XHRcdFx0XHRcdHVwZGF0ZUxvY2F0aW9uLFxuXHRcdFx0XHRcdFx0XHRnZW9FcnJvcixcblx0XHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRcdGVuYWJsZUhpZ2hBY2N1cmFjeTogdHJ1ZVxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHQpXG5cdFx0XHRcdFx0XHRjdHJsLnNldERhdGEoe3dhdGNoSUR9KVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRcdG5hdmlnYXRvci5nZW9sb2NhdGlvbi5jbGVhcldhdGNoKGN0cmwubW9kZWwud2F0Y2hJRClcblx0XHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7d2F0Y2hJRDogbnVsbH0pXG5cdFx0XHRcdFx0XHRjdHJsLnNjb3BlLm1hcC5yZW1vdmVTaGFwZSgnbG9jYXRpb24nKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHRmdW5jdGlvbiBnZW9FcnJvcigpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdnZW9sb2NhdGlvbiBlcnJvcicpXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gdXBkYXRlTG9jYXRpb24ocG9zaXRpb24pIHtcblx0XHRcdGNvbnN0IGxhdGxuZyA9IHtcblx0XHRcdFx0bGF0OiBwb3NpdGlvbi5jb29yZHMubGF0aXR1ZGUsXG5cdFx0XHRcdGxuZzogcG9zaXRpb24uY29vcmRzLmxvbmdpdHVkZVxuXHRcdFx0fVxuXHRcdFx0Y29uc29sZS5sb2coJ3VwZGF0ZUxvY2F0aW9uJywgbGF0bG5nKVxuXHRcdFx0dHJ5IHtcblx0XHRcdFx0Y3RybC5zY29wZS5tYXAudXBkYXRlU2hhcGUoJ2xvY2F0aW9uJywge2xhdGxuZ30pXG5cdFx0XHR9XG5cdFx0XHRjYXRjaChlKSB7XG5cdFx0XHRcdGN0cmwuc2NvcGUubWFwLmFkZFNoYXBlKCdsb2NhdGlvbicsIHtcblx0XHRcdFx0XHR0eXBlOiAnbWFya2VyJyxcblx0XHRcdFx0XHRpY29uOiB7XG5cdFx0XHRcdFx0XHR0eXBlOiAnZm9udCcsXG5cdFx0XHRcdFx0XHRjbGFzc05hbWU6ICdmYXIgZmEtZG90LWNpcmNsZScsXG5cdFx0XHRcdFx0XHRjb2xvcjogJ3JlZCcsXG5cdFx0XHRcdFx0XHRmb250U2l6ZTogMjBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGxhdGxuZ1xuXHRcdFx0XHR9KVxuXHRcdFx0fVxuXHRcdFx0Y3RybC5zY29wZS5tYXAucGFuVG8obGF0bG5nKVx0XHRcdFxuXHRcdH1cblxuXHRcdGJyb2tlci5yZWdpc3RlcignaG9tZWJveC5tYXAudXBkYXRlU2hhcGUuKicsIChtc2cpID0+IHtcblxuXHRcdFx0Y29uc3Qgc2hhcGVJZCA9IG1zZy50b3BpYy5zcGxpdCgnLicpLnBvcCgpXG5cdFx0XHQvL2NvbnNvbGUubG9nKCdzaGFwZUlkJywgc2hhcGVJZClcblxuXHRcdFx0Y29uc3Qgc2hhcGUgPSBtc2cuZGF0YVxuXG5cdFx0XHRpZiAoc2hhcGUgPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdGN0cmwuc2NvcGUubWFwLnJlbW92ZVNoYXBlKHNoYXBlSWQpXG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXG5cdFx0XHR0cnkge1xuXHRcdFx0XHRjdHJsLnNjb3BlLm1hcC51cGRhdGVTaGFwZShzaGFwZUlkLCBzaGFwZSlcblx0XHRcdH1cblx0XHRcdGNhdGNoKGUpIHtcblx0XHRcdFx0Y3RybC5zY29wZS5tYXAuYWRkU2hhcGUoc2hhcGVJZCwgc2hhcGUpXG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdHRoaXMub25BcHBFeGl0ID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnW21hcF0gb25BcHBFeGl0Jylcblx0XHRcdGNvbnN0IHttYXB9ID0gY3RybC5zY29wZVxuXHRcdFx0cmV0dXJuIGFwcERhdGEuc2F2ZURhdGEoe3pvb206IG1hcC5nZXRab29tKCksIGNlbnRlcjogbWFwLmdldENlbnRlcigpfSlcblx0XHR9XG5cdH1cbn0pO1xuXG5cblxuXG4iLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnc2VhcmNoUGFnZScsIHtcblxuXHR0ZW1wbGF0ZTogXCI8Zm9ybSBibi1ldmVudD1cXFwic3VibWl0OiBvblN1Ym1pdFxcXCIgYm4tc2hvdz1cXFwic2hvdzFcXFwiPlxcblx0PGRpdiBjbGFzcz1cXFwiaW5wdXRncm91cFxcXCI+XFxuXHRcdDxsYWJlbD5Db3VudHJ5OjwvbGFiZWw+XFxuXHRcdDxzcGFuIFxcblx0XHRcdGJuLWNvbnRyb2w9XFxcImJyYWluanMuc2VsZWN0bWVudVxcXCJcXG5cdFx0XHRibi1kYXRhPVxcXCJ7aXRlbXM6IGNvdW50cmllc31cXFwiXFxuXHRcdFx0Ym4tdmFsPVxcXCJjdXJyZW50Q291bnRyeVxcXCJcXG5cdFx0XHRibi11cGRhdGU9XFxcInNlbGVjdG1lbnVjaGFuZ2VcXFwiXFxuXHRcdD48L3NwYW4+XHRcdFx0XFxuXHQ8L2Rpdj5cXG5cdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dGdyb3VwXFxcIiBjbGFzcz1cXFwiaW5wdXRncm91cFxcXCI+XFxuXHRcdDxsYWJlbD5DaXR5PC9sYWJlbD5cXG5cdFx0PGlucHV0IHR5cGU9XFxcInRleHRcXFwiIG5hbWU9XFxcInNlYXJjaFxcXCIgcmVxdWlyZWQ9XFxcIlxcXCI+XFxuXHQ8L2Rpdj5cXG5cdDxkaXY+XFxuXHRcdDxidXR0b24gY2xhc3M9XFxcInczLWJ1dHRvbiB3My1ibHVlXFxcIiB0eXBlPVxcXCJzdWJtaXRcXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1zZWFyY2hcXFwiPjwvaT5cXG5cdFx0PC9idXR0b24+XFxuXHQ8L2Rpdj5cXG5cXG48L2Zvcm0+XFxuXFxuPGRpdj5cXG5cdDxzdHJvbmcgYm4tdGV4dD1cXFwibWVzc2FnZVxcXCI+PC9zdHJvbmc+XFxuPC9kaXY+XFxuXFxuPGRpdiBibi1zaG93PVxcXCJydW5uaW5nXFxcIj5cXG5cdDxpIGNsYXNzPVxcXCJmYSBmYS1zcGlubmVyIGZhLXB1bHNlXFxcIj48L2k+IFJ1bm5pbmcuLi5cXG48L2Rpdj5cXG5cXG48ZGl2IGNsYXNzPVxcXCJzY3JvbGxQYW5lbFxcXCIgYm4tc2hvdz1cXFwic2hvdzJcXFwiPlxcblx0PHVsIGNsYXNzPVxcXCJ3My11bCB3My1ib3JkZXIgdzMtd2hpdGVcXFwiIFxcblx0XHRibi1ldmVudD1cXFwiY2xpY2sudzMtYmFyOiBvbkl0ZW1DbGlja1xcXCJcXG5cdFx0Ym4tZWFjaD1cXFwiY2l0aWVzXFxcIlxcblx0XHRibi1zaG93PVxcXCJzaG93M1xcXCJcXG5cdFx0Plxcblx0XHQ8bGkgY2xhc3M9XFxcInczLWJhclxcXCI+XFxuXFxuXHRcdFx0PGRpdiBjbGFzcz1cXFwidzMtYmFyLWl0ZW1cXFwiPlxcblx0XHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwiJHNjb3BlLiRpLm5hbWVcXFwiPjwvc3Bhbj5cXG5cdFx0XHQ8L2Rpdj5cXG5cdFx0PC9saT5cXG5cdDwvdWw+XHRcXG48L2Rpdj5cXG5cdFwiLFxuXG5cdGRlcHM6IFsnYnJlaXpib3QuY2l0aWVzJywgJ2JyZWl6Ym90LnBhZ2VyJ10sXG5cblx0aW5pdDogZnVuY3Rpb24oZWx0LCBzcnZDaXRpZXMsIHBhZ2VyKSB7XG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGNvdW50cmllczogW10sXG5cdFx0XHRcdGN1cnJlbnRDb3VudHJ5OiAnJyxcblx0XHRcdFx0Y2l0aWVzOiBbXSxcblx0XHRcdFx0bWVzc2FnZTogJycsXG5cdFx0XHRcdHJ1bm5pbmc6IGZhbHNlLFxuXHRcdFx0XHRzaG93MTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuY291bnRyaWVzLmxlbmd0aCA+IDBcblx0XHRcdFx0fSxcblx0XHRcdFx0c2hvdzI6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLmNvdW50cmllcy5sZW5ndGggPiAwICYmIHRoaXMuY2l0aWVzLmxlbmd0aCA+IDBcblx0XHRcdFx0fSxcblx0XHRcdFx0c2hvdzM6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLmNpdGllcy5sZW5ndGggPiAwXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25TdWJtaXQ6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0ZXYucHJldmVudERlZmF1bHQoKVxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvblN1Ym1pdCcpXG5cdFx0XHRcdFx0Y29uc3Qge3NlYXJjaH0gPSAkKHRoaXMpLmdldEZvcm1EYXRhKClcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoe21lc3NhZ2U6ICcnLCBydW5uaW5nOiB0cnVlfSlcblx0XHRcdFx0XHRzcnZDaXRpZXMuZ2V0Q2l0aWVzKGN0cmwubW9kZWwuY3VycmVudENvdW50cnksIHNlYXJjaCkudGhlbigoY2l0aWVzKSA9PiB7XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZygnY2l0aWVzJywgY2l0aWVzKVxuXHRcdFx0XHRcdFx0Y29uc3QgbGVuZ3RoID0gY2l0aWVzLmxlbmd0aFxuXHRcdFx0XHRcdFx0Y3RybC5zZXREYXRhKHtcblx0XHRcdFx0XHRcdFx0cnVubmluZzogZmFsc2UsXG5cdFx0XHRcdFx0XHRcdGNpdGllcyxcblx0XHRcdFx0XHRcdFx0bWVzc2FnZTogbGVuZ3RoID09IDAgPyAnTm8gcmVzdWx0JzogYCR7bGVuZ3RofSBtYXRjaGBcblx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fSxcblx0XHRcdFx0b25JdGVtQ2xpY2s6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Y29uc3QgaWR4ID0gJCh0aGlzKS5pbmRleCgpXG5cdFx0XHRcdFx0Y29uc3QgaW5mbyA9IGN0cmwubW9kZWwuY2l0aWVzW2lkeF1cblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25JdGVtQ2xpY2snLCBpbmZvKVxuXHRcdFx0XHRcdHBhZ2VyLnBvcFBhZ2UoaW5mby5jb29yZClcblxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdHNydkNpdGllcy5nZXRDb3VudHJpZXMoKS50aGVuKChjb3VudHJpZXMpID0+IHtcblx0XHRcdGN0cmwuc2V0RGF0YSh7Y291bnRyaWVzLCBjdXJyZW50Q291bnRyeTogJ0ZSJ30pXG5cdFx0fSlcblx0fVxufSk7XG4iXX0=
