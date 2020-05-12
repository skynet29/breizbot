$$.control.registerControl('rootPage', {

	deps: ['breizbot.broker', 'breizbot.appData', 'breizbot.pager'],

	template: { gulp_inject: './main.html' },

	init: function (elt, broker, appData, pager) {

		let { zoom, center, markers } = appData.getData()
		console.log('appData', appData.getData())
		markers = markers || {}

		const ctrl = $$.viewController(elt, {
			data: {
				center: center || { lat: 48.39, lng: -4.486 },
				zoom: zoom || 13,
				watchID: null,
				show1: function () {
					return this.watchID == null
				}
			},
			events: {
				onShapeContextMenu: function (ev, data) {
					//console.log('onShapeContextMenu', data)
					const {id, latlng, cmd} = data
					if (cmd == 'remove') {
						ctrl.scope.map.removeShape(id)
						delete markers[id]	
					}
					if (cmd == "zoom") {
						const info = ctrl.scope.map.getShapeInfo(id)
						//console.log('info', info)
						ctrl.scope.map.flyTo(info.latlng, 13)
					}

				},
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
						onReturn: function (coord) {
							//console.log('onReturn', coord)
							const latlng = { lat: coord.lat, lng: coord.lon }
							try {
								ctrl.scope.map.updateShape('marker', { latlng })
							}
							catch (e) {
								ctrl.scope.map.addShape('marker', {
									type: 'marker',
									latlng
								})
							}
							ctrl.scope.map.flyTo(latlng, 13)
						}
					})
				},
				onLocationChange: function (ev, state) {
					//console.log('onLocationChange', state)
					if (state == 'ON') {
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
						ctrl.scope.map.removeShape('location')
					}
				}
			}
		})

		function initMarkers() {			
			for(let [id, data] of Object.entries(markers)) {
				addMarker(id, data.latlng, data.tooltip)
			}

		}

		initMarkers()


		function addMarker(shapeId, latlng, tooltip) {
			//console.log('addMarker', shapeId, latlng, tooltip)
			ctrl.scope.map.addShape(shapeId, {
				type: 'marker',
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
			})
	
		}


		function geoError() {
			console.log('geolocation error')
		}

		function updateLocation(position) {
			const latlng = {
				lat: position.coords.latitude,
				lng: position.coords.longitude
			}
			//console.log('updateLocation', latlng)
			try {
				ctrl.scope.map.updateShape('location', { latlng })
			}
			catch (e) {
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

		broker.register('breizbot.friendPosition', (msg) => {
			if (msg.hist) {
				return
			}
			const {data} = msg
			//console.log('breizbot.friendPosition', msg)	
			const time = new Date(msg.time).toLocaleTimeString('fr-FR')		
			const shapeId = 'friends.' + data.userName
			const popupContent = data.userName + '<br>' + time
			try {
				ctrl.scope.map.updateShape(shapeId, {
					latlng: data.coords,
					popupContent
				})
			}
			catch (e) {
				ctrl.scope.map.addShape(shapeId, {
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
				ctrl.scope.map.removeShape(shapeId)
				return
			}

			try {
				ctrl.scope.map.updateShape(shapeId, shape)
			}
			catch (e) {
				ctrl.scope.map.addShape(shapeId, shape)
			}
		})

		this.onAppExit = function () {
			//console.log('[map] onAppExit')
			const { map } = ctrl.scope
			return appData.saveData({ 
				zoom: map.getZoom(), 
				center: map.getCenter(),
				markers
			 })
		}
	}
});




