
var gulp = require('gulp')

const task = require('../../../task')(__dirname.replace('src', 'dist'))


const appJs = task('app.js', 
		'./src/main.js'
	,
	{browserify: true, concat: 'app.js'}

)

const appCss = task('app.css',
	[
		'./src/**/*.scss',
	],
	{concat: 'app.css', isSass:true}
)

const assets = task('assets',
	[
		'./assets/*',
	],
	{dest: 'assets'}
)


const app = gulp.series(appJs, appCss, assets)
exports.default = app


exports.watch = gulp.series(app, function() {
	gulp.watch(['./src/**/*.js', './src/**/*.html'], appJs)
	gulp.watch(['./src/**/*.scss'], appCss)
	gulp.watch(['./assets/*'], assets)

})

