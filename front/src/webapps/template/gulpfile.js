
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

task('assets',
	[
		'./assets/*',
	],
	{dest: 'assets'}
)


gulp.task('all', ['app.js', 'app.css', 'assets'])


gulp.task('watch', ['all'], function() {
	gulp.watch(['./src/**/*.js', './src/**/*.html'], ['app.js'])
	gulp.watch(['./src/**/*.scss'], ['app.css'])
	gulp.watch(['./assets/*'], ['assets'])

})