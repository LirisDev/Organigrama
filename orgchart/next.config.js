const withTM = require('next-transpile-modules')(['@balkangraph/orgchart.js']); // pass the modules you would like to see transpiled

module.exports = withTM();