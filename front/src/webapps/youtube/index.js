
const path = require('path')
const fs = require('fs-extra')
const fetch = require("node-fetch");

const { spawn } = require('child_process');


module.exports = function (ctx, router) {

	const { wss, config, util } = ctx

	function download(videoId, destinationPath, onProgress) {
		console.log('download', { videoId, destinationPath })
		return new Promise((resolve, reject) => {
			const url = `https://www.youtube.com/watch?v=${videoId}`;

			const outputTemplate = path.join(destinationPath, "%(title)s.%(ext)s");

			const yt = spawn("python3", [
				path.join(config.scriptPath, 'yt-dlp'),
				"--progress-template", "%(progress)j",
				"-t", "mp4",
				"-o", outputTemplate,
				url
			]);

			yt.stdout.on("data", (data) => {
				//console.log('data', data.toString())
				const lines = data.toString().trim().split("\n");

				for (const line of lines) {
					try {
						const json = JSON.parse(line);
						//console.log('json', json)

						if (json.status === "downloading") {
							const percent = (json.downloaded_bytes / json.total_bytes) * 100

							//console.log({percent})

							onProgress({
								percent,
								downloaded: json.downloaded_bytes,
								total: json.total_bytes,
								speed: json.speed,
								eta: json.eta
							});
						}

						if (json.status === "finished") {
							onProgress({ percent: 100 });
						}

					} catch {
						// ignore non-json lines
					}
				}
			});

			yt.stderr.on("data", (data) => {
				console.error(data.toString());
			});

			yt.on("error", reject);

			yt.on("close", (code) => {
				if (code === 0) {
					resolve();
				} else {
					reject(new Error(`yt-dlp exited with code ${code}`));
				}
			});
		});
	}

	function getInfo(videoId) {
		return new Promise((resolve, reject) => {
			const url = `https://www.youtube.com/watch?v=${videoId}`;

			const yt = spawn("yt-dlp", [
				"-J",        // dump json
				"--no-warnings",
				"--no-playlist",
				url
			]);

			let data = "";

			yt.stdout.on("data", chunk => {
				data += chunk.toString();
			});

			yt.stderr.on("data", err => {
				console.error(err.toString());
				reject(new Error(err.toString()))
			});

			yt.on("error", reject);

			yt.on("close", code => {
				if (code !== 0) {
					return reject(new Error(`yt-dlp exited with code ${code}`));
				}

				try {
					const json = JSON.parse(data);
					resolve(json);
				} catch (e) {
					reject(e);
				}
			});
		});
	}



	router.post('/search', async function (req, res) {
		//console.log('youtube/search', req.body)

		const { query, maxResults } = req.body

		try {
			const data = await util.search('videos', query, { count: 100 })
			if (data.error) {
				res.json(data.error.message)
			}
			else {
				const { items } = data.result

				res.json(items
					.filter((i) => i.source.toUpperCase() == 'YOUTUBE')
					.map((i) => {
						return {
							id: i.media_id,
							title: i.title,
							thumbnail: i.thumbnail,
							date: i.date
						}
					})
					// .slice(0, maxResults)
				)
			}
		}
		catch (e) {
			console.log('error', e)
			res.sendStatus(404)
		}

	})

	router.get('/info', async function (req, res) {
		const { videoId } = req.query

		try {
			const info = await getInfo(videoId)
			//console.log('info', JSON.stringify(info, null, 4))
			console.log('info', Object.keys(info))


			const { title, description, duration, width, height } = info
			res.json({
				title,
				description,
				length_seconds: duration,
				width,
				height
			})
		}
		catch(e) {
			res.json({error: e.message})
		}

	})

	router.post('/download', async function (req, res) {
		let { srcId, videoId } = req.body
		const userName = req.session.user
		const destPath = path.join(config.CLOUD_HOME, userName, 'apps/ytdl')


		//const info = await getInfo(videoId)

		// if (info.captions) {

		// 	const captions = info.captions.playerCaptionsTracklistRenderer.captionTracks.filter(f => f.languageCode == 'fr')
		// 	console.log({ captions })
		// 	const subtitles = info.captions.playerCaptionsTracklistRenderer.captionTracks.map(f => f.name.runs[0].text)
		// 	console.log({ subtitles })
		// 	if (captions.length > 0) {
		// 		await download(captions[0].baseUrl + '&format=vtt', path.join(destPath, fileName.replace('.mp4', '.vtt')), wss, srcId)
		// 		console.log('french captions dowloaded!')
		// 	}
		// }

		// const formats = info.streamingData.adaptiveFormats;

		// const audioFormat = formats.filter(f => f.mimeType.match(/^audio\/\w+/) && f.audioQuality == 'AUDIO_QUALITY_MEDIUM')
		// console.log('audioFormat', audioFormat)

		res.sendStatus(200)

		fs.lstat(destPath)
			.catch(function (err) {
				console.log('lstat', err)
				return fs.mkdirp(destPath)
			})
			.then(async () => {

				try {
					await download(videoId, destPath, ({ percent }) => {
						wss.sendToClient(srcId, { topic: 'breizbot.ytdl.progress', data: { percent } })
					})
					wss.sendToClient(srcId, { topic: 'breizbot.ytdl.progress', data: { finish: true } })
					console.log('video downloaded !')
				}
				catch (e) {
					console.error(e.message)
					wss.sendToClient(srcId, { topic: 'breizbot.ytdl.progress', data: { error: e.message } })
				}



			})


	})

}

