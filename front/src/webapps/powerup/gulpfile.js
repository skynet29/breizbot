
const gulp = require('gulp')
const {task, addCtrl, addFormCtrl, addBack} = require('../../../task')(__dirname)



const appJs = task('app.js',
	[
		'./src/**/*.js'
	],
	{isCode: true, concat: 'app.js'}

)


const workerJs = task('worker.js',
	[
		'./worker/**/*.js'
	],
	{isCode: true, concat: 'worker.js', dest: 'assets'}

)

const appCss = task('app.css',
	[
		'./src/**/*.scss',
	],
	{concat: 'app.css', isSass:true}
)

const assets = task('assets',
	[
		'./assets/**/*',
	],
	{dest: 'assets'}
)

const hubJs = task('hub.js', 
		'./lib/hub.js'
	,
	{browserify: true, concat: 'hub.js'}

)


const app = gulp.series(appJs, appCss, assets, workerJs, hubJs)
exports.default = app

exports.addCtrl = addCtrl

exports.addFormCtrl = addFormCtrl

exports.addBack = addBack

exports.watch = gulp.series(app, function() {
	gulp.watch(['./worker/**/*.js'], workerJs)
	gulp.watch(['./src/**/*.js', './src/**/*.html'], appJs)
	gulp.watch(['./src/**/*.scss'], appCss)
	gulp.watch(['./assets/*'], assets)
	gulp.watch(['./lib/*.js'], hubJs)


})
