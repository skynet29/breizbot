$$.control.registerControl('rootPage', {

	template: "<div>\n	<canvas class=\"visualizer\" bn-bind=\"canvas\"></canvas>\n	<div>\n		<button \n			class=\"w3-button w3-blue\" \n			bn-event=\"click: onRecord\"\n			bn-show=\"!recording\"\n		><i class=\"fas fa-circle\"></i></button>\n\n		<button \n			class=\"w3-button w3-red\" \n			bn-event=\"click: onStop\"\n			bn-show=\"recording\"\n		><i class=\"fa fa-stop\"></i></button>\n\n	</div>\n</div>\n\n<div class=\"scrollPanel\">\n	<div class=\"sound-clips\" bn-each=\"clips\" bn-event=\"click.delete: onDeleteClip, click.save: onSaveClip\">\n		<div class=\"clip\">\n			<audio bn-attr=\"{src: $scope.$i.url}\" controls controlsList=nodownload></audio>\n			<div class=\"clip-info\">\n				<span bn-text=\"$scope.$i.name\"></span>\n				<div>\n					<button class=\"w3-button w3-blue save\" title=\"Save clip\" bn-show=\"!$scope.$i.saved\"><i class=\"fa fa-save\"></i></button>\n					<button class=\"w3-button w3-blue delete\" title=\"Delete clip\"><i class=\"fa fa-trash\"></i></button>\n				</div>\n				\n			</div>\n		</div>\n	</div>	\n</div>\n\n",

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
						return files.uploadFile(blob, data.name + '.ogg', '/apps/micro')
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





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ3Jvb3RQYWdlJywge1xuXG5cdHRlbXBsYXRlOiBcIjxkaXY+XFxuXHQ8Y2FudmFzIGNsYXNzPVxcXCJ2aXN1YWxpemVyXFxcIiBibi1iaW5kPVxcXCJjYW52YXNcXFwiPjwvY2FudmFzPlxcblx0PGRpdj5cXG5cdFx0PGJ1dHRvbiBcXG5cdFx0XHRjbGFzcz1cXFwidzMtYnV0dG9uIHczLWJsdWVcXFwiIFxcblx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25SZWNvcmRcXFwiXFxuXHRcdFx0Ym4tc2hvdz1cXFwiIXJlY29yZGluZ1xcXCJcXG5cdFx0PjxpIGNsYXNzPVxcXCJmYXMgZmEtY2lyY2xlXFxcIj48L2k+PC9idXR0b24+XFxuXFxuXHRcdDxidXR0b24gXFxuXHRcdFx0Y2xhc3M9XFxcInczLWJ1dHRvbiB3My1yZWRcXFwiIFxcblx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25TdG9wXFxcIlxcblx0XHRcdGJuLXNob3c9XFxcInJlY29yZGluZ1xcXCJcXG5cdFx0PjxpIGNsYXNzPVxcXCJmYSBmYS1zdG9wXFxcIj48L2k+PC9idXR0b24+XFxuXFxuXHQ8L2Rpdj5cXG48L2Rpdj5cXG5cXG48ZGl2IGNsYXNzPVxcXCJzY3JvbGxQYW5lbFxcXCI+XFxuXHQ8ZGl2IGNsYXNzPVxcXCJzb3VuZC1jbGlwc1xcXCIgYm4tZWFjaD1cXFwiY2xpcHNcXFwiIGJuLWV2ZW50PVxcXCJjbGljay5kZWxldGU6IG9uRGVsZXRlQ2xpcCwgY2xpY2suc2F2ZTogb25TYXZlQ2xpcFxcXCI+XFxuXHRcdDxkaXYgY2xhc3M9XFxcImNsaXBcXFwiPlxcblx0XHRcdDxhdWRpbyBibi1hdHRyPVxcXCJ7c3JjOiAkc2NvcGUuJGkudXJsfVxcXCIgY29udHJvbHMgY29udHJvbHNMaXN0PW5vZG93bmxvYWQ+PC9hdWRpbz5cXG5cdFx0XHQ8ZGl2IGNsYXNzPVxcXCJjbGlwLWluZm9cXFwiPlxcblx0XHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwiJHNjb3BlLiRpLm5hbWVcXFwiPjwvc3Bhbj5cXG5cdFx0XHRcdDxkaXY+XFxuXHRcdFx0XHRcdDxidXR0b24gY2xhc3M9XFxcInczLWJ1dHRvbiB3My1ibHVlIHNhdmVcXFwiIHRpdGxlPVxcXCJTYXZlIGNsaXBcXFwiIGJuLXNob3c9XFxcIiEkc2NvcGUuJGkuc2F2ZWRcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1zYXZlXFxcIj48L2k+PC9idXR0b24+XFxuXHRcdFx0XHRcdDxidXR0b24gY2xhc3M9XFxcInczLWJ1dHRvbiB3My1ibHVlIGRlbGV0ZVxcXCIgdGl0bGU9XFxcIkRlbGV0ZSBjbGlwXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtdHJhc2hcXFwiPjwvaT48L2J1dHRvbj5cXG5cdFx0XHRcdDwvZGl2Plxcblx0XHRcdFx0XFxuXHRcdFx0PC9kaXY+XFxuXHRcdDwvZGl2Plxcblx0PC9kaXY+XHRcXG48L2Rpdj5cXG5cXG5cIixcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LmZpbGVzJ10sXG5cblx0aW5pdDogZnVuY3Rpb24oZWx0LCBmaWxlcykge1xuXG5cdFx0bGV0IG1lZGlhUmVjb3JkZXIgPSBudWxsXG5cdFx0bGV0IGNodW5rcyA9IFtdXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdHJlY29yZGluZzogZmFsc2UsXG5cdFx0XHRcdGNsaXBzOiBbXVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvblJlY29yZDogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblJlY29yZCcpXG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHtyZWNvcmRpbmc6IHRydWV9KVxuXHRcdFx0XHRcdG1lZGlhUmVjb3JkZXIuc3RhcnQoKVxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdG9uU3RvcDogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblN0b3AnKVxuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7cmVjb3JkaW5nOiBmYWxzZX0pXG5cdFx0XHRcdFx0bWVkaWFSZWNvcmRlci5zdG9wKClcblx0XHRcdFx0fSxcblxuXHRcdFx0XHRvbkRlbGV0ZUNsaXA6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25EZWxldGVDbGlwJylcblx0XHRcdFx0XHRjb25zdCBpbmRleCA9ICQodGhpcykuY2xvc2VzdCgnLmNsaXAnKS5pbmRleCgpXG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnaW5kZXgnLCBpbmRleClcblx0XHRcdFx0XHRjb25zdCBkYXRhID0gY3RybC5tb2RlbC5jbGlwc1tpbmRleF1cblx0XHRcdFx0XHRVUkwucmV2b2tlT2JqZWN0VVJMKGRhdGEudXJsKVxuXG5cdFx0XHRcdFx0Y3RybC5tb2RlbC5jbGlwcy5zcGxpY2UoaW5kZXgsIDEpXG5cdFx0XHRcdFx0Y3RybC51cGRhdGUoKVxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdG9uU2F2ZUNsaXA6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25TYXZlQ2xpcCcpXG5cdFx0XHRcdFx0Y29uc3QgaW5kZXggPSAkKHRoaXMpLmNsb3Nlc3QoJy5jbGlwJykuaW5kZXgoKVxuXHRcdFx0XHRcdGNvbnN0IGRhdGEgPSBjdHJsLm1vZGVsLmNsaXBzW2luZGV4XVxuXG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnZGF0YScsIGRhdGEpXG5cblx0XHRcdFx0XHRmZXRjaChkYXRhLnVybClcblx0XHRcdFx0XHQudGhlbigocmVzcCkgPT4geyBcblx0XHRcdFx0XHRcdHJldHVybiByZXNwLmJsb2IoKVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0LnRoZW4oKGJsb2IpID0+IHtcblx0XHRcdFx0XHRcdHJldHVybiBmaWxlcy51cGxvYWRGaWxlKGJsb2IsIGRhdGEubmFtZSArICcub2dnJywgJy9hcHBzL21pY3JvJylcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdC50aGVuKChyZXNwKSA9PiB7XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdFx0XHRkYXRhLnNhdmVkID0gdHJ1ZVxuXHRcdFx0XHRcdFx0Y3RybC51cGRhdGUoKVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0LmNhdGNoKGZ1bmN0aW9uKHJlc3ApIHtcblx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7XG5cdFx0XHRcdFx0XHRcdHRpdGxlOiAnRXJyb3InLFxuXHRcdFx0XHRcdFx0XHRjb250ZW50OiByZXNwLnJlc3BvbnNlVGV4dFxuXHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHR9KVx0XHRcdFx0XHRcdFxuXHRcdFx0XHR9XG5cblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0Y29uc3QgY2FudmFzID0gY3RybC5zY29wZS5jYW52YXMuZ2V0KDApXG5cdFx0Y29uc3QgY2FudmFzQ3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJylcblx0XHRjb25zdCBhdWRpb0N0eCA9IG5ldyBBdWRpb0NvbnRleHQoKVxuXG5cdFx0ZnVuY3Rpb24gdmlzdWFsaXplKHN0cmVhbSkge1xuXHRcdFx0Y29uc3Qgc291cmNlID0gYXVkaW9DdHguY3JlYXRlTWVkaWFTdHJlYW1Tb3VyY2Uoc3RyZWFtKVxuXHRcdFx0Y29uc3QgYW5hbHlzZXIgPSBhdWRpb0N0eC5jcmVhdGVBbmFseXNlcigpXG5cblx0XHRcdGFuYWx5c2VyLmZmdFNpemUgPSAyMDQ4XG5cblx0XHRcdGNvbnN0IGJ1ZmZlckxlbmd0aCA9IGFuYWx5c2VyLmZyZXF1ZW5jeUJpbkNvdW50XG5cdFx0XHRjb25zdCBkYXRhQXJyYXkgPSBuZXcgVWludDhBcnJheShidWZmZXJMZW5ndGgpXG5cblx0XHRcdHNvdXJjZS5jb25uZWN0KGFuYWx5c2VyKVxuXG5cdFx0XHRkcmF3KClcblxuXHRcdFx0ZnVuY3Rpb24gZHJhdygpIHtcblx0XHRcdFx0Y29uc3Qgd2lkdGggPSBjYW52YXMud2lkdGhcblx0XHRcdFx0Y29uc3QgaGVpZ2h0ID0gY2FudmFzLmhlaWdodFxuXG5cdFx0XHRcdHJlcXVlc3RBbmltYXRpb25GcmFtZShkcmF3KVxuXG5cdFx0XHRcdGFuYWx5c2VyLmdldEJ5dGVUaW1lRG9tYWluRGF0YShkYXRhQXJyYXkpXG5cblx0XHRcdFx0Y2FudmFzQ3R4LmZpbGxTdHlsZSA9ICdyZ2IoMjAwLCAyMDAsIDIwMCknXG5cdFx0XHRcdGNhbnZhc0N0eC5maWxsUmVjdCgwLCAwLCB3aWR0aCwgaGVpZ2h0KVxuXG5cdFx0XHRcdGNhbnZhc0N0eC5saW5lV2lkdGggPSAyXG5cdFx0XHRcdGNhbnZhc0N0eC5zdHJva2VTdHlsZSA9ICdyZ2IoMCwgMCwgMCknXG5cblx0XHRcdFx0Y2FudmFzQ3R4LmJlZ2luUGF0aCgpXG5cblx0XHRcdFx0Y29uc3Qgc2xpY2VXaWR0aCA9IHdpZHRoIC8gYnVmZmVyTGVuZ3RoXG5cdFx0XHRcdGxldCB4ID0gMFxuXG5cdFx0XHRcdGZvcihsZXQgaSA9IDA7IGkgPCBidWZmZXJMZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdGNvbnN0IHYgPSBkYXRhQXJyYXlbaV0gLyAxMjguMFxuXHRcdFx0XHRcdGNvbnN0IHkgPSB2ICogaGVpZ2h0IC8gMlxuXG5cdFx0XHRcdFx0aWYgKGkgPT0gMCkgIHtcblx0XHRcdFx0XHRcdGNhbnZhc0N0eC5tb3ZlVG8oeCwgeSlcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRjYW52YXNDdHgubGluZVRvKHgsIHkpXG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0eCArPSBzbGljZVdpZHRoXG5cblx0XHRcdFx0fVxuXG5cdFx0XHRcdGNhbnZhc0N0eC5saW5lVG8od2lkdGgsIGhlaWdodCAvIDIpXG5cdFx0XHRcdGNhbnZhc0N0eC5zdHJva2UoKVxuXHRcdFx0fVxuXG5cdFx0fVxuXG5cdFx0bmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXRVc2VyTWVkaWEoe2F1ZGlvOiB0cnVlfSkudGhlbigoc3RyZWFtKSA9PiB7XG5cblx0XHRcdG1lZGlhUmVjb3JkZXIgPSBuZXcgTWVkaWFSZWNvcmRlcihzdHJlYW0pXG5cblx0XHRcdG1lZGlhUmVjb3JkZXIub25kYXRhYXZhaWxhYmxlID0gZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRjaHVua3MucHVzaChlLmRhdGEpXG5cdFx0XHR9XG5cblx0XHRcdG1lZGlhUmVjb3JkZXIub25zdG9wID0gZnVuY3Rpb24oZSkge1xuXHRcdFx0XHQkJC51aS5zaG93UHJvbXB0KHt0aXRsZTogJ1NvdW5kIENsaXAgVGl0bGUnLCBsYWJlbDogJ0VudGVyIGEgbmFtZTonfSwgZnVuY3Rpb24obmFtZSkge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdjbGlwTmFtZScsIG5hbWUpXG5cdFx0XHRcdFx0Y29uc3QgYmxvYiA9IG5ldyBCbG9iKGNodW5rcywge3R5cGU6ICdhdWRpby9vZ2c7IGNvZGVjcz1vcHVzJ30pXG5cdFx0XHRcdFx0Y2h1bmtzID0gW11cblx0XHRcdFx0XHRjb25zdCB1cmwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IpXG5cdFx0XHRcdFx0Y3RybC5tb2RlbC5jbGlwcy5wdXNoKHtuYW1lLCB1cmwsIHNhdmVkOiBmYWxzZX0pXG5cdFx0XHRcdFx0Y3RybC51cGRhdGUoKVxuXHRcdFx0XHR9KVxuXHRcdFx0fVxuXG5cdFx0XHR2aXN1YWxpemUoc3RyZWFtKVxuXHRcdH0pXG5cblxuXHR9XG5cblxuXG59KTtcblxuXG5cblxuIl19
