$$.control.registerControl('rootPage', {

	template: {gulp_inject: './main.html'},

	deps: ['breizbot.broker', 'breizbot.users'],

	init: function(elt, broker, users) {

		let cnxId = null

		const ctrl = $$.viewController(elt, {
			data: {
			},
			events: {
				onLinkClicked: function() {
					console.log('onLinkClicked')
					const clientId = 'amzn1.application-oa2-client.0362e10e33584617919120e592423223'
					const redirectUri = `https://${window.location.host}/alexa/authresponse`
								
					const authUrl = $$.util.getUrlParams('https://www.amazon.com/ap/oa', {
						client_id: clientId,
						scope: 'profile:user_id',
						response_type: 'token',
						redirect_uri : redirectUri,
						state: cnxId
					})
				
					window.open(authUrl)
				
				}
			}
		})

		broker.on('ready', (msg) => {
			console.log('msg', msg)
			cnxId = msg.clientId
		})

		broker.onTopic('breizbot.alexa.auth', async (msg) => {
			console.log('msg', msg)
			const {access_token} = msg.data
			users.computeAlexaUserId(access_token)
		})

	}


});




