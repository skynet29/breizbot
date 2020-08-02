const { ExpressAdapter } = require('ask-sdk-express-adapter')

const db = require('../lib/db.js')
const util = require('../lib/util.js')
const skill = require('../alexa/skill.js')
const adapter = new ExpressAdapter(skill, true, true)


module.exports = function (app) {

	app.get('/alexa/authresponse', function (req, res) {
		console.log('authresponse')
		res.render('alexa', {})
	})

	app.post('/alexa', adapter.getRequestHandlers())

	app.get('/alexa/music/:id', async function (req, res) {
		//console.log('alexa music', req.params)

		const { id } = req.params

		const info = await db.getSongById(id)
		const { owner, fileName } = info

		const filePath = util.getFilePath(owner, fileName)
		//console.log('filePath', filePath)

		res.sendFile(filePath)

	})


}