
const gulp = require('gulp')
const replace = require('gulp-replace')
const rename = require("gulp-rename")
const task = require('../../../task')(__dirname.replace('src', 'dist'))

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

const appJs = task('app.js',
	[
		'./src/**/*.js'
	],
	{isCode: true, concat: 'app.js'}

)

const appCss = task('app.css',
	[
		'./src/**/*.scss',
	],
	{concat: 'app.css', isSass:true}
)

const assets = task('assets',
	[
		'./assets/**/*',
	],
	{dest: 'assets'}
)

function replaceTemplateJS() {
	const ctrlName = arg.name
	return gulp.src(['../template/src/main.js'])
		.pipe(replace('rootPage', ctrlName))
		.pipe(replace('main.html', ctrlName + '.html'))
		.pipe(rename(ctrlName + '.js'))
		.pipe(gulp.dest('src'))
}

function replaceTemplateSCSS() {
	const ctrlName = arg.name
	return gulp.src(['../template/src/main.scss'])
		.pipe(replace('rootPage', ctrlName))
		.pipe(rename(ctrlName + '.scss'))
		.pipe(gulp.dest('src'))
}

function replaceTemplateHTML() {
	const ctrlName = arg.name
	return gulp.src(['../template/src/main.html'])
		.pipe(rename(ctrlName + '.html'))
		.pipe(gulp.dest('src'))
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

const app = gulp.series(appJs, appCss, assets)
exports.default = app

exports.addCtrl = gulp.series(replaceTemplateJS, replaceTemplateSCSS, replaceTemplateHTML)

exports.addFormCtrl = gulp.series(replaceFormTemplateJS, replaceFormTemplateSCSS, replaceFormTemplateHTML)

exports.watch = gulp.series(app, function() {
	gulp.watch(['./src/**/*.js', './src/**/*.html'], appJs)
	gulp.watch(['./src/**/*.scss'], appCss)
	gulp.watch(['./assets/*'], assets)

})
