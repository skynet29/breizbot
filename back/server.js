const config = require('./lib/config')
console.log('config', config)

const db = require('./lib/db')

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


const app = express()

app.use(session({
	secret: 'keyboard cat',
	//store,
	resave: true,
	saveUninitialized: true,
	cookie: {maxAge: null}
})) // maxAge infini :)

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())
app.use(fileUpload())

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))	

require('./controllers/login')(app)
require('./controllers/app')(app)


app.use('/api/users', require('./api/users'))
app.use('/api/apps', require('./api/apps'))
app.use('/api/files', require('./api/files'))

app.use('/brainjs', express.static(config.BRAINJS_HOME))
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
}
else {
	app.listen(config.httpPort, function() {
		console.log('Server listening on port ' + config.httpPort)
	})	
}

}