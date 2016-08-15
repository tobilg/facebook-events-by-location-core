"use strict";

var gulp = require("gulp");
var runSequence = require("run-sequence");
var istanbul = require("gulp-istanbul");
var mocha = require("gulp-mocha");
var chalk = require("chalk");
var rimraf = require("rimraf");

var chai = require("chai");
global.expect = chai.expect;

var paths = {
    libJsFiles: "./lib/*.js",
    testFiles: "./test/**/*.js",
    gulpfile: "./gulpfile.js"
};

gulp.task("dev", ["watch", "validate"]);

gulp.task("watch", function () {

    gulp.watch([
        paths.libJsFiles,
        paths.testFiles,
        paths.gulpfile
    ], [
        "validate"
    ]);

});

gulp.task("validate", function (done) {
    runSequence("test", done);
});

gulp.task("test", ["clean"], function (done) {

    var coverageVariable = "$$cov_" + new Date().getTime() + "$$";

    gulp.src(paths.libJsFiles)
        .pipe(istanbul({
            coverageVariable: coverageVariable
        }))
        .pipe(istanbul.hookRequire())
        .on("finish", function () {

            gulp.src(paths.testFiles)
                .pipe(mocha())
                .on("error", function (err) {
                    console.error(String(err));
                    console.error(chalk.bold.bgRed(" TESTS FAILED "));
                    done(new Error(" TESTS FAILED "));
                })
                .pipe(istanbul.writeReports({
                    reporters: ["lcov"],
                    coverageVariable: coverageVariable
                }))
                .on("end", done);

        });

});

gulp.task("test-without-coverage", function () {

    return gulp.src(paths.testFiles)
        .pipe(mocha())
        .on("error", function () {
            console.log(chalk.bold.bgRed(" TESTS FAILED "));
        });

});

gulp.task("clean", ["clean-coverage"]);

gulp.task("clean-coverage", function (done) {
    rimraf("./coverage", done);
});

gulp.task("ci", function (done) {
    runSequence("test-without-coverage", done);
});
