(function() {

'use strict';

const httpMessageParser = require('http-message-parser')
const Buffer = require('buffer/').Buffer


$$.control.registerControl('rootPage', {
	template: {gulp_inject: './main.html'},

	deps: ['breizbot.broker', 'breizbot.files'],

	init: function(elt, broker, files) {
		const clientId = 'amzn1.application-oa2-client.0362e10e33584617919120e592423223'
		const productID = 'test_device'
		const deviceSerialNumber =  123
		const redirectUri = `https://${window.location.host}/alexa/authresponse`

		const ctrl = $$.viewController(elt, {
			data: {
				recording: false,
				connected: false
			},
			events: {
				onConnect: function(ev) {
					console.log('onConnect')
					promptUserLogin()
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
		
		let cnxId
		let mediaRecorder = null
		let accessToken
		let chunks = []
		const audioPlayer = new Audio()

		broker.on('ready', (msg) => {
			console.log('msg', msg)
			cnxId = msg.clientId
		})

		broker.onTopic('breizbot.alexa.auth', (msg) => {
			console.log('msg', msg)
			const {access_token} = msg.data
			accessToken = access_token
			ctrl.setData({connected: true})
		})

		function promptUserLogin() {
			const scope = 'alexa:all'
			const scopeData = {
			  'alexa:all': {
			    productID,
			    productInstanceAttributes: {
			      deviceSerialNumber
			    }
			  }
			}

			const authUrl = $$.util.getUrlParams('https://www.amazon.com/ap/oa', {
				client_id: clientId,
				scope,
				scope_data: JSON.stringify(scopeData),
				response_type: 'token',
				redirect_uri : redirectUri,
				state: cnxId
			})

			window.open(authUrl)

		}

		function blobToAudioBuffer(blob) {
			return new Promise((resolve, reject) => {
				const audioCtx = new AudioContext()

				const reader = new FileReader()
				reader.onload = function() {
					audioCtx.decodeAudioData(reader.result).then((buffer) => {
						console.log('buffer', buffer)
						const {numberOfChannels, sampleRate} = buffer

						let result
						if (numberOfChannels === 2) {
							result = $$.util.audio.interleave(buffer.getChannelData(0), buffer.getChannelData(1))									
						}
						else {
							result = buffer.getChannelData(0)
						}

						result = $$.util.audio.downSampleBuffer(result, sampleRate, 16000)
						resolve($$.util.audio.encodeWAV(result, 1, 16000, 1, 16))
					})
				}
				reader.readAsArrayBuffer(blob)					

			})
		}

		function sendAudio(audioBuffer) {
			return new Promise((resolve, reject) => {

				const metadata = {
				  messageHeader: {},
				  messageBody: {
				    profile: 'alexa-close-talk',
				    locale: 'en-us',
				    format: 'audio/L16; rate=16000; channels=1'
				  }
				};

				const fd = new FormData()
				fd.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}))
				fd.append('audio', new Blob([new DataView(audioBuffer)], {type: 'audio/L16; rate=16000; channels=1'}))

				const url = 'https://access-alexa-na.amazon.com/v1/avs/speechrecognizer/recognize'

				const xhr = new XMLHttpRequest()

				xhr.open('POST', url, true)
				xhr.responseType = 'arraybuffer'

				xhr.onload = (event) => {
				     const data = xhr.response
				     const buffer = new Buffer(data)

			        if (xhr.status === 200) {
			          const parsedMessage = httpMessageParser(buffer)
			          resolve({data, response: parsedMessage})
			        }
				};

				xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`)
				xhr.send(fd)

			})

		}

		function findAudioFromContentId(audioMap, contentId) {
		  contentId = contentId.replace('cid:', '');
		  for (var key in audioMap) {
		    if (key.indexOf(contentId) > -1) {
		      return audioMap[key];
		    }
		  }
		}		

		function decodeResponse(resp) {
			const {response, data} = resp
			var audioMap = {};
			var directives = null;
			if (response.multipart.length) {
			  	response.multipart.forEach(multipart => {
				    let body = multipart.body;
				    if (multipart.headers && multipart.headers['Content-Type'] === 'application/json') {
						try {
							body = JSON.parse(body);
						} catch(error) {
							console.error(error);
						}

						if (body && body.messageBody && body.messageBody.directives) {
							directives = body.messageBody.directives;
						}

				    } else if (multipart.headers['Content-Type'] === 'audio/mpeg') {
						const start = multipart.meta.body.byteOffset.start;
						const end = multipart.meta.body.byteOffset.end;
						/**
						* Not sure if bug in buffer module or in http message parser
						* because it's joining arraybuffers so I have to this to
						* seperate them out.
						*/
						var slicedBody = data.slice(start, end);

						audioMap[multipart.headers['Content-ID']] = slicedBody;
				    }
			  					
				})
			}
			console.log('directives', directives)			
			directives.forEach(directive => {
			  if (directive.namespace === 'SpeechSynthesizer') {
			    if (directive.name === 'speak') {
			      const contentId = directive.payload.audioContent;
			      const audio = findAudioFromContentId(audioMap, contentId);
			      if (audio) {
				       const blob = new Blob([audio], {type: 'audio/mpeg'})

				       files.uploadFile(blob, Date.now() + '.mp3', '/apps/alexa').then(() => {
					       	audioPlayer.src = URL.createObjectURL(blob)
					       	audioPlayer.play()			       	
				       })

			      }
			    }
			  }
			})
		}

		navigator.mediaDevices.getUserMedia({audio: true}).then((stream) => {

			mediaRecorder = new MediaRecorder(stream)

			mediaRecorder.ondataavailable = function(e) {
				chunks.push(e.data)
			}

			mediaRecorder.onstop = function(e) {

				const blob = new Blob(chunks, {type: 'audio/ogg; codecs=opus'})
				chunks = []

				blobToAudioBuffer(blob).then((audioBuffer) => {
					return sendAudio(audioBuffer)
				})
				.then((resp) => {
					decodeResponse(resp)
				})

				
			}
		})			
	}
})

})();




