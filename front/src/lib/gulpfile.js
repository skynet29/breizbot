
const gulp = require('gulp')
const {task} = require('../../task')(__dirname)


const lexicalJS = task('lexical',
	[],
	{webpackConfig: './webpack.config.js'}

)

exports.default = lexicalJS


exports.watch = gulp.series(lexicalJS, function() {

	gulp.watch(['./src/*'], lexicalJS)


})
