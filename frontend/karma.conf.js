module.exports = function (config) {
  const fs = require('fs');
  const path = require('path');
  const profileRoot = path.join(__dirname, '.karma-chrome');
  if (!fs.existsSync(profileRoot)) {
    fs.mkdirSync(profileRoot, { recursive: true });
  }
  const userDataDir = fs.mkdtempSync(path.join(profileRoot, 'profile-'));

  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma')
    ],
    client: {
      jasmine: {
        random: false
      },
      clearContext: false
    },
    jasmineHtmlReporter: {
      suppressAll: true
    },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage/bar-inventory-frontend'),
      subdir: '.',
      reporters: [{ type: 'html' }, { type: 'text-summary' }]
    },
    reporters: ['progress', 'kjhtml'],
    customLaunchers: {
      ChromeHeadlessWorkspace: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox', '--disable-gpu', `--user-data-dir=${userDataDir}`]
      }
    },
    browsers: ['ChromeHeadlessWorkspace'],
    restartOnFileChange: false,
    singleRun: true
  });
};
