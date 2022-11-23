//@ts-check
$$.control.registerControl('rootPage', {

	deps: ['breizbot.broker', 'breizbot.appData', 'breizbot.pager', 'breizbot.radar'],

	template: { gulp_inject: './main.html' },

	/**
	 * 
	 * @param {Breizbot.Services.Broker.Interface} broker 
	 * @param {Breizbot.Services.AppData.Interface} appData 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 * @param {Breizbot.Services.Radar.Interface} radarSrv
	 */
	init: function (elt, broker, appData, pager, radarSrv) {

		let { zoom, center, markers } = appData.getData()
		console.log('appData', appData.getData())
		markers = markers || {}

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
					const {id, cmd} = data
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

		async function initMarkers() {		
			
			
			for(let [id, data] of Object.entries(markers)) {
				addMarker(id, data.latlng, data.tooltip)
			}

			const radars = await radarSrv.getRadar()
			console.log({radars})

			map.addGeoData(radars, 'radar')

		}

		initMarkers()


		/**
		 * 
		 * @param {string} shapeId 
		 * @param {Brainjs.Controls.Map.LatLng} latlng 
		 * @param {string} tooltip 
		 */
		function addMarker(shapeId, latlng, tooltip) {
			//console.log('addMarker', shapeId, latlng, tooltip)
			/**@type {Brainjs.Controls.Map.Shape.Marker} */
			const shapeInfo = {
				type: 'marker',
				layer: 'markers',
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

		this.onAppExit = function () {
			//console.log('[map] onAppExit')
			return appData.saveData({ 
				zoom: map.getZoom(), 
				center: map.getCenter(),
				markers
			 })
		}
	}
});




