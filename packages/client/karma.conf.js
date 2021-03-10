// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html

const fs = require('fs');
let shouldUseHeadlessChromium = fs.existsSync('/opt/chromium/chrome') === true;

if (shouldUseHeadlessChromium) {
  process.env.CHROMIUM_BIN = '/opt/chromium/chrome';
}

module.exports = function(config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      // Reporter for HTML (Displayed during test execution on local) (kjhtml)
      require('karma-jasmine-html-reporter'),
      // Reporter for JUnit XML (Dislayed on )
      require('karma-junit-reporter'),
      // Reporter for Coverage
      require('karma-sabarivka-reporter'),
      require('karma-coverage'),
      // Angular support
      require('@angular-devkit/build-angular/plugins/karma'),
    ],
    client: {
      jasmine: {
        // you can add configuration options for Jasmine here
        // the possible options are listed at https://jasmine.github.io/api/edge/Configuration.html
        // for example, you can disable the random execution with `random: false`
        // or set a specific seed with `seed: 4321`
      },
      clearContext: false, // leave Jasmine Spec Runner output visible in browser
    },
    jasmineHtmlReporter: {
      suppressAll: true, // removes the duplicated traces
    },
    coverageReporter: {
      dir: require('path').join(__dirname, './test-report/coverage'),
      subdir: '.',
      reporters: [{ type: 'lcov' }, { type: 'text-summary' }],
      include: ['src/**/*.ts', '!src/**/*.spec.ts', '!src/environments/**/*'],
    },
    customLaunchers: {
      ChromeHeadlessCI: {
        base: 'ChromiumHeadless',
        flags: ['--disable-setuid-sandbox', '--no-sandbox'],
      },
    },
    junitReporter: {
      outputDir: require('path').join(__dirname, './test-report/result'),
      suite: 'client-unit-test',
      useBrowserName: true,
    },
    reporters: ['progress', 'kjhtml', 'junit', 'sabarivka'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: shouldUseHeadlessChromium ? ['ChromeHeadlessCI'] : ['Chrome'],
    singleRun: false,
    restartOnFileChange: true,
  });
};
