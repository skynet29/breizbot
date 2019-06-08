const config = require('./lib/config')
console.log('config', config)

const db = require('./lib/db')
const wss = require('./lib/wss')


db.init().then(dbReady)
.catch((e) => {
	console.log('Error', e)
	process.exit(1)	
})


function dbReady() {

console.log('dbReady')

const express = require('express')
const session = require('express-session')
const bodyParser = require('body-parser')
const fileUpload = require('express-fileupload')
const path = require('path')

const MongoDBStore = require('connect-mongodb-session')(session);

const store = new MongoDBStore({
  uri: config.dbUrl,
  databaseName: config.dbName,
  collection: 'sessions'
})

store.on('error', function(error) {
  console.log(error);
})

const app = express()

app.use(session({
	secret: 'keyboard cat',
	store,
	resave: true,
	saveUninitialized: true,
	cookie: {
		maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
	}
}))

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())
app.use(fileUpload())

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))	

// forbid acces to REST API when no user connected
app.all('/api/*' , function(req, res, next) {
	if (!req.session.connected) {
		res.sendStatus('401')
	}
	else { 
		next()
	}
})

require('./controllers/login')(app)
require('./controllers/app')(app)


app.use('/api/users', require('./api/users'))
app.use('/api/apps', require('./api/apps'))
app.use('/api/files', require('./api/files'))
app.use('/api/rtc', require('./api/rtc'))
app.use('/api/debug', require('./api/debug'))
app.use('/api/mails', require('./api/mails'))
app.use('/api/media', require('./api/media'))
app.use('/api/ytdl', require('./api/ytdl'))
app.use('/api/appData', require('./api/appData'))
app.use('/api/cities', require('./api/cities'))

app.use('/brainjs', express.static(config.BRAINJS_HOME))
app.use('/lib', express.static(path.join(__dirname, '../front/externals')))
app.use(express.static(path.join(__dirname, '../front/dist')))

if (config.USESSL) {
	const Greenlock = require('greenlock');
	const redir = require('redirect-https')();
	const http = require('http')
	const https = require('https')	

	var greenlock = Greenlock.create({
	  agreeTos: true
	, email: config.email
	, approveDomains: [config.domain]
	, communityMember: false
	, version: 'draft-12'
	, server: 'https://acme-v02.api.letsencrypt.org/directory'
	, configDir: config.CERTIF_HOME
	})


	http.createServer(greenlock.middleware(redir)).listen(config.httpPort)
	 
	https.createServer(greenlock.tlsOptions, app).listen(config.httpsPort)	

	wss.init(greenlock.tlsOptions, store)
}
else {
	app.listen(config.httpPort, function() {
		console.log('Server listening on port ' + config.httpPort)
	})	

	wss.init({}, store)
}

}