module.exports = function (ctx, router) {


	const { homebox } = ctx.wss


	router.get('/drive', function (req, res) {
		console.log('/drive', req.session.user)

		const userName = req.session.user

		//console.log('clients', clients)
		homebox.callService(userName, 'homebox.media.drive').then((result) => {
			res.json(result)
		})
			.catch((err) => {
				res.status(400).send(err)
			})

	})


	router.post('/list', function (req, res) {
		console.log('/list', req.session.user)

		const userName = req.session.user
		const data = req.body

		//console.log('clients', clients)
		homebox.callService(userName, 'homebox.media.list', data).then((result) => {
			res.json(result)
		})
			.catch((err) => {
				res.status(400).send(err)
			})

	})

	function getMimeType(fileName) {
		if (fileName.endsWith('.mp4')) {
			return 'video/mp4'
		}
		if (fileName.endsWith('.mp3')) {
			return 'audio/mpeg'
		}
		if (fileName.endsWith('.ogg')) {
			return 'audio/ogg'
		}

	}

	router.get('/load', function (req, res) {
		console.log('load req', req.query)
		const { fileName, driveName } = req.query
		const userName = req.session.user
		const range = req.headers.range
		console.log('range', range)

		homebox.callService(userName, 'homebox.media.load', {
			fileName,
			driveName,
			range
		}).then((result) => {
			//console.log('result', result)
			const { start, size, bytesRead } = result
			const end = start + bytesRead - 1
			console.log('start:', start, 'size:', size, 'bytesRead:', bytesRead, 'end:', end)
			res.writeHead(206, {
				'Content-Length': bytesRead,
				'Content-Type': getMimeType(fileName),
				'Accept-Ranges': 'bytes',
				'Content-Range': `bytes ${start}-${end}/${size}`
			})

			const buffer = Buffer.from(result.buffer, 'base64')
			res.end(buffer, 'binary')
		})
			.catch((e) => {
				console.log('Error', e)
				res.status(400).send(e)
			})

	})

}