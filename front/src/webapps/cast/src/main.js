// @ts-check

$$.control.registerControl('rootPage', {

	template: { gulp_inject: './main.html' },

	deps: ['breizbot.pager'],

	props: {
	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 */
	init: function (elt, pager) {

		let presentationConnection = null

		const ctrl = $$.viewController(elt, {
			data: {
				url: '#'
			},
			events: {
				onPlaying: function() {
					sendMsg({type: 'event', name: 'playing'})
				},
				onPaused: function() {
					sendMsg({type: 'event', name: 'paused'})
				}

			}
		})

		/**@type {HTMLVideoElement} */
		const videoElt = ctrl.scope.video.get(0)

		navigator.presentation.receiver.connectionList
			.then(list => {
				console.log(list.connections)
				list.connections.map(connection => addConnection(connection))

				list.addEventListener('connectionavailable', function (event) {
					console.log('connectionavailable')
					addConnection(event.connection)
				})
			})

		function sendMsg(msg) {
			presentationConnection.send(JSON.stringify(msg))				
		}

		function addConnection(connection) {
			console.log('addConnection', connection.state)
			presentationConnection = connection

			sendMsg({type: 'ready'})

			connection.addEventListener('message', function (event) {
				const msg = JSON.parse(event.data)
				console.log('Message', msg)
				switch (msg.type) {
					case 'url':
						ctrl.setData({url: msg.url})
						break
					case 'volume':
						videoElt.volume = msg.volume
						break
					case 'play':
						videoElt.play()
						break
					case 'pause':
						videoElt.pause()
						break
				}
			})

			connection.addEventListener('connect', function (event) {
				console.log('connected')
			})

			connection.addEventListener('close', function (event) {
				console.log('Connection closed!')
			})
		}


	}


});




