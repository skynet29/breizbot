//@ts-check
$$.control.registerControl('rootPage', {

	deps: ['breizbot.broker', 'breizbot.appData', 'breizbot.pager', 'breizbot.radar', 'breizbot.files', 'breizbot.http'],

	template: "<div class=\"toolbar\">\n	<div class=\"location\">\n		<label>Geolocation</label>\n		<div \n			bn-control=\"brainjs.flipswitch\"\n			bn-event=\"flipswitchchange: onLocationChange\"\n			>\n			\n		</div>		\n	</div>\n\n	<div bn-style=\"{visibility: show1}\">\n		<button class=\"w3-button\" bn-event=\"click: onSearch\" title=\"Search city\" bn-icon=\"fa fa-search-location\">\n		</button>	\n		<button class=\"w3-button\" bn-event=\"click: onAddMarker\" title=\"Add Marker\" bn-icon=\"fa-solid fa-location-dot\">\n		</button>	\n		<button class=\"w3-button\" bn-event=\"click: onImportKml\" title=\"Import KML file\" bn-icon=\"fa-solid fa-globe\">\n		</button>			\n	</div>\n\n</div>\n\n\n<div bn-control=\"brainjs.map\" \n	style=\"height: 100%\"\n	bn-iface=\"map\"\n	class=\"map\" \n	bn-data=\"{\n		center, \n		zoom, \n		scale: true, \n		coordinates: true,\n		contextMenu: {\n			addMarker: {\n				name: \'Add Marker\'\n			}\n		},\n		layers: {\n			friends: {label: \'Friends\', visible: true},\n			markers: {label: \'Markers\', visible: true},\n			radar: {label: \'Radar\', visible: false, cluster: true}\n		}\n	}\"\n	bn-event=\"mapcontextmenu: onMapContextMenu, mapshapecontextmenu: onShapeContextMenu\"\n	></div>	\n",

	/**
	 * 
	 * @param {Breizbot.Services.Broker.Interface} broker 
	 * @param {Breizbot.Services.AppData.Interface} appData 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 * @param {Breizbot.Services.Radar.Interface} radarSrv
	 * @param {Breizbot.Services.Files.Interface} filesSrv
	 * @param {Breizbot.Services.Http.Interface} http
	 */
	init: function (elt, broker, appData, pager, radarSrv, filesSrv, http) {

		let { zoom, center, markers, layers } = appData.getData()
		console.log('appData', appData.getData())
		markers = markers || {}
		layers = layers || {}

		const ctrl = $$.viewController(elt, {
			data: {
				center: center || { lat: 48.39, lng: -4.486 },
				zoom: zoom || 13,
				watchID: null,
				show1: function () {
					return (this.watchID == null) ? 'visible' : 'hidden'
				}
			},
			events: {
				/**
				 * 
				 * @param {Brainjs.Controls.Map.EventData.MapShapeContextMenu} data 
				 */
				onShapeContextMenu: function (ev, data) {
					//console.log('onShapeContextMenu', data)
					const { id, cmd } = data
					if (cmd == 'remove') {
						map.removeShape(id)
						delete markers[id]
					}
					if (cmd == "zoom") {
						/**@type {Brainjs.Controls.Map.Shape.Marker} */
						// @ts-ignore
						const info = map.getShapeInfo(id)
						//console.log('info', info)
						map.flyTo(info.latlng, 13)
					}

				},
				/**
				 * 
				 * @param {Brainjs.Controls.Map.EventData.MapContextMenu} data 
				 */
				onMapContextMenu: async function (ev, data) {
					//console.log('onMapContextMenu', data)
					const { latlng } = data
					const tooltip = await $$.ui.showPrompt({
						title: 'Add Marker',
						label: 'Tooltip'
					})
					if (tooltip) {
						const shapeId = 'ID' + Date.now()
						addMarker(shapeId, latlng, tooltip)
						markers[shapeId] = { latlng, tooltip }

					}

				},
				onAddMarker: function() {
					console.log('Add Marker')
					$$.ui.showForm({
						title: 'Add Marker',
						fields: {
							lat: {
								label: 'Latitude: ',
								input: 'input',
								attrs: {
									type: 'number',
									step: 'any',
								}
							},
							lng: {
								label: 'Longitude: ',
								input: 'input',
								attrs: {
									type: 'number',
									step: 'any'
								}
							},
							label: {
								label: 'Label:',
								input: 'input',
								attrs: {
									type: 'text'
								}
							}
						}
					}, (data) => {
						console.log(data)
						const {lat, lng, label: tooltip} = data
						const latlng = {lat, lng}
						const shapeId = 'ID' + Date.now()
						addMarker(shapeId, latlng, tooltip)
						markers[shapeId] = { latlng, tooltip }
					})
				},
				onImportKml: function() {
					console.log('onInportKml')
					filesSrv.openFile('Import KML', {filterExtension: 'kml'}, async (data) => {
						console.log('data', data)
						try {
							const kml = await http.post('/importKml', data)
							console.log('kml', kml)
							pager.pushPage('importKml', {
								title: 'Import KML',
								props: {
									kml
								},
								onReturn: function({indexes, layerLabel}) {
									console.log({indexes, layerLabel})
									map.addLayer(layerLabel, {label: layerLabel, visible: true, openPopupOnActivate: true})
									layers[layerLabel] = []

									for(const idx of indexes) {
										const {Point, name} = kml[idx]
										const [lng, lat] = Point.coordinates.split(',').map(a => parseFloat(a))
										console.log({name, lng, lat})

										const shapeId = 'ID' + Date.now()
										addMarker(shapeId, {lat, lng}, name, layerLabel)
										layers[layerLabel].push({lat, lng, label: name})
									}
									saveData()
								}
							})
						}
						catch(e) {
							console.log('Error', e)
							$$.ui.showAlert({title: 'Error', content: e})
						}
						
					})
				},
				onSearch: function () {
					//console.log('onSearch')
					pager.pushPage('searchPage', {
						title: 'Search City',
						/**
						 * 
						 * @param {Breizbot.Services.City.CityCoordinates} coord 
						 */
						onReturn: function (coord) {
							//console.log('onReturn', coord)
							const latlng = { lat: coord.lat, lng: coord.lon }
							try {
								map.updateShape('marker', { latlng })
							}
							catch (e) {
								map.addShape('marker', {
									type: 'marker',
									latlng
								})
							}
							map.flyTo(latlng, 13)
						}
					})
				},
				onLocationChange: function (ev, state) {
					//console.log('onLocationChange', state)
					if (state) {
						navigator.geolocation.getCurrentPosition(updateLocation)

						const watchID = navigator.geolocation.watchPosition(
							updateLocation,
							geoError,
							{
								enableHighAccuracy: true
							}
						)
						ctrl.setData({ watchID })
					}
					else {
						navigator.geolocation.clearWatch(ctrl.model.watchID)
						ctrl.setData({ watchID: null })
						map.removeShape('location')
					}
				}
			}
		})

		/**@type {Brainjs.Controls.Map.Interface} */
		const map = ctrl.scope.map

		const radarTypeUrls = {
			'Radar fixe': filesSrv.assetsUrl('radar_fixe.png'),
			'Radar feu rouge': filesSrv.assetsUrl('radar_feu_rouge.png'),
			'Radar discriminant': filesSrv.assetsUrl('radar_discriminant.png'),
			'Radar Vitesse Moyenne': filesSrv.assetsUrl('radar_vitesse_moyenne.png'),

		}



		async function initMarkers() {

			for (const [id, data] of Object.entries(markers)) {
				addMarker(id, data.latlng, data.tooltip)
			}

			for (const [layerName, markerInfos] of Object.entries(layers)) {
				map.addLayer(layerName, {label: layerName, visible: false, openPopupOnActivate: true})
				for(const {lat, lng, label} of markerInfos) {
					const shapeId = 'ID_' + label.toUpperCase().replaceAll(' ', '_')
					addMarker(shapeId, {lat, lng}, label, layerName)
				}				
			}


			const radars = await radarSrv.getRadar()
			console.log({ radars })

			map.addGeoData(radars, 'radar', {
				pointToLayer: (feature, latlng) => {
					const iconUrl = radarTypeUrls[feature.properties.type]
					if (iconUrl != undefined) {
						const iconOptions = {
							iconSize: [91, 99],
							iconAnchor: [40, 99],
							popupAnchor: [20, -85],
							iconUrl
						}

						return map.createMarkerIcon(latlng, iconOptions)
					}
				},
				onPopup: (feature) => {
					let ret = []
					if (feature.properties.route)
						ret.push(feature.properties.route)
						
					ret.push(feature.properties.type)
					const {speed} = feature.properties
					if (typeof speed == 'number') {
						//ret.push(`Vitesse limitée à ${speed} km`)
						const speedUrl = filesSrv.assetsUrl(`vitesse-${speed}.png`)
						ret.push(`<img src="${speedUrl}" style="margin-top: 10px">`)
					}
					return `<b>${ret.join('<br>')}</b>`
				}
			})

		}

		initMarkers()


		/**
		 * 
		 * @param {string} shapeId 
		 * @param {Brainjs.Controls.Map.LatLng} latlng 
		 * @param {string} tooltip 
		 */
		function addMarker(shapeId, latlng, tooltip, layerId) {
			//console.log('addMarker', shapeId, latlng, tooltip)
			/**@type {Brainjs.Controls.Map.Shape.Marker} */
			const shapeInfo = {
				type: 'marker',
				layer: (layerId) ? layerId : 'markers',
				latlng,
				icon: {
					type: 'font',
					className: 'far fa-dot-circle',
					color: 'green',
					fontSize: 20
				},

				popup: {
					content: tooltip,
					className: 'myToolTip',
					closeButton: false
				},
				contextMenu: {
					remove: {
						name: 'Remove',
						iconCls: 'fas fa-trash-alt w3-text-blue',
					},
					zoom: {
						name: 'Zoom',
						iconCls: 'fas fa-search-plus w3-text-blue'
					}
				}
			}
			map.addShape(shapeId, shapeInfo)

		}


		function geoError() {
			console.log('geolocation error')
		}

		/**
		 * 
		 * @param {GeolocationPosition} position 
		 */
		function updateLocation(position) {
			const latlng = {
				lat: position.coords.latitude,
				lng: position.coords.longitude
			}
			//console.log('updateLocation', latlng)
			try {
				map.updateShape('location', { latlng })
			}
			catch (e) {
				map.addShape('location', {
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
			map.panTo(latlng)
		}

		broker.register('breizbot.friendPosition', (msg) => {
			if (msg.hist) {
				return
			}
			/**@type {Breizbot.Services.Broker.Events.FriendPosition} */
			const data = msg.data
			//console.log('breizbot.friendPosition', msg)	
			const time = new Date(msg.time).toLocaleTimeString('fr-FR')
			const shapeId = 'friends.' + data.userName
			const popupContent = data.userName + '<br>' + time
			try {
				map.updateShape(shapeId, {
					latlng: data.coords,
					popupContent
				})
			}
			catch (e) {
				map.addShape(shapeId, {
					type: 'marker',
					layer: 'friends',
					latlng: data.coords,
					icon: {
						type: 'font',
						className: 'far fa-user',
						color: 'blue',
						fontSize: 20
					},

					popup: {
						content: popupContent,
						className: 'myToolTip',
						closeButton: false
					}
				})
			}

		})

		broker.register('homebox.map.updateShape.*', (msg) => {

			const shapeId = msg.topic.split('.').pop()
			//console.log('shapeId', shapeId)

			const shape = msg.data

			if (shape == undefined) {
				map.removeShape(shapeId)
				return
			}

			try {
				map.updateShape(shapeId, shape)
			}
			catch (e) {
				map.addShape(shapeId, shape)
			}
		})

		function saveData() {
			return appData.saveData({
				zoom: map.getZoom(),
				center: map.getCenter(),
				markers,
				layers
			})
		}

		this.onAppExit = function () {
			//console.log('[map] onAppExit')
			return saveData()
		}
	}
});





//@ts-check
$$.control.registerControl('searchPage', {

	template: "<form bn-event=\"submit: onSubmit\" bn-show=\"show1\">\n	<div class=\"inputgroup\">\n		<label>Country:</label>\n		<span \n			bn-control=\"brainjs.combobox\"\n			bn-data=\"{items: countries}\"\n			bn-val=\"currentCountry\"\n			bn-update=\"comboboxchange\"\n		></span>			\n	</div>\n	<div bn-control=\"brainjs.inputgroup\" class=\"inputgroup\">\n		<label>City</label>\n		<input type=\"text\" name=\"search\" required=\"\">\n	</div>\n	<div>\n		<button class=\"w3-button w3-blue\" type=\"submit\">\n			<i class=\"fa fa-search\"></i>\n		</button>\n	</div>\n\n</form>\n\n<div>\n	<strong bn-text=\"message\"></strong>\n</div>\n\n<div bn-show=\"running\">\n	<i class=\"fa fa-spinner fa-pulse\"></i> Running...\n</div>\n\n<div class=\"scrollPanel\" bn-show=\"show2\">\n	<ul class=\"w3-ul w3-border w3-white\" \n		bn-event=\"click.w3-bar: onItemClick\"\n		bn-each=\"cities\"\n		bn-show=\"show3\"\n		>\n		<li class=\"w3-bar\">\n\n			<div class=\"w3-bar-item\">\n				<span bn-text=\"$scope.$i.name\"></span>\n			</div>\n		</li>\n	</ul>	\n</div>\n	",

	deps: ['breizbot.cities', 'breizbot.pager'],

	/**
	 * 
	 * @param {Breizbot.Services.City.Interface} srvCities 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 */
	init: function(elt, srvCities, pager) {

		const ctrl = $$.viewController(elt, {
			data: {
				/**@type {string[]} */
				countries: [],
				currentCountry: '',
				/**@type {Breizbot.Services.City.CityInfo[]} */
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
					/**@type {Breizbot.Services.City.CityInfo} */
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

$$.control.registerControl('importKml', {
    template: "<form bn-event=\"submit: onSubmit\">\n    <label>Layer Name</label>\n    <input type=\"text\" name=\"text\" required>\n    <input type=\"submit\"  value=\"Submit\" hidden bn-bind=\"submit\"> \n</form>\n<div class=\"scrollPanel\">\n    <table class=\"w3-table-all w3-small\">\n        <thead>\n            <tr>\n                <th>\n                    <input type=\"checkbox\" checked bn-event=\"click: onSelectChange\">\n                </th>\n                <th>Name</th>\n                <th>Description</th>\n            </tr>\n        </thead>\n        <tbody bn-each=\"kml\">\n            <tr>\n                <td>\n                    <input type=\"checkbox\" checked class=\"check\">\n                </td>\n                <td bn-text=\"$scope.$i.name\"></td>\n                <td bn-text=\"$scope.$i.description\"></td>\n\n            </tr>\n        </tbody>\n    </table>\n</div>\n",

    deps: ['breizbot.pager'],

    props: {
        kml: null
    },

    /**
     * 
     * @param {*} elt 
     * @param {Breizbot.Services.Pager.Interface} pager 
     */
    init: function (elt, pager)  {
        const { kml } = this.props

        const ctrl = $$.viewController(elt, {
            data: {
                kml
            },
            events: {
                onSelectChange: function () {
                    const checked = $(this).prop('checked')
                    console.log('onSelectChange', checked)
                    elt.find('.check').prop('checked', checked)
                },
                onSubmit: function(ev) {
                    ev.preventDefault()
                    const data = $(this).getFormData()
                    console.log('onSubmit', data)
                    const indexes = []
                    elt.find('.check').each(function(index) {
                        if ($(this).prop('checked')) {
                            indexes.push(index)
                        }
                    })
                    //console.log({indexes})
                    pager.popPage({indexes, layerLabel: data.text})
                }
            }
        })

        this.getButtons = function () {
            return {
                apply: {
                    title: 'Apply',
                    icon: 'fas fa-check',
                    onClick: function () {
                        ctrl.scope.submit.click()
                    }
                }
            }
        }
    }
})
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiLCJzZWFyY2guanMiLCJpbXBvcnRLbWwvaW1wb3J0S21sLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzFaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy9AdHMtY2hlY2tcbiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdyb290UGFnZScsIHtcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LmJyb2tlcicsICdicmVpemJvdC5hcHBEYXRhJywgJ2JyZWl6Ym90LnBhZ2VyJywgJ2JyZWl6Ym90LnJhZGFyJywgJ2JyZWl6Ym90LmZpbGVzJywgJ2JyZWl6Ym90Lmh0dHAnXSxcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGNsYXNzPVxcXCJ0b29sYmFyXFxcIj5cXG5cdDxkaXYgY2xhc3M9XFxcImxvY2F0aW9uXFxcIj5cXG5cdFx0PGxhYmVsPkdlb2xvY2F0aW9uPC9sYWJlbD5cXG5cdFx0PGRpdiBcXG5cdFx0XHRibi1jb250cm9sPVxcXCJicmFpbmpzLmZsaXBzd2l0Y2hcXFwiXFxuXHRcdFx0Ym4tZXZlbnQ9XFxcImZsaXBzd2l0Y2hjaGFuZ2U6IG9uTG9jYXRpb25DaGFuZ2VcXFwiXFxuXHRcdFx0Plxcblx0XHRcdFxcblx0XHQ8L2Rpdj5cdFx0XFxuXHQ8L2Rpdj5cXG5cXG5cdDxkaXYgYm4tc3R5bGU9XFxcInt2aXNpYmlsaXR5OiBzaG93MX1cXFwiPlxcblx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25TZWFyY2hcXFwiIHRpdGxlPVxcXCJTZWFyY2ggY2l0eVxcXCIgYm4taWNvbj1cXFwiZmEgZmEtc2VhcmNoLWxvY2F0aW9uXFxcIj5cXG5cdFx0PC9idXR0b24+XHRcXG5cdFx0PGJ1dHRvbiBjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uQWRkTWFya2VyXFxcIiB0aXRsZT1cXFwiQWRkIE1hcmtlclxcXCIgYm4taWNvbj1cXFwiZmEtc29saWQgZmEtbG9jYXRpb24tZG90XFxcIj5cXG5cdFx0PC9idXR0b24+XHRcXG5cdFx0PGJ1dHRvbiBjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uSW1wb3J0S21sXFxcIiB0aXRsZT1cXFwiSW1wb3J0IEtNTCBmaWxlXFxcIiBibi1pY29uPVxcXCJmYS1zb2xpZCBmYS1nbG9iZVxcXCI+XFxuXHRcdDwvYnV0dG9uPlx0XHRcdFxcblx0PC9kaXY+XFxuXFxuPC9kaXY+XFxuXFxuXFxuPGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLm1hcFxcXCIgXFxuXHRzdHlsZT1cXFwiaGVpZ2h0OiAxMDAlXFxcIlxcblx0Ym4taWZhY2U9XFxcIm1hcFxcXCJcXG5cdGNsYXNzPVxcXCJtYXBcXFwiIFxcblx0Ym4tZGF0YT1cXFwie1xcblx0XHRjZW50ZXIsIFxcblx0XHR6b29tLCBcXG5cdFx0c2NhbGU6IHRydWUsIFxcblx0XHRjb29yZGluYXRlczogdHJ1ZSxcXG5cdFx0Y29udGV4dE1lbnU6IHtcXG5cdFx0XHRhZGRNYXJrZXI6IHtcXG5cdFx0XHRcdG5hbWU6IFxcJ0FkZCBNYXJrZXJcXCdcXG5cdFx0XHR9XFxuXHRcdH0sXFxuXHRcdGxheWVyczoge1xcblx0XHRcdGZyaWVuZHM6IHtsYWJlbDogXFwnRnJpZW5kc1xcJywgdmlzaWJsZTogdHJ1ZX0sXFxuXHRcdFx0bWFya2Vyczoge2xhYmVsOiBcXCdNYXJrZXJzXFwnLCB2aXNpYmxlOiB0cnVlfSxcXG5cdFx0XHRyYWRhcjoge2xhYmVsOiBcXCdSYWRhclxcJywgdmlzaWJsZTogZmFsc2UsIGNsdXN0ZXI6IHRydWV9XFxuXHRcdH1cXG5cdH1cXFwiXFxuXHRibi1ldmVudD1cXFwibWFwY29udGV4dG1lbnU6IG9uTWFwQ29udGV4dE1lbnUsIG1hcHNoYXBlY29udGV4dG1lbnU6IG9uU2hhcGVDb250ZXh0TWVudVxcXCJcXG5cdD48L2Rpdj5cdFxcblwiLFxuXG5cdC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5Ccm9rZXIuSW50ZXJmYWNlfSBicm9rZXIgXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuQXBwRGF0YS5JbnRlcmZhY2V9IGFwcERhdGEgXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuUGFnZXIuSW50ZXJmYWNlfSBwYWdlciBcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5SYWRhci5JbnRlcmZhY2V9IHJhZGFyU3J2XG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuRmlsZXMuSW50ZXJmYWNlfSBmaWxlc1NydlxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLkh0dHAuSW50ZXJmYWNlfSBodHRwXG5cdCAqL1xuXHRpbml0OiBmdW5jdGlvbiAoZWx0LCBicm9rZXIsIGFwcERhdGEsIHBhZ2VyLCByYWRhclNydiwgZmlsZXNTcnYsIGh0dHApIHtcblxuXHRcdGxldCB7IHpvb20sIGNlbnRlciwgbWFya2VycywgbGF5ZXJzIH0gPSBhcHBEYXRhLmdldERhdGEoKVxuXHRcdGNvbnNvbGUubG9nKCdhcHBEYXRhJywgYXBwRGF0YS5nZXREYXRhKCkpXG5cdFx0bWFya2VycyA9IG1hcmtlcnMgfHwge31cblx0XHRsYXllcnMgPSBsYXllcnMgfHwge31cblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0Y2VudGVyOiBjZW50ZXIgfHwgeyBsYXQ6IDQ4LjM5LCBsbmc6IC00LjQ4NiB9LFxuXHRcdFx0XHR6b29tOiB6b29tIHx8IDEzLFxuXHRcdFx0XHR3YXRjaElEOiBudWxsLFxuXHRcdFx0XHRzaG93MTogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHJldHVybiAodGhpcy53YXRjaElEID09IG51bGwpID8gJ3Zpc2libGUnIDogJ2hpZGRlbidcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHQvKipcblx0XHRcdFx0ICogXG5cdFx0XHRcdCAqIEBwYXJhbSB7QnJhaW5qcy5Db250cm9scy5NYXAuRXZlbnREYXRhLk1hcFNoYXBlQ29udGV4dE1lbnV9IGRhdGEgXG5cdFx0XHRcdCAqL1xuXHRcdFx0XHRvblNoYXBlQ29udGV4dE1lbnU6IGZ1bmN0aW9uIChldiwgZGF0YSkge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uU2hhcGVDb250ZXh0TWVudScsIGRhdGEpXG5cdFx0XHRcdFx0Y29uc3QgeyBpZCwgY21kIH0gPSBkYXRhXG5cdFx0XHRcdFx0aWYgKGNtZCA9PSAncmVtb3ZlJykge1xuXHRcdFx0XHRcdFx0bWFwLnJlbW92ZVNoYXBlKGlkKVxuXHRcdFx0XHRcdFx0ZGVsZXRlIG1hcmtlcnNbaWRdXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmIChjbWQgPT0gXCJ6b29tXCIpIHtcblx0XHRcdFx0XHRcdC8qKkB0eXBlIHtCcmFpbmpzLkNvbnRyb2xzLk1hcC5TaGFwZS5NYXJrZXJ9ICovXG5cdFx0XHRcdFx0XHQvLyBAdHMtaWdub3JlXG5cdFx0XHRcdFx0XHRjb25zdCBpbmZvID0gbWFwLmdldFNoYXBlSW5mbyhpZClcblx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ2luZm8nLCBpbmZvKVxuXHRcdFx0XHRcdFx0bWFwLmZseVRvKGluZm8ubGF0bG5nLCAxMylcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0fSxcblx0XHRcdFx0LyoqXG5cdFx0XHRcdCAqIFxuXHRcdFx0XHQgKiBAcGFyYW0ge0JyYWluanMuQ29udHJvbHMuTWFwLkV2ZW50RGF0YS5NYXBDb250ZXh0TWVudX0gZGF0YSBcblx0XHRcdFx0ICovXG5cdFx0XHRcdG9uTWFwQ29udGV4dE1lbnU6IGFzeW5jIGZ1bmN0aW9uIChldiwgZGF0YSkge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uTWFwQ29udGV4dE1lbnUnLCBkYXRhKVxuXHRcdFx0XHRcdGNvbnN0IHsgbGF0bG5nIH0gPSBkYXRhXG5cdFx0XHRcdFx0Y29uc3QgdG9vbHRpcCA9IGF3YWl0ICQkLnVpLnNob3dQcm9tcHQoe1xuXHRcdFx0XHRcdFx0dGl0bGU6ICdBZGQgTWFya2VyJyxcblx0XHRcdFx0XHRcdGxhYmVsOiAnVG9vbHRpcCdcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdGlmICh0b29sdGlwKSB7XG5cdFx0XHRcdFx0XHRjb25zdCBzaGFwZUlkID0gJ0lEJyArIERhdGUubm93KClcblx0XHRcdFx0XHRcdGFkZE1hcmtlcihzaGFwZUlkLCBsYXRsbmcsIHRvb2x0aXApXG5cdFx0XHRcdFx0XHRtYXJrZXJzW3NoYXBlSWRdID0geyBsYXRsbmcsIHRvb2x0aXAgfVxuXG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uQWRkTWFya2VyOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnQWRkIE1hcmtlcicpXG5cdFx0XHRcdFx0JCQudWkuc2hvd0Zvcm0oe1xuXHRcdFx0XHRcdFx0dGl0bGU6ICdBZGQgTWFya2VyJyxcblx0XHRcdFx0XHRcdGZpZWxkczoge1xuXHRcdFx0XHRcdFx0XHRsYXQ6IHtcblx0XHRcdFx0XHRcdFx0XHRsYWJlbDogJ0xhdGl0dWRlOiAnLFxuXHRcdFx0XHRcdFx0XHRcdGlucHV0OiAnaW5wdXQnLFxuXHRcdFx0XHRcdFx0XHRcdGF0dHJzOiB7XG5cdFx0XHRcdFx0XHRcdFx0XHR0eXBlOiAnbnVtYmVyJyxcblx0XHRcdFx0XHRcdFx0XHRcdHN0ZXA6ICdhbnknLFxuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0bG5nOiB7XG5cdFx0XHRcdFx0XHRcdFx0bGFiZWw6ICdMb25naXR1ZGU6ICcsXG5cdFx0XHRcdFx0XHRcdFx0aW5wdXQ6ICdpbnB1dCcsXG5cdFx0XHRcdFx0XHRcdFx0YXR0cnM6IHtcblx0XHRcdFx0XHRcdFx0XHRcdHR5cGU6ICdudW1iZXInLFxuXHRcdFx0XHRcdFx0XHRcdFx0c3RlcDogJ2FueSdcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdGxhYmVsOiB7XG5cdFx0XHRcdFx0XHRcdFx0bGFiZWw6ICdMYWJlbDonLFxuXHRcdFx0XHRcdFx0XHRcdGlucHV0OiAnaW5wdXQnLFxuXHRcdFx0XHRcdFx0XHRcdGF0dHJzOiB7XG5cdFx0XHRcdFx0XHRcdFx0XHR0eXBlOiAndGV4dCdcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9LCAoZGF0YSkgPT4ge1xuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coZGF0YSlcblx0XHRcdFx0XHRcdGNvbnN0IHtsYXQsIGxuZywgbGFiZWw6IHRvb2x0aXB9ID0gZGF0YVxuXHRcdFx0XHRcdFx0Y29uc3QgbGF0bG5nID0ge2xhdCwgbG5nfVxuXHRcdFx0XHRcdFx0Y29uc3Qgc2hhcGVJZCA9ICdJRCcgKyBEYXRlLm5vdygpXG5cdFx0XHRcdFx0XHRhZGRNYXJrZXIoc2hhcGVJZCwgbGF0bG5nLCB0b29sdGlwKVxuXHRcdFx0XHRcdFx0bWFya2Vyc1tzaGFwZUlkXSA9IHsgbGF0bG5nLCB0b29sdGlwIH1cblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkltcG9ydEttbDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uSW5wb3J0S21sJylcblx0XHRcdFx0XHRmaWxlc1Nydi5vcGVuRmlsZSgnSW1wb3J0IEtNTCcsIHtmaWx0ZXJFeHRlbnNpb246ICdrbWwnfSwgYXN5bmMgKGRhdGEpID0+IHtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdkYXRhJywgZGF0YSlcblx0XHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRcdGNvbnN0IGttbCA9IGF3YWl0IGh0dHAucG9zdCgnL2ltcG9ydEttbCcsIGRhdGEpXG5cdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdrbWwnLCBrbWwpXG5cdFx0XHRcdFx0XHRcdHBhZ2VyLnB1c2hQYWdlKCdpbXBvcnRLbWwnLCB7XG5cdFx0XHRcdFx0XHRcdFx0dGl0bGU6ICdJbXBvcnQgS01MJyxcblx0XHRcdFx0XHRcdFx0XHRwcm9wczoge1xuXHRcdFx0XHRcdFx0XHRcdFx0a21sXG5cdFx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0XHRvblJldHVybjogZnVuY3Rpb24oe2luZGV4ZXMsIGxheWVyTGFiZWx9KSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZyh7aW5kZXhlcywgbGF5ZXJMYWJlbH0pXG5cdFx0XHRcdFx0XHRcdFx0XHRtYXAuYWRkTGF5ZXIobGF5ZXJMYWJlbCwge2xhYmVsOiBsYXllckxhYmVsLCB2aXNpYmxlOiB0cnVlLCBvcGVuUG9wdXBPbkFjdGl2YXRlOiB0cnVlfSlcblx0XHRcdFx0XHRcdFx0XHRcdGxheWVyc1tsYXllckxhYmVsXSA9IFtdXG5cblx0XHRcdFx0XHRcdFx0XHRcdGZvcihjb25zdCBpZHggb2YgaW5kZXhlcykge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRjb25zdCB7UG9pbnQsIG5hbWV9ID0ga21sW2lkeF1cblx0XHRcdFx0XHRcdFx0XHRcdFx0Y29uc3QgW2xuZywgbGF0XSA9IFBvaW50LmNvb3JkaW5hdGVzLnNwbGl0KCcsJykubWFwKGEgPT4gcGFyc2VGbG9hdChhKSlcblx0XHRcdFx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coe25hbWUsIGxuZywgbGF0fSlcblxuXHRcdFx0XHRcdFx0XHRcdFx0XHRjb25zdCBzaGFwZUlkID0gJ0lEJyArIERhdGUubm93KClcblx0XHRcdFx0XHRcdFx0XHRcdFx0YWRkTWFya2VyKHNoYXBlSWQsIHtsYXQsIGxuZ30sIG5hbWUsIGxheWVyTGFiZWwpXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGxheWVyc1tsYXllckxhYmVsXS5wdXNoKHtsYXQsIGxuZywgbGFiZWw6IG5hbWV9KVxuXHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdFx0c2F2ZURhdGEoKVxuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGNhdGNoKGUpIHtcblx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ0Vycm9yJywgZSlcblx0XHRcdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHt0aXRsZTogJ0Vycm9yJywgY29udGVudDogZX0pXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvblNlYXJjaDogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uU2VhcmNoJylcblx0XHRcdFx0XHRwYWdlci5wdXNoUGFnZSgnc2VhcmNoUGFnZScsIHtcblx0XHRcdFx0XHRcdHRpdGxlOiAnU2VhcmNoIENpdHknLFxuXHRcdFx0XHRcdFx0LyoqXG5cdFx0XHRcdFx0XHQgKiBcblx0XHRcdFx0XHRcdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuQ2l0eS5DaXR5Q29vcmRpbmF0ZXN9IGNvb3JkIFxuXHRcdFx0XHRcdFx0ICovXG5cdFx0XHRcdFx0XHRvblJldHVybjogZnVuY3Rpb24gKGNvb3JkKSB7XG5cdFx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uUmV0dXJuJywgY29vcmQpXG5cdFx0XHRcdFx0XHRcdGNvbnN0IGxhdGxuZyA9IHsgbGF0OiBjb29yZC5sYXQsIGxuZzogY29vcmQubG9uIH1cblx0XHRcdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdFx0XHRtYXAudXBkYXRlU2hhcGUoJ21hcmtlcicsIHsgbGF0bG5nIH0pXG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0Y2F0Y2ggKGUpIHtcblx0XHRcdFx0XHRcdFx0XHRtYXAuYWRkU2hhcGUoJ21hcmtlcicsIHtcblx0XHRcdFx0XHRcdFx0XHRcdHR5cGU6ICdtYXJrZXInLFxuXHRcdFx0XHRcdFx0XHRcdFx0bGF0bG5nXG5cdFx0XHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRtYXAuZmx5VG8obGF0bG5nLCAxMylcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkxvY2F0aW9uQ2hhbmdlOiBmdW5jdGlvbiAoZXYsIHN0YXRlKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25Mb2NhdGlvbkNoYW5nZScsIHN0YXRlKVxuXHRcdFx0XHRcdGlmIChzdGF0ZSkge1xuXHRcdFx0XHRcdFx0bmF2aWdhdG9yLmdlb2xvY2F0aW9uLmdldEN1cnJlbnRQb3NpdGlvbih1cGRhdGVMb2NhdGlvbilcblxuXHRcdFx0XHRcdFx0Y29uc3Qgd2F0Y2hJRCA9IG5hdmlnYXRvci5nZW9sb2NhdGlvbi53YXRjaFBvc2l0aW9uKFxuXHRcdFx0XHRcdFx0XHR1cGRhdGVMb2NhdGlvbixcblx0XHRcdFx0XHRcdFx0Z2VvRXJyb3IsXG5cdFx0XHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdFx0XHRlbmFibGVIaWdoQWNjdXJhY3k6IHRydWVcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0KVxuXHRcdFx0XHRcdFx0Y3RybC5zZXREYXRhKHsgd2F0Y2hJRCB9KVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRcdG5hdmlnYXRvci5nZW9sb2NhdGlvbi5jbGVhcldhdGNoKGN0cmwubW9kZWwud2F0Y2hJRClcblx0XHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7IHdhdGNoSUQ6IG51bGwgfSlcblx0XHRcdFx0XHRcdG1hcC5yZW1vdmVTaGFwZSgnbG9jYXRpb24nKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHQvKipAdHlwZSB7QnJhaW5qcy5Db250cm9scy5NYXAuSW50ZXJmYWNlfSAqL1xuXHRcdGNvbnN0IG1hcCA9IGN0cmwuc2NvcGUubWFwXG5cblx0XHRjb25zdCByYWRhclR5cGVVcmxzID0ge1xuXHRcdFx0J1JhZGFyIGZpeGUnOiBmaWxlc1Nydi5hc3NldHNVcmwoJ3JhZGFyX2ZpeGUucG5nJyksXG5cdFx0XHQnUmFkYXIgZmV1IHJvdWdlJzogZmlsZXNTcnYuYXNzZXRzVXJsKCdyYWRhcl9mZXVfcm91Z2UucG5nJyksXG5cdFx0XHQnUmFkYXIgZGlzY3JpbWluYW50JzogZmlsZXNTcnYuYXNzZXRzVXJsKCdyYWRhcl9kaXNjcmltaW5hbnQucG5nJyksXG5cdFx0XHQnUmFkYXIgVml0ZXNzZSBNb3llbm5lJzogZmlsZXNTcnYuYXNzZXRzVXJsKCdyYWRhcl92aXRlc3NlX21veWVubmUucG5nJyksXG5cblx0XHR9XG5cblxuXG5cdFx0YXN5bmMgZnVuY3Rpb24gaW5pdE1hcmtlcnMoKSB7XG5cblx0XHRcdGZvciAoY29uc3QgW2lkLCBkYXRhXSBvZiBPYmplY3QuZW50cmllcyhtYXJrZXJzKSkge1xuXHRcdFx0XHRhZGRNYXJrZXIoaWQsIGRhdGEubGF0bG5nLCBkYXRhLnRvb2x0aXApXG5cdFx0XHR9XG5cblx0XHRcdGZvciAoY29uc3QgW2xheWVyTmFtZSwgbWFya2VySW5mb3NdIG9mIE9iamVjdC5lbnRyaWVzKGxheWVycykpIHtcblx0XHRcdFx0bWFwLmFkZExheWVyKGxheWVyTmFtZSwge2xhYmVsOiBsYXllck5hbWUsIHZpc2libGU6IGZhbHNlLCBvcGVuUG9wdXBPbkFjdGl2YXRlOiB0cnVlfSlcblx0XHRcdFx0Zm9yKGNvbnN0IHtsYXQsIGxuZywgbGFiZWx9IG9mIG1hcmtlckluZm9zKSB7XG5cdFx0XHRcdFx0Y29uc3Qgc2hhcGVJZCA9ICdJRF8nICsgbGFiZWwudG9VcHBlckNhc2UoKS5yZXBsYWNlQWxsKCcgJywgJ18nKVxuXHRcdFx0XHRcdGFkZE1hcmtlcihzaGFwZUlkLCB7bGF0LCBsbmd9LCBsYWJlbCwgbGF5ZXJOYW1lKVxuXHRcdFx0XHR9XHRcdFx0XHRcblx0XHRcdH1cblxuXG5cdFx0XHRjb25zdCByYWRhcnMgPSBhd2FpdCByYWRhclNydi5nZXRSYWRhcigpXG5cdFx0XHRjb25zb2xlLmxvZyh7IHJhZGFycyB9KVxuXG5cdFx0XHRtYXAuYWRkR2VvRGF0YShyYWRhcnMsICdyYWRhcicsIHtcblx0XHRcdFx0cG9pbnRUb0xheWVyOiAoZmVhdHVyZSwgbGF0bG5nKSA9PiB7XG5cdFx0XHRcdFx0Y29uc3QgaWNvblVybCA9IHJhZGFyVHlwZVVybHNbZmVhdHVyZS5wcm9wZXJ0aWVzLnR5cGVdXG5cdFx0XHRcdFx0aWYgKGljb25VcmwgIT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0XHRjb25zdCBpY29uT3B0aW9ucyA9IHtcblx0XHRcdFx0XHRcdFx0aWNvblNpemU6IFs5MSwgOTldLFxuXHRcdFx0XHRcdFx0XHRpY29uQW5jaG9yOiBbNDAsIDk5XSxcblx0XHRcdFx0XHRcdFx0cG9wdXBBbmNob3I6IFsyMCwgLTg1XSxcblx0XHRcdFx0XHRcdFx0aWNvblVybFxuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRyZXR1cm4gbWFwLmNyZWF0ZU1hcmtlckljb24obGF0bG5nLCBpY29uT3B0aW9ucylcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uUG9wdXA6IChmZWF0dXJlKSA9PiB7XG5cdFx0XHRcdFx0bGV0IHJldCA9IFtdXG5cdFx0XHRcdFx0aWYgKGZlYXR1cmUucHJvcGVydGllcy5yb3V0ZSlcblx0XHRcdFx0XHRcdHJldC5wdXNoKGZlYXR1cmUucHJvcGVydGllcy5yb3V0ZSlcblx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdHJldC5wdXNoKGZlYXR1cmUucHJvcGVydGllcy50eXBlKVxuXHRcdFx0XHRcdGNvbnN0IHtzcGVlZH0gPSBmZWF0dXJlLnByb3BlcnRpZXNcblx0XHRcdFx0XHRpZiAodHlwZW9mIHNwZWVkID09ICdudW1iZXInKSB7XG5cdFx0XHRcdFx0XHQvL3JldC5wdXNoKGBWaXRlc3NlIGxpbWl0w6llIMOgICR7c3BlZWR9IGttYClcblx0XHRcdFx0XHRcdGNvbnN0IHNwZWVkVXJsID0gZmlsZXNTcnYuYXNzZXRzVXJsKGB2aXRlc3NlLSR7c3BlZWR9LnBuZ2ApXG5cdFx0XHRcdFx0XHRyZXQucHVzaChgPGltZyBzcmM9XCIke3NwZWVkVXJsfVwiIHN0eWxlPVwibWFyZ2luLXRvcDogMTBweFwiPmApXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHJldHVybiBgPGI+JHtyZXQuam9pbignPGJyPicpfTwvYj5gXG5cdFx0XHRcdH1cblx0XHRcdH0pXG5cblx0XHR9XG5cblx0XHRpbml0TWFya2VycygpXG5cblxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqIEBwYXJhbSB7c3RyaW5nfSBzaGFwZUlkIFxuXHRcdCAqIEBwYXJhbSB7QnJhaW5qcy5Db250cm9scy5NYXAuTGF0TG5nfSBsYXRsbmcgXG5cdFx0ICogQHBhcmFtIHtzdHJpbmd9IHRvb2x0aXAgXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gYWRkTWFya2VyKHNoYXBlSWQsIGxhdGxuZywgdG9vbHRpcCwgbGF5ZXJJZCkge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnYWRkTWFya2VyJywgc2hhcGVJZCwgbGF0bG5nLCB0b29sdGlwKVxuXHRcdFx0LyoqQHR5cGUge0JyYWluanMuQ29udHJvbHMuTWFwLlNoYXBlLk1hcmtlcn0gKi9cblx0XHRcdGNvbnN0IHNoYXBlSW5mbyA9IHtcblx0XHRcdFx0dHlwZTogJ21hcmtlcicsXG5cdFx0XHRcdGxheWVyOiAobGF5ZXJJZCkgPyBsYXllcklkIDogJ21hcmtlcnMnLFxuXHRcdFx0XHRsYXRsbmcsXG5cdFx0XHRcdGljb246IHtcblx0XHRcdFx0XHR0eXBlOiAnZm9udCcsXG5cdFx0XHRcdFx0Y2xhc3NOYW1lOiAnZmFyIGZhLWRvdC1jaXJjbGUnLFxuXHRcdFx0XHRcdGNvbG9yOiAnZ3JlZW4nLFxuXHRcdFx0XHRcdGZvbnRTaXplOiAyMFxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdHBvcHVwOiB7XG5cdFx0XHRcdFx0Y29udGVudDogdG9vbHRpcCxcblx0XHRcdFx0XHRjbGFzc05hbWU6ICdteVRvb2xUaXAnLFxuXHRcdFx0XHRcdGNsb3NlQnV0dG9uOiBmYWxzZVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRjb250ZXh0TWVudToge1xuXHRcdFx0XHRcdHJlbW92ZToge1xuXHRcdFx0XHRcdFx0bmFtZTogJ1JlbW92ZScsXG5cdFx0XHRcdFx0XHRpY29uQ2xzOiAnZmFzIGZhLXRyYXNoLWFsdCB3My10ZXh0LWJsdWUnLFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0em9vbToge1xuXHRcdFx0XHRcdFx0bmFtZTogJ1pvb20nLFxuXHRcdFx0XHRcdFx0aWNvbkNsczogJ2ZhcyBmYS1zZWFyY2gtcGx1cyB3My10ZXh0LWJsdWUnXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRtYXAuYWRkU2hhcGUoc2hhcGVJZCwgc2hhcGVJbmZvKVxuXG5cdFx0fVxuXG5cblx0XHRmdW5jdGlvbiBnZW9FcnJvcigpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdnZW9sb2NhdGlvbiBlcnJvcicpXG5cdFx0fVxuXG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICogQHBhcmFtIHtHZW9sb2NhdGlvblBvc2l0aW9ufSBwb3NpdGlvbiBcblx0XHQgKi9cblx0XHRmdW5jdGlvbiB1cGRhdGVMb2NhdGlvbihwb3NpdGlvbikge1xuXHRcdFx0Y29uc3QgbGF0bG5nID0ge1xuXHRcdFx0XHRsYXQ6IHBvc2l0aW9uLmNvb3Jkcy5sYXRpdHVkZSxcblx0XHRcdFx0bG5nOiBwb3NpdGlvbi5jb29yZHMubG9uZ2l0dWRlXG5cdFx0XHR9XG5cdFx0XHQvL2NvbnNvbGUubG9nKCd1cGRhdGVMb2NhdGlvbicsIGxhdGxuZylcblx0XHRcdHRyeSB7XG5cdFx0XHRcdG1hcC51cGRhdGVTaGFwZSgnbG9jYXRpb24nLCB7IGxhdGxuZyB9KVxuXHRcdFx0fVxuXHRcdFx0Y2F0Y2ggKGUpIHtcblx0XHRcdFx0bWFwLmFkZFNoYXBlKCdsb2NhdGlvbicsIHtcblx0XHRcdFx0XHR0eXBlOiAnbWFya2VyJyxcblx0XHRcdFx0XHRpY29uOiB7XG5cdFx0XHRcdFx0XHR0eXBlOiAnZm9udCcsXG5cdFx0XHRcdFx0XHRjbGFzc05hbWU6ICdmYXIgZmEtZG90LWNpcmNsZScsXG5cdFx0XHRcdFx0XHRjb2xvcjogJ3JlZCcsXG5cdFx0XHRcdFx0XHRmb250U2l6ZTogMjBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGxhdGxuZ1xuXHRcdFx0XHR9KVxuXHRcdFx0fVxuXHRcdFx0bWFwLnBhblRvKGxhdGxuZylcblx0XHR9XG5cblx0XHRicm9rZXIucmVnaXN0ZXIoJ2JyZWl6Ym90LmZyaWVuZFBvc2l0aW9uJywgKG1zZykgPT4ge1xuXHRcdFx0aWYgKG1zZy5oaXN0KSB7XG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXHRcdFx0LyoqQHR5cGUge0JyZWl6Ym90LlNlcnZpY2VzLkJyb2tlci5FdmVudHMuRnJpZW5kUG9zaXRpb259ICovXG5cdFx0XHRjb25zdCBkYXRhID0gbXNnLmRhdGFcblx0XHRcdC8vY29uc29sZS5sb2coJ2JyZWl6Ym90LmZyaWVuZFBvc2l0aW9uJywgbXNnKVx0XG5cdFx0XHRjb25zdCB0aW1lID0gbmV3IERhdGUobXNnLnRpbWUpLnRvTG9jYWxlVGltZVN0cmluZygnZnItRlInKVxuXHRcdFx0Y29uc3Qgc2hhcGVJZCA9ICdmcmllbmRzLicgKyBkYXRhLnVzZXJOYW1lXG5cdFx0XHRjb25zdCBwb3B1cENvbnRlbnQgPSBkYXRhLnVzZXJOYW1lICsgJzxicj4nICsgdGltZVxuXHRcdFx0dHJ5IHtcblx0XHRcdFx0bWFwLnVwZGF0ZVNoYXBlKHNoYXBlSWQsIHtcblx0XHRcdFx0XHRsYXRsbmc6IGRhdGEuY29vcmRzLFxuXHRcdFx0XHRcdHBvcHVwQ29udGVudFxuXHRcdFx0XHR9KVxuXHRcdFx0fVxuXHRcdFx0Y2F0Y2ggKGUpIHtcblx0XHRcdFx0bWFwLmFkZFNoYXBlKHNoYXBlSWQsIHtcblx0XHRcdFx0XHR0eXBlOiAnbWFya2VyJyxcblx0XHRcdFx0XHRsYXllcjogJ2ZyaWVuZHMnLFxuXHRcdFx0XHRcdGxhdGxuZzogZGF0YS5jb29yZHMsXG5cdFx0XHRcdFx0aWNvbjoge1xuXHRcdFx0XHRcdFx0dHlwZTogJ2ZvbnQnLFxuXHRcdFx0XHRcdFx0Y2xhc3NOYW1lOiAnZmFyIGZhLXVzZXInLFxuXHRcdFx0XHRcdFx0Y29sb3I6ICdibHVlJyxcblx0XHRcdFx0XHRcdGZvbnRTaXplOiAyMFxuXHRcdFx0XHRcdH0sXG5cblx0XHRcdFx0XHRwb3B1cDoge1xuXHRcdFx0XHRcdFx0Y29udGVudDogcG9wdXBDb250ZW50LFxuXHRcdFx0XHRcdFx0Y2xhc3NOYW1lOiAnbXlUb29sVGlwJyxcblx0XHRcdFx0XHRcdGNsb3NlQnV0dG9uOiBmYWxzZVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSlcblx0XHRcdH1cblxuXHRcdH0pXG5cblx0XHRicm9rZXIucmVnaXN0ZXIoJ2hvbWVib3gubWFwLnVwZGF0ZVNoYXBlLionLCAobXNnKSA9PiB7XG5cblx0XHRcdGNvbnN0IHNoYXBlSWQgPSBtc2cudG9waWMuc3BsaXQoJy4nKS5wb3AoKVxuXHRcdFx0Ly9jb25zb2xlLmxvZygnc2hhcGVJZCcsIHNoYXBlSWQpXG5cblx0XHRcdGNvbnN0IHNoYXBlID0gbXNnLmRhdGFcblxuXHRcdFx0aWYgKHNoYXBlID09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRtYXAucmVtb3ZlU2hhcGUoc2hhcGVJZClcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cblx0XHRcdHRyeSB7XG5cdFx0XHRcdG1hcC51cGRhdGVTaGFwZShzaGFwZUlkLCBzaGFwZSlcblx0XHRcdH1cblx0XHRcdGNhdGNoIChlKSB7XG5cdFx0XHRcdG1hcC5hZGRTaGFwZShzaGFwZUlkLCBzaGFwZSlcblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0ZnVuY3Rpb24gc2F2ZURhdGEoKSB7XG5cdFx0XHRyZXR1cm4gYXBwRGF0YS5zYXZlRGF0YSh7XG5cdFx0XHRcdHpvb206IG1hcC5nZXRab29tKCksXG5cdFx0XHRcdGNlbnRlcjogbWFwLmdldENlbnRlcigpLFxuXHRcdFx0XHRtYXJrZXJzLFxuXHRcdFx0XHRsYXllcnNcblx0XHRcdH0pXG5cdFx0fVxuXG5cdFx0dGhpcy5vbkFwcEV4aXQgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdbbWFwXSBvbkFwcEV4aXQnKVxuXHRcdFx0cmV0dXJuIHNhdmVEYXRhKClcblx0XHR9XG5cdH1cbn0pO1xuXG5cblxuXG4iLCIvL0B0cy1jaGVja1xuJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ3NlYXJjaFBhZ2UnLCB7XG5cblx0dGVtcGxhdGU6IFwiPGZvcm0gYm4tZXZlbnQ9XFxcInN1Ym1pdDogb25TdWJtaXRcXFwiIGJuLXNob3c9XFxcInNob3cxXFxcIj5cXG5cdDxkaXYgY2xhc3M9XFxcImlucHV0Z3JvdXBcXFwiPlxcblx0XHQ8bGFiZWw+Q291bnRyeTo8L2xhYmVsPlxcblx0XHQ8c3BhbiBcXG5cdFx0XHRibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbWJvYm94XFxcIlxcblx0XHRcdGJuLWRhdGE9XFxcIntpdGVtczogY291bnRyaWVzfVxcXCJcXG5cdFx0XHRibi12YWw9XFxcImN1cnJlbnRDb3VudHJ5XFxcIlxcblx0XHRcdGJuLXVwZGF0ZT1cXFwiY29tYm9ib3hjaGFuZ2VcXFwiXFxuXHRcdD48L3NwYW4+XHRcdFx0XFxuXHQ8L2Rpdj5cXG5cdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dGdyb3VwXFxcIiBjbGFzcz1cXFwiaW5wdXRncm91cFxcXCI+XFxuXHRcdDxsYWJlbD5DaXR5PC9sYWJlbD5cXG5cdFx0PGlucHV0IHR5cGU9XFxcInRleHRcXFwiIG5hbWU9XFxcInNlYXJjaFxcXCIgcmVxdWlyZWQ9XFxcIlxcXCI+XFxuXHQ8L2Rpdj5cXG5cdDxkaXY+XFxuXHRcdDxidXR0b24gY2xhc3M9XFxcInczLWJ1dHRvbiB3My1ibHVlXFxcIiB0eXBlPVxcXCJzdWJtaXRcXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1zZWFyY2hcXFwiPjwvaT5cXG5cdFx0PC9idXR0b24+XFxuXHQ8L2Rpdj5cXG5cXG48L2Zvcm0+XFxuXFxuPGRpdj5cXG5cdDxzdHJvbmcgYm4tdGV4dD1cXFwibWVzc2FnZVxcXCI+PC9zdHJvbmc+XFxuPC9kaXY+XFxuXFxuPGRpdiBibi1zaG93PVxcXCJydW5uaW5nXFxcIj5cXG5cdDxpIGNsYXNzPVxcXCJmYSBmYS1zcGlubmVyIGZhLXB1bHNlXFxcIj48L2k+IFJ1bm5pbmcuLi5cXG48L2Rpdj5cXG5cXG48ZGl2IGNsYXNzPVxcXCJzY3JvbGxQYW5lbFxcXCIgYm4tc2hvdz1cXFwic2hvdzJcXFwiPlxcblx0PHVsIGNsYXNzPVxcXCJ3My11bCB3My1ib3JkZXIgdzMtd2hpdGVcXFwiIFxcblx0XHRibi1ldmVudD1cXFwiY2xpY2sudzMtYmFyOiBvbkl0ZW1DbGlja1xcXCJcXG5cdFx0Ym4tZWFjaD1cXFwiY2l0aWVzXFxcIlxcblx0XHRibi1zaG93PVxcXCJzaG93M1xcXCJcXG5cdFx0Plxcblx0XHQ8bGkgY2xhc3M9XFxcInczLWJhclxcXCI+XFxuXFxuXHRcdFx0PGRpdiBjbGFzcz1cXFwidzMtYmFyLWl0ZW1cXFwiPlxcblx0XHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwiJHNjb3BlLiRpLm5hbWVcXFwiPjwvc3Bhbj5cXG5cdFx0XHQ8L2Rpdj5cXG5cdFx0PC9saT5cXG5cdDwvdWw+XHRcXG48L2Rpdj5cXG5cdFwiLFxuXG5cdGRlcHM6IFsnYnJlaXpib3QuY2l0aWVzJywgJ2JyZWl6Ym90LnBhZ2VyJ10sXG5cblx0LyoqXG5cdCAqIFxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLkNpdHkuSW50ZXJmYWNlfSBzcnZDaXRpZXMgXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuUGFnZXIuSW50ZXJmYWNlfSBwYWdlciBcblx0ICovXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgc3J2Q2l0aWVzLCBwYWdlcikge1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHQvKipAdHlwZSB7c3RyaW5nW119ICovXG5cdFx0XHRcdGNvdW50cmllczogW10sXG5cdFx0XHRcdGN1cnJlbnRDb3VudHJ5OiAnJyxcblx0XHRcdFx0LyoqQHR5cGUge0JyZWl6Ym90LlNlcnZpY2VzLkNpdHkuQ2l0eUluZm9bXX0gKi9cblx0XHRcdFx0Y2l0aWVzOiBbXSxcblx0XHRcdFx0bWVzc2FnZTogJycsXG5cdFx0XHRcdHJ1bm5pbmc6IGZhbHNlLFxuXHRcdFx0XHRzaG93MTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuY291bnRyaWVzLmxlbmd0aCA+IDBcblx0XHRcdFx0fSxcblx0XHRcdFx0c2hvdzI6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLmNvdW50cmllcy5sZW5ndGggPiAwICYmIHRoaXMuY2l0aWVzLmxlbmd0aCA+IDBcblx0XHRcdFx0fSxcblx0XHRcdFx0c2hvdzM6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLmNpdGllcy5sZW5ndGggPiAwXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25TdWJtaXQ6IGFzeW5jIGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0ZXYucHJldmVudERlZmF1bHQoKVxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvblN1Ym1pdCcpXG5cdFx0XHRcdFx0Y29uc3Qge3NlYXJjaH0gPSAkKHRoaXMpLmdldEZvcm1EYXRhKClcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoe21lc3NhZ2U6ICcnLCBydW5uaW5nOiB0cnVlfSlcblx0XHRcdFx0XHRjb25zdCBjaXRpZXMgPSBhd2FpdCBzcnZDaXRpZXMuZ2V0Q2l0aWVzKGN0cmwubW9kZWwuY3VycmVudENvdW50cnksIHNlYXJjaClcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnY2l0aWVzJywgY2l0aWVzKVxuXHRcdFx0XHRcdGNvbnN0IGxlbmd0aCA9IGNpdGllcy5sZW5ndGhcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoe1xuXHRcdFx0XHRcdFx0cnVubmluZzogZmFsc2UsXG5cdFx0XHRcdFx0XHRjaXRpZXMsXG5cdFx0XHRcdFx0XHRtZXNzYWdlOiBsZW5ndGggPT0gMCA/ICdObyByZXN1bHQnOiBgJHtsZW5ndGh9IG1hdGNoYFxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uSXRlbUNsaWNrOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGNvbnN0IGlkeCA9ICQodGhpcykuaW5kZXgoKVxuXHRcdFx0XHRcdC8qKkB0eXBlIHtCcmVpemJvdC5TZXJ2aWNlcy5DaXR5LkNpdHlJbmZvfSAqL1xuXHRcdFx0XHRcdGNvbnN0IGluZm8gPSBjdHJsLm1vZGVsLmNpdGllc1tpZHhdXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uSXRlbUNsaWNrJywgaW5mbylcblx0XHRcdFx0XHRwYWdlci5wb3BQYWdlKGluZm8uY29vcmQpXG5cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHRhc3luYyBmdW5jdGlvbiBnZXRDb3VudHJpZXMoKSB7XG5cdFx0XHRjb25zdCBjb3VudHJpZXMgPSBhd2FpdCBzcnZDaXRpZXMuZ2V0Q291bnRyaWVzKClcblx0XHRcdGN0cmwuc2V0RGF0YSh7Y291bnRyaWVzLCBjdXJyZW50Q291bnRyeTogJ0ZSJ30pXG5cdFx0fVxuXG5cdFx0Z2V0Q291bnRyaWVzKClcblx0fVxufSk7XG4iLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnaW1wb3J0S21sJywge1xuICAgIHRlbXBsYXRlOiBcIjxmb3JtIGJuLWV2ZW50PVxcXCJzdWJtaXQ6IG9uU3VibWl0XFxcIj5cXG4gICAgPGxhYmVsPkxheWVyIE5hbWU8L2xhYmVsPlxcbiAgICA8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgbmFtZT1cXFwidGV4dFxcXCIgcmVxdWlyZWQ+XFxuICAgIDxpbnB1dCB0eXBlPVxcXCJzdWJtaXRcXFwiICB2YWx1ZT1cXFwiU3VibWl0XFxcIiBoaWRkZW4gYm4tYmluZD1cXFwic3VibWl0XFxcIj4gXFxuPC9mb3JtPlxcbjxkaXYgY2xhc3M9XFxcInNjcm9sbFBhbmVsXFxcIj5cXG4gICAgPHRhYmxlIGNsYXNzPVxcXCJ3My10YWJsZS1hbGwgdzMtc21hbGxcXFwiPlxcbiAgICAgICAgPHRoZWFkPlxcbiAgICAgICAgICAgIDx0cj5cXG4gICAgICAgICAgICAgICAgPHRoPlxcbiAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XFxcImNoZWNrYm94XFxcIiBjaGVja2VkIGJuLWV2ZW50PVxcXCJjbGljazogb25TZWxlY3RDaGFuZ2VcXFwiPlxcbiAgICAgICAgICAgICAgICA8L3RoPlxcbiAgICAgICAgICAgICAgICA8dGg+TmFtZTwvdGg+XFxuICAgICAgICAgICAgICAgIDx0aD5EZXNjcmlwdGlvbjwvdGg+XFxuICAgICAgICAgICAgPC90cj5cXG4gICAgICAgIDwvdGhlYWQ+XFxuICAgICAgICA8dGJvZHkgYm4tZWFjaD1cXFwia21sXFxcIj5cXG4gICAgICAgICAgICA8dHI+XFxuICAgICAgICAgICAgICAgIDx0ZD5cXG4gICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVxcXCJjaGVja2JveFxcXCIgY2hlY2tlZCBjbGFzcz1cXFwiY2hlY2tcXFwiPlxcbiAgICAgICAgICAgICAgICA8L3RkPlxcbiAgICAgICAgICAgICAgICA8dGQgYm4tdGV4dD1cXFwiJHNjb3BlLiRpLm5hbWVcXFwiPjwvdGQ+XFxuICAgICAgICAgICAgICAgIDx0ZCBibi10ZXh0PVxcXCIkc2NvcGUuJGkuZGVzY3JpcHRpb25cXFwiPjwvdGQ+XFxuXFxuICAgICAgICAgICAgPC90cj5cXG4gICAgICAgIDwvdGJvZHk+XFxuICAgIDwvdGFibGU+XFxuPC9kaXY+XFxuXCIsXG5cbiAgICBkZXBzOiBbJ2JyZWl6Ym90LnBhZ2VyJ10sXG5cbiAgICBwcm9wczoge1xuICAgICAgICBrbWw6IG51bGxcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICogQHBhcmFtIHsqfSBlbHQgXG4gICAgICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5QYWdlci5JbnRlcmZhY2V9IHBhZ2VyIFxuICAgICAqL1xuICAgIGluaXQ6IGZ1bmN0aW9uIChlbHQsIHBhZ2VyKSAge1xuICAgICAgICBjb25zdCB7IGttbCB9ID0gdGhpcy5wcm9wc1xuXG4gICAgICAgIGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICBrbWxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBldmVudHM6IHtcbiAgICAgICAgICAgICAgICBvblNlbGVjdENoYW5nZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBjaGVja2VkID0gJCh0aGlzKS5wcm9wKCdjaGVja2VkJylcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ29uU2VsZWN0Q2hhbmdlJywgY2hlY2tlZClcbiAgICAgICAgICAgICAgICAgICAgZWx0LmZpbmQoJy5jaGVjaycpLnByb3AoJ2NoZWNrZWQnLCBjaGVja2VkKVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb25TdWJtaXQ6IGZ1bmN0aW9uKGV2KSB7XG4gICAgICAgICAgICAgICAgICAgIGV2LnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF0YSA9ICQodGhpcykuZ2V0Rm9ybURhdGEoKVxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnb25TdWJtaXQnLCBkYXRhKVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBpbmRleGVzID0gW11cbiAgICAgICAgICAgICAgICAgICAgZWx0LmZpbmQoJy5jaGVjaycpLmVhY2goZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgkKHRoaXMpLnByb3AoJ2NoZWNrZWQnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4ZXMucHVzaChpbmRleClcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyh7aW5kZXhlc30pXG4gICAgICAgICAgICAgICAgICAgIHBhZ2VyLnBvcFBhZ2Uoe2luZGV4ZXMsIGxheWVyTGFiZWw6IGRhdGEudGV4dH0pXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuXG4gICAgICAgIHRoaXMuZ2V0QnV0dG9ucyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgYXBwbHk6IHtcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICdBcHBseScsXG4gICAgICAgICAgICAgICAgICAgIGljb246ICdmYXMgZmEtY2hlY2snLFxuICAgICAgICAgICAgICAgICAgICBvbkNsaWNrOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdHJsLnNjb3BlLnN1Ym1pdC5jbGljaygpXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59KSJdfQ==
