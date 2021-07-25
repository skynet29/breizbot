//@ts-check

const dbSongs = require('../db/songs.js')
const util = require('../lib/util.js')
const login = require('../lib/login.js')


module.exports = function (app) {

	app.get('/alexa/authresponse', function (req, res) {
		console.log('authresponse')
		res.render('alexa', {})
	})

	app.get('/alexa/privacy', function (req, res) {
		console.log('privacy')
		res.render('privacy', {})
	})

	app.get('/alexa/login', function (req, res) {
		console.log('get alexa login', req.query)
		const { client_id, state, redirect_uri } = req.query

		if (client_id != 'amzn1.application-oa2-client.7b7722f7e9a14eebb757ad630b9ea63e') {
			res.sendStatus(401)
			return
		}

		login.renderLogin(res, { state, redirect_uri })
	})

	app.post('/alexa/login', async function (req, res) {

		console.log('post alexa login', req.body)

		const data = await login.checkLogin(req, res)
		console.log('data', data)
		if (data === false) {
			return
		}
		const { state, redirect_uri } = req.body
		const accessToken = data._id.toString()

		res.redirect(`${redirect_uri}#state=${state}&token_type=token&access_token=${accessToken}`)

	})

	app.get('/alexa/music/:id', async function (req, res) {
		//console.log('alexa music', req.params)

		const { id } = req.params

		const info = await dbSongs.getSongById(id)
		const { owner, fileName } = info

		const filePath = util.getFilePath(owner, fileName)
		//console.log('filePath', filePath)

		res.sendFile(filePath)

	})


}