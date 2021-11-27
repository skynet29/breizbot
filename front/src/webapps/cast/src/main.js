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


		const ctrl = $$.viewController(elt, {
			data: {
				logs: ['toto'],
				url: '#',
				type: 'video'
			},
			events: {
			}
		})

		navigator.presentation.receiver.connectionList
			.then(list => {
				console.log(list.connections)
				list.connections.map(connection => addConnection(connection))

				list.addEventListener('connectionavailable', function (event) {
					console.log('connectionavailable')
					addConnection(event.connection)
				})
			})

		function addConnection(connection) {
			console.log('addConnection', connection.state)

			connection.send(JSON.stringify({type: 'ready'}))

			connection.addEventListener('message', function (event) {
				const msg = JSON.parse(event.data)
				console.log('Message', msg)
				switch (msg.type) {
					case 'url':
						ctrl.setData({url: msg.url})
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




