
const gulp = require('gulp')
const { task } = require('../../task')(__dirname)


const lexicalJS = task('lexical',
	[],
	{
		webpack: {
			entry: {
				lexical: './src/lexical.js',
			},
			output: {
				filename: '[name].min.js',
			},
			mode: 'production'
		}
	}

)

exports.default = lexicalJS


exports.watch = gulp.series(lexicalJS, function () {

	gulp.watch(['./src/*'], lexicalJS)


})
