// Load plugins
var gulp = require('gulp'),
    mainBowerFiles = require('main-bower-files');
    sass = require('gulp-sass'),
    autoprefixer = require('gulp-autoprefixer'),
    eslint = require('gulp-eslint'),
    rename = require('gulp-rename'),
    concat = require('gulp-concat'),
    jasmine = require('gulp-jasmine'),
    connect = require('gulp-connect'),
    livereload = require('gulp-livereload'),
    del = require('del'),
    deploy = require('gulp-gh-pages'),
    babel = require('gulp-babel');

gulp.task('fileinclude', function() {
  return  gulp.src(['src/index.html', 'src/iframe.html', 'src/CNAME'])
    .pipe(gulp.dest('dist'));
});

gulp.task('templates', function() {
  return gulp.src('src/app/templates/**/*.html')
    .pipe(gulp.dest('dist/app/templates'));
});

// Styles
gulp.task('styles', function() {
  return gulp.src('src/styles/**/*.scss')
    .pipe(sass({includePaths: require('node-neat').includePaths}).on('error', sass.logError))
    .pipe(autoprefixer('last 2 version'))
    .pipe(rename({ suffix: '.min' }))
    .pipe(gulp.dest('dist/styles'));
});

// Scripts
gulp.task('scripts', function() {
  return gulp.src('src/app/**/*.js')
    .pipe(eslint('./.eslintrc'))
    .pipe(eslint.format())
    .pipe(babel())
    .pipe(gulp.dest('dist/app'));
});

// Cities Config
gulp.task('cities_config', function() {
  return gulp.src('src/cities/*.json')
    .pipe(eslint('./.eslintrc'))
    .pipe(eslint.format())
    .pipe(gulp.dest('dist/cities'));
});

// Images
gulp.task('images', function() {
  return gulp.src('src/images/**/*')
    .pipe(gulp.dest('dist/images'));
});

gulp.task('copy-bower', function() {
  return gulp.src(mainBowerFiles())
    .pipe(gulp.dest('dist/app/lib'));
});

// Clean
gulp.task('clean', function(cb) {
    del(['dist/assets/css', 'dist/assets/js', 'dist/assets/img'], cb)
});

gulp.task('copy-lib', function() {
  return gulp.src('src/lib/**/*')
    .pipe(gulp.dest('dist/lib'));
});

// Default task
gulp.task('default', gulp.parallel('clean', function() {
  gulp.series('fileinclude', 'styles', 'scripts', 'images', 'templates', 'cities_config', 'copy-lib');
}));

gulp.task('connect', function() {
  connect.server({
    root: 'dist',
    port: process.env.PORT || 8080,
    livereload: false
  });
});

gulp.task("heroku:production", function(){
  gulp.series('connect')
});

// Watch
gulp.task('watch', function() {
  gulp.task('default')();
  // Create LiveReload server
  livereload.listen({start:true});

  // Watch .html files
  gulp.watch('src/**/*.html', gulp.series('fileinclude', 'templates'));
  gulp.watch('src/app/templates/**/*.html', gulp.series('templates'));

  // Watch .scss files
  gulp.watch(['src/styles/**/*.scss', 'src/lib/**/*.css'], gulp.series('styles'));

  // Watch .js files
  gulp.watch('src/app/**/*.js', gulp.series('scripts'));

  // Watch image files
  gulp.watch('src/images/**/*', gulp.series('images'));

  gulp.watch('src/cities/*.json', gulp.series('cities_config'));

  // Watch any files in dist/, reload on change
  gulp.watch(['dist/**']).on('change', livereload.changed);

});

gulp.task('deploy', function () {
  return gulp.src("./dist/**/*")
    .pipe(deploy())
});

gulp.task('test', function () {
  return gulp.src('spec/**/*_spec.js')
             .pipe(jasmine());
});
