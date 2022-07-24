var gulp = require('gulp')

const task = require('./task')('./dist')

const beatDetectorJs = task('beatDetectorJs.worker.js', 
[
	'./src/workers/beatdetector.js',
], 
{concat: 'beatdetector.js', dest: 'workers', isCode:true}
)

const breizbotJs = task('breizbot.js',
	[
		'./externals/eventemitter2.js',
		'./externals/notify.min.js',
		'./src/controls/**/*.js',
		'./src/services/**/*.js',
	],
	{isCode: true, concat: 'breizbot.js'}

)

const breizbotCss = task('breizbot.css',
	[
		'./src/controls/**/*.scss',
	],
	{concat: 'breizbot.css', isSass:true}
)

const assets = task('assets',
	[
		'./src/assets/*',
	],
	{dest: 'assets'}
)


const all = gulp.series(breizbotJs, breizbotCss, assets, beatDetectorJs)

exports.default = all


exports.watch = gulp.series(all, function() {
	gulp.watch(['./src/workers/beatdetector.js'], beatDetectorJs)
	gulp.watch(['./src/controls/**/*.js', './src/controls/**/*.html', './src/services/**/*.js'], breizbotJs)
	gulp.watch(['./src/controls/**/*.scss'], breizbotCss)
	gulp.watch(['./src/assets/*'], assets)
	
})