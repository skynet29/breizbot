const BRAINJS_HOME = process.env.BRAINJS_HOME
if (BRAINJS_HOME == undefined) {
	console.log('Missing BRAINJS_HOME env var !')
	process.exit(1)
}
const ADMIN_USER = process.env.BREIZBOT_ADMIN_USER
if (ADMIN_USER == undefined) {
	console.log('Missing ADMIN_USER env var !')
	process.exit(1)
}
const ADMIN_PWD = process.env.BREIZBOT_ADMIN_PWD
if (ADMIN_PWD == undefined) {
	console.log('Missing ADMIN_PWD env var !')
	process.exit(1)
}

const CLOUD_HOME = process.env.BREIZBOT_CLOUD_HOME
if (CLOUD_HOME == undefined) {
	console.log('Missing CLOUD_HOME env var !')
	process.exit(1)
}

let USEALEXA = process.env.BREIZBOT_USEALEXA
if (USEALEXA == undefined) {
	console.log('Missing USEALEXA env var !')
	process.exit(1)
}
USEALEXA = (USEALEXA === 'true')


let USESSL = process.env.BREIZBOT_USESSL
if (USESSL == undefined) {
	console.log('Missing USESSL env var !')
	process.exit(1)
}
USESSL = (USESSL === 'true')

const CERTIF_HOME = process.env.BREIZBOT_CERTIF_HOME
if (USESSL == true && CERTIF_HOME == undefined) {
	console.log('Missing CERTIF_HOME env var !')
	process.exit(1)
}

const httpPort = process.env.HTTP_PORT
if (httpPort == undefined) {
	console.log('Missing HTTP_PORT env var !')
	process.exit(1)
}

const httpsPort = process.env.HTTPS_PORT
if (httpsPort == undefined) {
	console.log('Missing HTTPS_PORT env var !')
	process.exit(1)
}

const domain = process.env.DOMAIN
if (domain == undefined) {
	console.log('Missing DOMAIN env var !')
	process.exit(1)
}

const scriptPath = process.env.SCRIPT_PATH
if (scriptPath == undefined) {
	console.log('Missing SCRIPT_PATH env var !')
	process.exit(1)
}



module.exports = {
	CERTIF_HOME,
	USESSL,
	USEALEXA,
	BRAINJS_HOME,
	ADMIN_USER,
	ADMIN_PWD,
	CLOUD_HOME,
	httpPort,
	httpsPort,
	domain,
	email: 'marc.delomez@free.com',
	dbUrl: 'mongodb://localhost:27017',
	dbName: 'breizbot',
	scriptPath
}
