$$.control.registerControl('rootPage', {

	template: {gulp_inject: './main.html'},

	deps: ['breizbot.files'],

	init: function(elt, files) {

		let mediaRecorder = null
		let chunks = []

		const ctrl = $$.viewController(elt, {
			data: {
				recording: false,
				clips: []
			},
			events: {
				onRecord: function(ev) {
					//console.log('onRecord')
					ctrl.setData({recording: true})
					mediaRecorder.start()
				},

				onStop: function(ev) {
					//console.log('onStop')
					ctrl.setData({recording: false})
					mediaRecorder.stop()
				},

				onDeleteClip: function(ev) {
					//console.log('onDeleteClip')
					const index = $(this).closest('.clip').index()
					//console.log('index', index)
					const data = ctrl.model.clips[index]
					URL.revokeObjectURL(data.url)

					ctrl.model.clips.splice(index, 1)
					ctrl.update()
				},

				onSaveClip: function(ev) {
					//console.log('onSaveClip')
					const index = $(this).closest('.clip').index()
					const data = ctrl.model.clips[index]

					//console.log('data', data)

					fetch(data.url)
					.then((resp) => { 
						return resp.blob()
					})
					.then((blob) => {
						return files.uploadFile(blob, data.name + '.ogg', '/sounds/micro')
					})
					.then((resp) => {
						console.log('resp', resp)
						data.saved = true
						ctrl.update()
					})
					.catch(function(resp) {
						$$.ui.showAlert({
							title: 'Error',
							content: resp.responseText
						})
					})						
				}

			}
		})

		const canvas = ctrl.scope.canvas.get(0)
		const canvasCtx = canvas.getContext('2d')
		const audioCtx = new AudioContext()

		function visualize(stream) {
			const source = audioCtx.createMediaStreamSource(stream)
			const analyser = audioCtx.createAnalyser()

			analyser.fftSize = 2048

			const bufferLength = analyser.frequencyBinCount
			const dataArray = new Uint8Array(bufferLength)

			source.connect(analyser)

			draw()

			function draw() {
				const width = canvas.width
				const height = canvas.height

				requestAnimationFrame(draw)

				analyser.getByteTimeDomainData(dataArray)

				canvasCtx.fillStyle = 'rgb(200, 200, 200)'
				canvasCtx.fillRect(0, 0, width, height)

				canvasCtx.lineWidth = 2
				canvasCtx.strokeStyle = 'rgb(0, 0, 0)'

				canvasCtx.beginPath()

				const sliceWidth = width / bufferLength
				let x = 0

				for(let i = 0; i < bufferLength; i++) {
					const v = dataArray[i] / 128.0
					const y = v * height / 2

					if (i == 0)  {
						canvasCtx.moveTo(x, y)						
					}
					else {
						canvasCtx.lineTo(x, y)
					}

					x += sliceWidth

				}

				canvasCtx.lineTo(width, height / 2)
				canvasCtx.stroke()
			}

		}

		navigator.mediaDevices.getUserMedia({audio: true}).then((stream) => {

			mediaRecorder = new MediaRecorder(stream)

			mediaRecorder.ondataavailable = function(e) {
				chunks.push(e.data)
			}

			mediaRecorder.onstop = function(e) {
				$$.ui.showPrompt({title: 'Sound Clip Title', label: 'Enter a name:'}, function(name) {
					console.log('clipName', name)
					const blob = new Blob(chunks, {type: 'audio/ogg; codecs=opus'})
					chunks = []
					const url = URL.createObjectURL(blob)
					ctrl.model.clips.push({name, url, saved: false})
					ctrl.update()
				})
			}

			visualize(stream)
		})


	}



});



