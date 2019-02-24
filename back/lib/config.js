const BRAINJS_HOME = process.env.BRAINJS_HOME
if (BRAINJS_HOME == undefined) {
	console.log('Missing BRAINJS_HOME env var !')
	process.exit(1)
}
const ADMIN_USER = process.env.ADMIN_USER
if (ADMIN_USER == undefined) {
	console.log('Missing ADMIN_USER env var !')
	process.exit(1)
}
const ADMIN_PWD = process.env.ADMIN_PWD
if (ADMIN_PWD == undefined) {
	console.log('Missing ADMIN_PWD env var !')
	process.exit(1)
}

const CLOUD_HOME = process.env.CLOUD_HOME
if (CLOUD_HOME == undefined) {
	console.log('Missing CLOUD_HOME env var !')
	process.exit(1)
}

module.exports = {
	BRAINJS_HOME,
	ADMIN_USER,
	ADMIN_PWD,
	CLOUD_HOME
}