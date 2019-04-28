
var gulp = require('gulp')

const task = require('../../../task')(__dirname.replace('src', 'dist'))


task('app.js', 
	[
		'./src/**/*.js'
	],
	{isCode: true, concat: 'app.js'}

)

task('app.css',
	[
		'./src/**/*.scss',
	],
	{concat: 'app.css', isSass:true}
)


gulp.task('all', ['app.js', 'app.css'])


gulp.task('watch', ['all'], function() {
	gulp.watch(['./src/**/*.js', './src/**/*.html'], ['app.js'])
	gulp.watch(['./src/**/*.scss'], ['app.css'])

})