
var gulp = require('gulp')

const task = require('../../../task')(__dirname.replace('src', 'dist'))


const appJs = task(
	[
		'./src/**/*.js'
	],
	{isCode: true, concat: 'app.js'}

)

const appCss = task(
	[
		'./src/**/*.scss',
	],
	{concat: 'app.css', isSass:true}
)


exports.default = gulp.series(appJs, appCss)


exports.watch = function() {
	gulp.watch(['./src/**/*.js', './src/**/*.html'], appJs)
	gulp.watch(['./src/**/*.scss'], appCss)

}