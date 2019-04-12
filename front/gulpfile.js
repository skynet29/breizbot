var gulp = require('gulp')
var path = require('path')

var concat = require('gulp-concat')
var sourcemaps = require('gulp-sourcemaps')
var injectHTML = require('gulp-inject-stringified-html')
var sass = require('gulp-sass')

sass.compiler = require('node-sass')


var dest = './dist'


gulp.task('breizbot.js', function() {
	return gulp.src([
		'./externals/eventemitter2.js',
		'./src/controls/**/*.js',
		'./src/services/**/*.js',
		])
		.pipe(injectHTML())
		.pipe(sourcemaps.init())
		.pipe(concat('breizbot.js'))
		.pipe(sourcemaps.write())
		.pipe(gulp.dest(dest))
})

gulp.task('breizbot.css', function() {
	return gulp.src([
		'./src/controls/**/*.scss',
		])
		.pipe(sass().on('error', sass.logError))	
		.pipe(concat('breizbot.css'))
		.pipe(gulp.dest(dest))
})

gulp.task('assets', function() {
	return gulp.src([
		'./src/assets/*',
		])
		.pipe(gulp.dest(path.join(dest, 'assets')))
})

gulp.task('all', ['breizbot.js', 'breizbot.css', 'assets'])


gulp.task('watch', ['all'], function() {
	gulp.watch(['./src/controls/**/*.js', './src/controls/**/*.html', './src/services/**/*.js'], ['breizbot.js'])
	gulp.watch(['./src/controls/**/*.scss'], ['breizbot.css'])
	gulp.watch(['./assets/*'], ['assets'])

})