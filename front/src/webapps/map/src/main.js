//@ts-check
$$.control.registerControl('rootPage', {

	deps: ['breizbot.broker', 'breizbot.appData', 'breizbot.pager', 'breizbot.radar', 'breizbot.files', 'breizbot.http'],

	template: { gulp_inject: './main.html' },

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
					else if (cmd == "zoom") {
						/**@type {Brainjs.Controls.Map.Shape.Marker} */
						// @ts-ignore
						const info = map.getShapeInfo(id)
						//console.log('info', info)
						map.flyTo(info.latlng, 18)
					}
					else if (cmd == "edit") {
						const info = map.getShapeInfo(id)
						console.log({id, info})
						// $.extend(info.icon, info.icon, {color: 'red'})
						// map.updateShape(id, info)
						$$.ui.showForm({
							title: 'Edit Marker',
							fields: {
								label: {
									label: 'Label:',
									input: 'input',
									value: info.popup.content,
									attrs: {
										type: 'text'
									}
								},
								color: {
									label: 'Color:',
									input: 'select',
									value: info.icon.color,
									items: ['Red', 'Green', 'Blue']
								}
							}
						}, (data) => {
							console.log(data)
							const { label, color } = data
							$.extend(info.icon, info.icon, {color})
							info.popup.content = label
							map.updateShape(id, info)
							if (info.layer == 'markers') {
								markers[id].tooltip = label
								markers[id].color = color
							}
							else {
								console.log(layers[info.layer])
								const saveInfo = layers[info.layer].find(e => e.shapeId == id)
								console.log({saveInfo})
								saveInfo.label = label
								saveInfo.color = color
							}

							saveData()
						})


					}
				},
				/**
				 * 
				 * @param {Brainjs.Controls.Map.EventData.MapContextMenu} data 
				 */
				onMapContextMenu: async function (ev, data) {
					//console.log('onMapContextMenu', data)
					const { latlng } = data
					$$.ui.showForm({
						title: 'Add Marker',
						fields: {
							label: {
								label: 'Label:',
								input: 'input',
								attrs: {
									type: 'text'
								}
							},
							color: {
								label: 'Color:',
								input: 'select',
								items: ['Red', 'Green', 'Blue'],
								value: 'Green'
							}
						}
					}, (data) => {
						console.log(data)
						const { label: tooltip, color } = data
						const shapeId = 'ID' + Date.now()
						addMarker(shapeId, latlng, tooltip, null, color)
						markers[shapeId] = { latlng, tooltip, color }
						saveData()
					})


				},
				onAddMarker: function () {
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
							},
							color: {
								label: 'Color:',
								input: 'select',
								items: ['Red', 'Green', 'Blue'],
								value: 'Green'
							}
						}
					}, (data) => {
						console.log(data)
						// const {lat, lng, label: tooltip} = data
						// const latlng = {lat, lng}
						// const shapeId = 'ID' + Date.now()
						// addMarker(shapeId, latlng, tooltip)
						// markers[shapeId] = { latlng, tooltip }
					})
				},
				onImportKml: function () {
					console.log('onInportKml')
					filesSrv.openFile('Import KML', { filterExtension: 'kml' }, async (data) => {
						console.log('data', data)
						try {
							const kml = await http.post('/importKml', data)
							console.log('kml', kml)
							pager.pushPage('importKml', {
								title: 'Import KML',
								props: {
									kml
								},
								onReturn: function ({ indexes, layerLabel }) {
									console.log({ indexes, layerLabel })
									map.addLayer(layerLabel, { label: layerLabel, visible: true, openPopupOnActivate: true })
									layers[layerLabel] = []

									for (const idx of indexes) {
										const { Point, name } = kml[idx]
										const [lng, lat] = Point.coordinates.split(',').map(a => parseFloat(a))
										console.log({ name, lng, lat })

										const shapeId = 'ID' + Date.now()
										addMarker(shapeId, { lat, lng }, name, layerLabel)
										layers[layerLabel].push({ lat, lng, label: name })
									}
									saveData()
								}
							})
						}
						catch (e) {
							console.log('Error', e)
							$$.ui.showAlert({ title: 'Error', content: e })
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
				addMarker(id, data.latlng, data.tooltip, null, data.color)
			}

			for (const [layerName, markerInfos] of Object.entries(layers)) {
				map.addLayer(layerName, { label: layerName, visible: false, openPopupOnActivate: true })
				for (const markerInfo of markerInfos) {
					const { lat, lng, label, color } = markerInfo 
					const shapeId = 'ID_' + label.toUpperCase().replaceAll(' ', '_')
					addMarker(shapeId, { lat, lng }, label, layerName, color)
					markerInfo.shapeId = shapeId
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
					const { speed } = feature.properties
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
		function addMarker(shapeId, latlng, tooltip, layerId, color) {
			//console.log('addMarker', shapeId, latlng, tooltip)
			/**@type {Brainjs.Controls.Map.Shape.Marker} */
			const shapeInfo = {
				type: 'marker',
				layer: (layerId) ? layerId : 'markers',
				latlng,
				icon: {
					type: 'font',
					className: 'far fa-dot-circle',
					color: (color) ? color : 'green',
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
					},
					edit: {
						name: 'Edit',
						iconCls: 'fa-solid fa-pen w3-text-blue'
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




