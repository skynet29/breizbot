(function() {

'use strict';

const avs = require('./lib/avs')
//@ts-check

$$.control.registerControl('rootPage', {
	template: {gulp_inject: './main.html'},

	deps: ['breizbot.broker', 'breizbot.appData'],

	/**
	 * 
	 * @param {Breizbot.Services.Broker.Interface} broker 
	 * @param {Breizbot.Services.AppData.Interface} appData 
	 */
	init: function(elt, broker, appData) {

		let cnxId
		let mediaRecorder = null
		let chunks = []
		const audioPlayer = new Audio()
		let {accessToken} = appData.getData()
		//console.log('accessToken', accessToken)


		const ctrl = $$.viewController(elt, {
			data: {
				recording: false,
				connected: accessToken != undefined
			},
			events: {
				onConnect: function(ev) {
					console.log('onConnect')
					avs.promptUserLogin(cnxId)
				},

				onRecord: function(ev) {
					console.log('onRecord')
					ctrl.setData({recording: true})
					mediaRecorder.start()
				},

				onStop: function(ev) {
					console.log('onStop')
					ctrl.setData({recording: false})
					mediaRecorder.stop()
				},				
			}
		})	
		


		broker.on('ready', (msg) => {
			console.log('msg', msg)
			cnxId = msg.clientId
		})

		broker.onTopic('breizbot.alexa.auth', (msg) => {
			console.log('msg', msg)
			const {access_token} = msg.data
			accessToken = access_token
			ctrl.setData({connected: true})
			appData.saveData({accessToken})
		})


		navigator.mediaDevices.getUserMedia({audio: true}).then((stream) => {

			mediaRecorder = new MediaRecorder(stream)

			mediaRecorder.ondataavailable = function(e) {
				chunks.push(e.data)
			}

			mediaRecorder.onstop = function(e) {

				const blob = new Blob(chunks, {type: 'audio/ogg; codecs=opus'})
				chunks = []


				avs.sendAudio(accessToken, blob).then((resp) => {
					console.log('resp', resp)
					avs.decodeDirectives(resp, audioPlayer)					
				})
				.catch((err) => {
					console.log('err', err)
					if (err.code == avs.InvalidAccessTokenException) {
						$$.ui.showAlert({title: 'Error', content: err.message})
						ctrl.setData({connected: false})
					}
				})

				
			}
		})			
	}
})

})();




