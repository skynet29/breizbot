var gulp = require('gulp')
var path = require('path')

var concat = require('gulp-concat')
var sourcemaps = require('gulp-sourcemaps')
var injectHTML = require('gulp-inject-stringified-html')
var sass = require('gulp-sass')

sass.compiler = require('node-sass')


const dest = __dirname.replace('src', 'dist')


gulp.task('app.js', function() {
	return gulp.src([
		'./src/**/*.js'
		])
		.pipe(injectHTML())
		.pipe(sourcemaps.init())
		.pipe(concat('app.js'))
		.pipe(sourcemaps.write())
		.pipe(gulp.dest(dest))
})

gulp.task('app.css', function() {
	return gulp.src([
		'./src/**/*.scss',
		])
		.pipe(sass().on('error', sass.logError))	
		.pipe(concat('app.css'))
		.pipe(gulp.dest(dest))
})



gulp.task('all', ['app.js', 'app.css'])


gulp.task('watch', ['all'], function() {
	gulp.watch(['./src/**/*.js', './src/**/*.html'], ['app.js'])
	gulp.watch(['./src/**/*.scss'], ['app.css'])
})