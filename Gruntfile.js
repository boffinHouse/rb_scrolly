(function() {
	'use strict';

	module.exports = function (grunt) {
		grunt.task.loadNpmTasks('grunt-auto-install');
		grunt.task.loadNpmTasks('grunt-scssglobbing');
		grunt.task.loadNpmTasks('grunt-sass');
		grunt.task.loadNpmTasks('grunt-jsdoc');
		grunt.task.loadNpmTasks('grunt-contrib-clean');
		grunt.task.loadNpmTasks('grunt-autoprefixer');
		grunt.task.loadNpmTasks('grunt-contrib-watch');
		grunt.task.loadNpmTasks('grunt-contrib-jshint');
		grunt.task.loadNpmTasks('assemble');

		grunt.initConfig({
			auto_install: {
				subdir: {
					options: {
						bower: 'false'
					}
				}
			},
			sass: {
				options: {
					outputStyle: 'nested',
					sourceMap: false
				},
				dist: {
					files: [
						{
							'dist/css/styles.css': 'component-helpers/sass/tmp_styles.scss',
						}
					]
				}
			},
			clean: {
				options: {
					force: true
				},
				dist: {
					files: [
						{
							src: ['dist']
						}
					]
				},
				tmp: {
					files: [
						{
							src: ['tmp']
						}
					]
				},
				scssglobbing: {
					files: [
						{
							src: ['component-helpers/sass/tmp_styles.scss']
						}
					]
				}
			},
			autoprefixer: {
				options: {
					browsers: ['last 2 versions']
				},
				dev: {
					options: {
						map: true
					},
					src: 'dist/css/*.css'
				}
			},
			jshint: {
				options: {
					jshintrc: true
				},
				js: {
					files: {
						src: ['sources/components/**/*.js', 'tests/**/*.js']
					}
				}
			},
			jsdoc: {
				dist : {
					src: ['sources/components/**/*.js'],
					options: {
						destination: 'doc',
						template : 'node_modules/ink-docstrap/template',
						configure : 'node_modules/ink-docstrap/template/jsdoc.conf.json',
					}
				}
			},
			watch: {
				scss: {
					files: [
						'sources/**/*.scss',
						'component-helpers/sass/**/*.scss',
						'!component-helpers/sass/tmp_styles.scss',
					],
					tasks: ['build']
				},
				assemble: {
					files: ['sources/components/**/*.{hbs,json}', 'component-helpers/assemble/**/*.hbs'],
					tasks: ['assemble']
				},
				jshint: {
					files: ['sources/components/**/*.js', 'tests/**/*.js'],
					tasks: ['jshint']
				},
			},
			assemble: {
				options: {
					data: 'sources/components/**/*.{json,yml}',
					helpers: ['component-helpers/assemble/helper/*.js'],
					layoutdir: 'component-helpers/assemble/layouts/',
					partials: ['sources/components/**/*.hbs']
				},
				dev: {
					options: {
						production: false
					},
					files: [
						{
							dest: 'dist',
							expand: true,
							flatten: true,
							src: [
								'component-helpers/assemble/pages/**/*.hbs'
							]
						}
					]
				}
			},
			scssglobbing: {
				main: {
					files: {
						src:"component-helpers/sass/__styles.scss"
					}
				}
			}
		});

		grunt.registerTask( 'css', ['scssglobbing', 'sass', 'autoprefixer', 'clean:scssglobbing']);
		grunt.registerTask('build', [ 'auto_install', 'clean:dist', 'css', 'assemble']);
		grunt.registerTask('default', ['jshint', 'build', 'watch']);
	};
})();
