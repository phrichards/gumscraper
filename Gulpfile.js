var gulp = require('gulp');
var concat = require('gulp-concat');
var sass = require('gulp-sass');

gulp.task('styles', function() {
    gulp.src('style/*.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(concat('style.css'))
        .pipe(gulp.dest('./'))
});

//Watch task
gulp.task('default',function() {
    gulp.watch('style/*.scss',['styles']);
});