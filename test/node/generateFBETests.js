
require('../../src/foam');
require('../helpers/Exemplar');
require('../helpers/JasmineOutput');

require('../examples/FOAMByExample');
require('../examples/DAOByExample');

// Generate Jasmine tests
var fs = require('fs');

var o = test.helpers.JasmineOutput
  .create({ filename: 'FoamByExample.js' }, global.FBEreg);

var output = '// Generated by test/node/generateFBETests.js\n';
output += o.outputSuite(global.FBE);

fs.writeFileSync('../src/FOAMByExample_gen.js', output);
console.log('Wrote ' + global.FBE.length + ' examples');

