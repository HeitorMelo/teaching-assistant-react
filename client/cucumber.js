module.exports = {
  default: [
    'src/features/**/*.feature',
    '--require src/step-definitions/**/*.ts',
    '--require-module ts-node/register',
    '--format-options \'{"snippetInterface": "async-await"}\'',
    '--format progress-bar',
    '--format json:reports/cucumber_report.json',
    '--format html:reports/cucumber_report.html'
  ].join(' ')
};