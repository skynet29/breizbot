//@ts-check

const config = require('./lib/config')
console.log('config', config)

const dbUtil = require('./lib/dbUtil')
const fs = require('fs-extra')
const parseUrl = require('url').parse
const helmet = require('helmet')
const http = require('http')
const { ExpressAdapter } = require('ask-sdk-express-adapter')
const path = require('path')
const websocket = require('./lib/websocket.js')


require('colors')

const appsPath = path.join(__dirname, '../front/src/webapps')
const apps = fs.readdirSync(appsPath)

const apisPath = path.join(__dirname, './api')
const apis = fs.readdirSync(apisPath)

const ssml = require('./alexa/ssml.js')

dbUtil.init().then(dbReady)
	.catch((e) => {
		console.log('Error', e)
		process.exit(1)
	})


function dbReady() {

	console.log('dbReady')

	const wss = require('./lib/wss.js')


	const util = require('./lib/util')
	const events = require('./lib/events')
	
	const express = require('express')
	const session = require('express-session')
	const bodyParser = require('body-parser')
	const fileUpload = require('express-fileupload')
	const favicon = require('express-favicon')

	const path = require('path')

	const MongoDBStore = require('connect-mongodb-session')(session);

	const store = new MongoDBStore({
		uri: config.dbUrl,
		databaseName: config.dbName,
		collection: 'sessions'
	})

	store.on('error', function (error) {
		console.log(error);
	})

	const app = express()

	const skillInterface = require('./alexa/skill.js')

	apps.forEach((appName) => {
		const appPath = path.join(appsPath, appName, 'skill.js')
		if (fs.existsSync(appPath)) {
			console.log(`add skill IntentHandler for app ${appName}`.blue)

			require(appPath)({
				skillInterface,
				ssml,
				db: dbUtil.collection('app.' + appName),
				buildDbId: dbUtil.buildDbId,
				util,
				config,
				app
			})
		}

	})


	const adapter = new ExpressAdapter(skillInterface.start(), true, true)


	app.post('/alexa', adapter.getRequestHandlers())


	app.use(helmet({
		frameguard: {
			action: 'sameorigin'
		}
	}))

	app.use(favicon(path.join(__dirname, 'favicon.ico')))


	app.use(session({
		secret: 'keyboard cat',
		store,
		resave: true,
		saveUninitialized: true,
		cookie: {
			maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
		}
	}))

	app.use(bodyParser.urlencoded({ extended: false }))
	app.use(bodyParser.json())
	app.use(fileUpload())

	app.set('view engine', 'ejs')
	app.set('views', path.join(__dirname, 'views'))


	// forbid acces to REST API when no user connected
	app.all('/api/*', function (req, res, next) {
		if (!req.session.connected) {
			res.sendStatus(401)
		}
		else {
			const referer = req.headers.referer
			if (referer != undefined) {
				const url = parseUrl(referer)
				// @ts-ignore
				req.appName = url.pathname.split('/').pop()
			}

			next()
		}
	})

	// forbid acces to webapp private REST API 
	app.all('/api/app/:appName/*', function (req, res, next) {

		// @ts-ignore
		if (req.params.appName != req.appName) {
			res.sendStatus(401)
		}
		else {
			next()
		}
	})


	require('./controllers/login')(app)
	require('./controllers/app')(app)
	require('./controllers/alexa')(app)

	apis.forEach((apiName) => {
		const apiPath = path.join(apisPath, apiName)

		apiName = apiName.replace('.js', '')
		console.log(`add API ${apiName}`)

		app.use(`/api/${apiName}`, require(apiPath))

	})



	//console.log('apps', apps)
	apps.forEach((appName) => {
		//console.log('check path', appName)
		const appPath = path.join(appsPath, appName, 'index.js')
		if (fs.existsSync(appPath)) {
			const ctx = {
				wss,
				config,
				db: dbUtil.collection('app.' + appName),
				util,
				buildDbId: dbUtil.buildDbId,
				events,
				websocket
			}
			console.log(`add API router for app ${appName}`.blue)

			const router = express.Router()
			require(appPath)(ctx, router)
			app.use(`/api/app/${appName}`, router)
		}

	})

	app.use('/brainjs', express.static(config.BRAINJS_HOME))
	app.use('/lib', express.static(path.join(__dirname, '../front/externals')))
	app.use(express.static(path.join(__dirname, '../front/dist')))


	if (config.USESSL) {
		const Greenlock = require('greenlock');
		const redir = require('redirect-https')();
		const https = require('https')

		var greenlock = Greenlock.create({
			agreeTos: true
			, email: config.email
			, approveDomains: [config.domain]
			, communityMember: false
			, version: 'draft-12'
			, server: 'https://acme-v02.api.letsencrypt.org/directory'
			, configDir: config.CERTIF_HOME
			, store: require('greenlock-store-fs')
		})


		http.createServer(greenlock.middleware(redir)).listen(config.httpPort)

		const server = https.createServer(greenlock.tlsOptions, app).listen(config.httpsPort)

		websocket.init(server, store)
	}
	else {
		const server = http.createServer(app).listen(config.httpPort)

		websocket.init(server, store)
	}

}
