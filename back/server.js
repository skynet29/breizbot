const config = require('./lib/config')
console.log('config', config)

const db = require('./lib/db')
const apps = require('./lib/apps')


db.init().then(dbReady)
.catch((e) => {
	console.log('Error', e)
	process.exit(1)	
})

function getBrainjsLib(libName, scripts, styles) {
	if (libName.includes('map')) {
		scripts.push('/brainjs/brainjs-map.js')
		styles.push('/brainjs/map/brainjs-map.css')

	}
	if (libName.includes('tree')) {
		scripts.push('/brainjs/brainjs-tree.js')
		styles.push('/brainjs/tree/brainjs-tree.css')

	}
}

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

app.get('/', function(req, res) {
	if (req.session.connected) {
		const {user, userInfo} = req.session

		if (user == config.ADMIN_USER) {
			res.render('admin', {})
		}
		else {
			res.render('home', {pseudo: userInfo.pseudo})
		}
	}
	else {
		res.render('login', {message: ''})
	}
})

app.post('/', function(req, res) {
	const {user, pwd} = req.body

	if (user == config.ADMIN_USER) {
		if (pwd == config.ADMIN_PWD) {
			req.session.connected = true
			req.session.user = user
			res.redirect('/')
		}
		else {
			res.render('login', {message: 'Bad password'})
		}
	}
	else {
		db.getUserInfo(user).then(function(data) {
			console.log('data', data)
			if (data == null) {
				res.render('login', {message: 'Unknown user'})
				return
			}
			if (data.pwd != pwd) {
				res.render('login', {message: 'Bad password'})
				return
			}
			req.session.connected = true
			req.session.user = user
			req.session.userInfo = data
			res.redirect('/')

		})
		
	}


})

app.get('/logout', function(req, res) {
	req.session.connected = false
	req.session.destroy()

	res.redirect('/')
})


app.get('/apps/:app', function(req, res) {
	console.log('requestedApp', req.params)
	if (req.session.connected) {
		const {app} = req.params
		const {userInfo} = req.session
		const appPath = path.join('/webapps/', app)


		if (app === 'store' || app in userInfo.apps) {
			apps.getAppInfo(app).then((appInfo) => {
				let styles = appInfo.styles || []
				styles = styles.map((fileName) => {
					return (fileName.startsWith('/')) ? fileName : path.join(appPath, fileName)
				})	
				let scripts = appInfo.scripts || []

				const brainjs = appInfo.brainjs || []
				getBrainjsLib(brainjs, scripts, styles)

				res.render('app', {
					appName: app,
					 title: appInfo.title,
					 pseudo: userInfo.pseudo,
					 styles,
					 scripts
				})			
			})

		}
		else {
			const message = `Connected user '${req.session.user}' is not allowed to access this app`
			res.render('error', {message})
		}					
	}
	else {
		res.redirect('/')
	}
})


app.use('/api/users', require('./api/users'))
app.use('/api/apps', require('./api/apps'))
app.use('/api/files', require('./api/files'))

app.use('/brainjs', express.static(config.BRAINJS_HOME))
app.use(express.static(path.join(__dirname, '../front/dist')))


app.listen(8080, function() {
	console.log('Server listening on port 8080')
})

}