var gulp = require('gulp')
var path = require('path')

var concat = require('gulp-concat')
var sourcemaps = require('gulp-sourcemaps')
var injectHTML = require('gulp-inject-stringified-html')
var sass = require('gulp-sass')
var uglify = require('gulp-uglify-es').default
var rename = require("gulp-rename")
const eslint = require('gulp-eslint')
const replace = require('gulp-replace')
const browserify = require('browserify');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');

sass.compiler = require('node-sass')

const isDev = process.env.NODE_ENV != 'production'
console.log('isDev', isDev)

console.log('agrs', process.argv)

const arg = (argList => {

	let arg = {}, a, opt, thisOpt, curOpt;
	for (a = 0; a < argList.length; a++) {

		thisOpt = argList[a].trim();
		opt = thisOpt.replace(/^\-+/, '');

		if (opt === thisOpt) {

			// argument value
			if (curOpt) arg[curOpt] = opt;
			curOpt = null;

		}
		else {

			// argument name
			curOpt = opt;
			arg[curOpt] = true;

		}

	}

	return arg;

})(process.argv);


function compute(dest, srcs, options) {

	options = options || {}
	let stream

	if (options.browserify === true) {
		const b = browserify({
			entries: srcs,
			debug: true
		})

		stream = b.bundle()
			.pipe(source(options.concat))
			.pipe(buffer())
			.pipe(sourcemaps.init({loadMaps: true}))

		if (!isDev) {
			stream = stream.pipe(uglify())
		}

		stream = stream.pipe(sourcemaps.write('./'))
	}
	else {
		stream = gulp.src(srcs)


		if (options.isCode === true) {
			stream = stream.pipe(injectHTML())
			stream = stream.pipe(eslint({
				useEslintrc: false,
				parserOptions: {
					ecmaVersion: 8
				}

			}))
			stream = stream.pipe(eslint.format())

		}


		if (options.isSass === true) {
			stream = stream.pipe(sass().on('error', sass.logError))
		}


		if (typeof options.concat == 'string') {
			if (isDev) { stream = stream.pipe(sourcemaps.init()) }
			stream = stream.pipe(concat(options.concat))
			if (isDev) { stream = stream.pipe(sourcemaps.write()) }
		}

		if (options.isCode === true && !isDev) {
			stream = stream.pipe(uglify())
		}

	}
	if (options.dest != undefined) {
		stream = stream.pipe(gulp.dest(path.join(dest, options.dest)))
	}
	else {
		stream = stream.pipe(gulp.dest(dest))
	}

	return stream
}


module.exports = function (modulePath) {

	console.log('modulePath', modulePath)

	const dest = modulePath.replace('src', 'dist')

	function replaceTemplateJS() {
		const ctrlName = arg.name
		return gulp.src(['../template/src/main.js'])
			.pipe(replace('rootPage', ctrlName))
			.pipe(replace('main.html', ctrlName + '.html'))
			.pipe(rename(ctrlName + '.js'))
			.pipe(gulp.dest('src/controls/' + ctrlName))
	}

	function replaceTemplateSCSS() {
		const ctrlName = arg.name
		return gulp.src(['../template/src/main.scss'])
			.pipe(replace('rootPage', ctrlName))
			.pipe(rename(ctrlName + '.scss'))
			.pipe(gulp.dest('src/controls/' + ctrlName))
	}

	function replaceTemplateHTML() {
		const ctrlName = arg.name
		return gulp.src(['../template/src/main.html'])
			.pipe(rename(ctrlName + '.html'))
			.pipe(gulp.dest('src/controls/' + ctrlName))
	}


	function replaceFormTemplateJS() {
		const ctrlName = arg.name
		return gulp.src(['../../templates/form.js'])
			.pipe(replace('form', ctrlName))
			.pipe(replace('main.html', ctrlName + '.html'))
			.pipe(rename(ctrlName + '.js'))
			.pipe(gulp.dest('src'))
	}

	function replaceFormTemplateSCSS() {
		const ctrlName = arg.name
		return gulp.src(['../../templates/form.scss'])
			.pipe(replace('formCtrl', ctrlName))
			.pipe(rename(ctrlName + '.scss'))
			.pipe(gulp.dest('src'))
	}

	function replaceFormTemplateHTML() {
		const ctrlName = arg.name
		return gulp.src(['../../templates/form.html'])
			.pipe(rename(ctrlName + '.html'))
			.pipe(gulp.dest('src'))
	}

	function copyIndexJS() {
		return gulp.src(['../../templates/index.js'])
			.pipe(gulp.dest('.'))
	}


	const addCtrl = gulp.series(replaceTemplateJS, replaceTemplateSCSS, replaceTemplateHTML)

	const addFormCtrl = gulp.series(replaceFormTemplateJS, replaceFormTemplateSCSS, replaceFormTemplateHTML)

	const addBack = copyIndexJS

	function task(taskName, srcs, options) {
		return function () {
			console.log('task', taskName)
			return compute(dest, srcs, options)

		}
	}
	return {
		task,
		addCtrl,
		addFormCtrl,
		addBack

	}
}