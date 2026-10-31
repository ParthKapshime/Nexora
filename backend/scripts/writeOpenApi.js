const fs = require('node:fs');
const path = require('node:path');
const { spec } = require('../config/openapi');

const destination = path.join(__dirname, '..', 'openapi.json');
fs.writeFileSync(destination, `${JSON.stringify(spec, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
process.stdout.write('Wrote OpenAPI document to backend/openapi.json\n');
