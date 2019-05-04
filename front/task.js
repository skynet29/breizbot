var gulp = require('gulp')
var path = require('path')

var concat = require('gulp-concat')
var sourcemaps = require('gulp-sourcemaps')
var injectHTML = require('gulp-inject-stringified-html')
var sass = require('gulp-sass')
var uglify = require('gulp-uglify-es').default
var rename = require("gulp-rename")

sass.compiler = require('node-sass')


function source(dest, srcs, options) {
	options = options || {}

	let stream = gulp.src(srcs)

	if (options.isCode === true) {
		stream = stream.pipe(injectHTML())
	}

	if (options.isSass === true) {
		stream = stream.pipe(sass().on('error', sass.logError))
	}	


	if (typeof options.concat == 'string') {
		stream = stream.pipe(sourcemaps.init())
		stream = stream.pipe(concat(options.concat))
		stream = stream.pipe(sourcemaps.write())
	}

	// if (options.isCode === true) {
	// 	stream = stream.pipe(uglify())
	// }


	if (options.dest != undefined) {
		stream = stream.pipe(gulp.dest(path.join(dest, options.dest)))
	}
	else {
		stream = stream.pipe(gulp.dest(dest))
	}

	return stream
}


module.exports = function(dest) {
	return function task(taskName, srcs, options) {
		gulp.task(taskName, function() {
			return source(dest, srcs, options)
		})
	}
}