// OpenAPI 3.0 nullable is not JSON Schema draft-07; normalize before AJV validation.
const Ajv = require('ajv');
const spec = require('../../docs/api/openapi.json');
function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize);
  if (!value || typeof value !== 'object') return value;
  const { nullable, ...rest } = value;
  if (rest.exclusiveMinimum === true) { rest.exclusiveMinimum = rest.minimum; delete rest.minimum; }
  else if (rest.exclusiveMinimum === false) delete rest.exclusiveMinimum;
  if (rest.exclusiveMaximum === true) { rest.exclusiveMaximum = rest.maximum; delete rest.maximum; }
  else if (rest.exclusiveMaximum === false) delete rest.exclusiveMaximum;
  const result = Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, normalize(v)]));
  return nullable ? { anyOf: [result, { type: 'null' }] } : result;
}
const ajv = new Ajv({ allErrors: true, strict: false });
require('ajv-formats')(ajv);
ajv.addFormat('binary', true);
const components = normalize(spec.components);
function validate(schema, value, label) {
  const check = ajv.compile({ ...normalize(schema), components });
  if (!check(value)) throw new Error(`${label}: ${ajv.errorsText(check.errors)}`);
}
function validateResponse(method, route, status, body) {
  const operation = spec.paths[route]?.[method.toLowerCase()];
  if (!operation) throw new Error(`Undocumented operation ${method} ${route}`);
  const schema = operation.responses[status]?.content?.['application/json']?.schema;
  if (!schema) throw new Error(`Undocumented status ${method} ${route}: ${status}`);
  validate(schema, body, `${method} ${route} ${status}`);
}
module.exports = { validate, validateResponse, spec };
