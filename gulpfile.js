var gulp = require('gulp');
var concat = require('gulp-concat');
var less = require('gulp-less');
var gutil = require('gulp-util');
var webpack = require('webpack-stream');
var webpackConfig = require('./webpack.config.js');

var config = {
  src: 'app/public/src',
  dist: 'app/public/dist'
};

gulp.task('js', function() {
  return gulp.src('')
    .pipe(webpack(webpackConfig))
    .on('error', function(e) {
      gutil.log(gutil.colors.red(e));
      this.emit('end');
    })
    .pipe(gulp.dest(''));
});

gulp.task('css', function() {
  return gulp.src(config.src + '/css/app.less')
    .pipe(concat('app.css'))
    .pipe(less())
    .on('error', function(e) {
      gutil.log(gutil.colors.red(e));
      this.emit('end');
    })
    .pipe(gulp.dest(config.dist + '/css'));
});

gulp.task('watch', function() {
  gulp.watch(config.src + '/js/**', ['js']);
  gulp.watch(config.src + '/css/**', ['css']);
});

gulp.task('default', ['js', 'css'], function() {
});
