module.exports = function(grunt) {
  grunt.initConfig({
    connect: {
      server: {
        options: {
          port: 8000,
          base: 'build'
        }
      }
    },

    requirejs: {
      minified: {
        options: {
          baseUrl: './src',

          name: 'vendor/almond',
          include: [ 'dungeon_generator' ],
          out: 'build/dungeon-generator.min.js',

          optimize: 'uglify2',
          inlineText: true,

          paths: {
          },

          shim: {
          },

          wrap: {
            startFile: 'src/start.frag',
            endFile: 'src/end.frag'
          }
        }
      },
      development: {
        options: {
          baseUrl: './src',

          name: 'vendor/almond',
          include: [ 'dungeon_generator' ],
          out: 'build/dungeon_generator.js',

          optimize: 'none',
          inlineText: true,

          paths: {
          },

          shim: {
          },

          wrap: {
            startFile: 'src/start.frag',
            endFile: 'src/end.frag'
          }
        }
      }
    },

    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },
      source: [ 'src/**/*.js', '!src/vendor/**/*.js' ]
    },

    regarde: {
      build: {
        files: [ 'src/**/*.js' ],
        tasks: [ 'default' ]
      },
      reload: {
        files: [ 'build/**' ],
        tasks: [ 'livereload' ]
      }
    }
  });

  grunt.loadNpmTasks('grunt-regarde');
  grunt.loadNpmTasks('grunt-contrib-livereload');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-requirejs');
  grunt.loadNpmTasks('grunt-contrib-connect');

  grunt.registerTask('default', [ 'jshint', 'requirejs' ]);
  grunt.registerTask('watch',  [ 'default', 'livereload-start', 'regarde' ]);
  grunt.registerTask('server', [ 'default', 'livereload-start', 'connect', 'regarde' ]);
};
