var gulp = require('gulp')

const task = require('./task')('./dist')


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

const docJs = task('doc.js',
	[
		'./doc/*.js',
	],
	{isCode: true, concat: 'doc.js'}

)

const docHtml = task('doc.html',
	[
		'./doc/index.html',
	]
)


//gulp.task('doc', gulp.series(docJs, docHtml))
const doc = gulp.series(docJs, docHtml)


const all = gulp.series(breizbotJs, breizbotCss, assets, doc)

exports.default = all


exports.watch = gulp.series(all, function() {
	gulp.watch(['./src/controls/**/*.js', './src/controls/**/*.html', './src/services/**/*.js'], breizbotJs)
	gulp.watch(['./src/controls/**/*.scss'], breizbotCss)
	gulp.watch(['./assets/*'], assets)
	gulp.watch(['./doc/*.html', './doc/*.js'], doc)
	

})