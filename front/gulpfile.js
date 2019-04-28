var gulp = require('gulp')

const task = require('./task')('./dist')


task('breizbot.js', 
	[
		'./externals/eventemitter2.js',
		'./src/controls/**/*.js',
		'./src/services/**/*.js',
	],
	{isCode: true, concat: 'breizbot.js'}

)

task('breizbot.css',
	[
		'./src/controls/**/*.scss',
	],
	{concat: 'breizbot.css', isSass:true}
)

task('assets',
	[
		'./src/assets/*',
	],
	{dest: 'assets'}
)

task('doc.js', 
	[
		'./doc/*.js',
	],
	{isCode: true, concat: 'doc.js'}

)

task('doc.html', 
	[
		'./doc/index.html',
	]
)


gulp.task('doc', ['doc.js', 'doc.html'])


gulp.task('all', ['breizbot.js', 'breizbot.css', 'assets', 'doc'])


gulp.task('watch', ['all'], function() {
	gulp.watch(['./src/controls/**/*.js', './src/controls/**/*.html', './src/services/**/*.js'], ['breizbot.js'])
	gulp.watch(['./src/controls/**/*.scss'], ['breizbot.css'])
	gulp.watch(['./assets/*'], ['assets'])
	gulp.watch(['./doc/*.html', './doc/*.js'], ['doc'])
	

})