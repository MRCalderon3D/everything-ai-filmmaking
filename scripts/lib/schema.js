'use strict';
/**
 * Minimal JSON Schema (draft 2020-12 subset) validator.
 *
 * Supported keywords: type (incl. "integer", arrays of types), properties,
 * patternProperties, required, additionalProperties (boolean or schema),
 * items (single schema), enum, const, pattern, minimum, maximum,
 * exclusiveMinimum, exclusiveMaximum, minLength, maxLength, minItems,
 * maxItems, oneOf, anyOf, allOf, $ref (same-document only: "#",
 * "#/$defs/x", "#/definitions/x", any "#/..." pointer), $defs/definitions
 * containers. "format" is accepted and ignored (passthrough). Unknown
 * keywords are ignored, per JSON Schema semantics.
 *
 * NOT supported: remote/external $ref, $dynamicRef/$anchor, not,
 * if/then/else, dependentSchemas, uniqueItems, prefixItems, contains,
 * multipleOf.
 */

function typeOf(data) {
  if (data === null) return 'null';
  if (Array.isArray(data)) return 'array';
  return typeof data; // 'object', 'string', 'number', 'boolean'
}

function matchesType(data, type) {
  if (type === 'integer') return typeof data === 'number' && Number.isInteger(data);
  if (type === 'number') return typeof data === 'number';
  return typeOf(data) === type;
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeOf(a) !== typeOf(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  if (typeOf(a) === 'object') {
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    return ka.every((k) => deepEqual(a[k], b[k]));
  }
  return false;
}

function resolveRef(ref, rootSchema) {
  if (ref === '#') return rootSchema;
  if (!ref.startsWith('#/')) {
    throw new Error(`unsupported $ref "${ref}" (only same-document refs are supported)`);
  }
  const parts = ref.slice(2).split('/').map((p) => p.replace(/~1/g, '/').replace(/~0/g, '~'));
  let node = rootSchema;
  for (const part of parts) {
    if (node === undefined || node === null) break;
    node = node[part];
  }
  if (node === undefined) throw new Error(`unresolvable $ref "${ref}"`);
  return node;
}

function validateNode(schema, data, rootSchema, path, errors, depth) {
  if (depth > 64) {
    errors.push({ path, message: 'schema recursion too deep' });
    return;
  }
  if (schema === true || schema === undefined || schema === null) return;
  if (schema === false) {
    errors.push({ path, message: 'schema "false" allows nothing' });
    return;
  }
  if (typeof schema !== 'object') {
    errors.push({ path, message: `invalid schema node of type ${typeof schema}` });
    return;
  }

  if (schema.$ref) {
    let target;
    try {
      target = resolveRef(schema.$ref, rootSchema);
    } catch (err) {
      errors.push({ path, message: err.message });
      return;
    }
    validateNode(target, data, rootSchema, path, errors, depth + 1);
    // Draft 2020-12: sibling keywords next to $ref still apply; fall through.
  }

  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((t) => matchesType(data, t))) {
      errors.push({ path, message: `expected type ${types.join('|')}, got ${typeOf(data)}` });
      return; // structural mismatch: further checks would be noise
    }
  }

  if (schema.enum !== undefined) {
    if (!schema.enum.some((v) => deepEqual(v, data))) {
      errors.push({ path, message: `value ${JSON.stringify(data)} not in enum [${schema.enum.map((v) => JSON.stringify(v)).join(', ')}]` });
    }
  }
  if (schema.const !== undefined && !deepEqual(schema.const, data)) {
    errors.push({ path, message: `value must equal const ${JSON.stringify(schema.const)}` });
  }

  if (typeof data === 'string') {
    if (schema.pattern !== undefined && !(new RegExp(schema.pattern).test(data))) {
      errors.push({ path, message: `"${data}" does not match pattern ${schema.pattern}` });
    }
    if (schema.minLength !== undefined && data.length < schema.minLength) {
      errors.push({ path, message: `string shorter than minLength ${schema.minLength}` });
    }
    if (schema.maxLength !== undefined && data.length > schema.maxLength) {
      errors.push({ path, message: `string longer than maxLength ${schema.maxLength}` });
    }
    // schema.format: passthrough (accepted, not enforced)
  }

  if (typeof data === 'number') {
    if (schema.minimum !== undefined && data < schema.minimum) {
      errors.push({ path, message: `${data} < minimum ${schema.minimum}` });
    }
    if (schema.maximum !== undefined && data > schema.maximum) {
      errors.push({ path, message: `${data} > maximum ${schema.maximum}` });
    }
    if (schema.exclusiveMinimum !== undefined && data <= schema.exclusiveMinimum) {
      errors.push({ path, message: `${data} <= exclusiveMinimum ${schema.exclusiveMinimum}` });
    }
    if (schema.exclusiveMaximum !== undefined && data >= schema.exclusiveMaximum) {
      errors.push({ path, message: `${data} >= exclusiveMaximum ${schema.exclusiveMaximum}` });
    }
  }

  if (Array.isArray(data)) {
    if (schema.minItems !== undefined && data.length < schema.minItems) {
      errors.push({ path, message: `array has fewer than minItems ${schema.minItems}` });
    }
    if (schema.maxItems !== undefined && data.length > schema.maxItems) {
      errors.push({ path, message: `array has more than maxItems ${schema.maxItems}` });
    }
    if (schema.items !== undefined) {
      data.forEach((item, i) => {
        validateNode(schema.items, item, rootSchema, `${path}[${i}]`, errors, depth + 1);
      });
    }
  }

  if (typeOf(data) === 'object') {
    const props = schema.properties || {};
    const patternProps = schema.patternProperties && typeof schema.patternProperties === 'object'
      ? Object.entries(schema.patternProperties) : [];
    if (Array.isArray(schema.required)) {
      for (const key of schema.required) {
        if (!(key in data)) errors.push({ path, message: `missing required property "${key}"` });
      }
    }
    for (const [key, sub] of Object.entries(props)) {
      if (key in data) {
        validateNode(sub, data[key], rootSchema, `${path}.${key}`, errors, depth + 1);
      }
    }
    const matchedByPattern = new Set();
    for (const [pattern, sub] of patternProps) {
      let re;
      try {
        re = new RegExp(pattern);
      } catch (err) {
        errors.push({ path, message: `invalid patternProperties regex ${pattern}` });
        continue;
      }
      for (const key of Object.keys(data)) {
        if (re.test(key)) {
          matchedByPattern.add(key);
          validateNode(sub, data[key], rootSchema, `${path}.${key}`, errors, depth + 1);
        }
      }
    }
    if (schema.additionalProperties !== undefined) {
      for (const key of Object.keys(data)) {
        if (key in props || matchedByPattern.has(key)) continue;
        if (schema.additionalProperties === false) {
          errors.push({ path, message: `unexpected additional property "${key}"` });
        } else if (schema.additionalProperties !== true) {
          validateNode(schema.additionalProperties, data[key], rootSchema, `${path}.${key}`, errors, depth + 1);
        }
      }
    }
  }

  for (const combiner of ['anyOf', 'oneOf']) {
    if (Array.isArray(schema[combiner])) {
      const branchErrors = [];
      let matches = 0;
      for (const sub of schema[combiner]) {
        const errs = [];
        validateNode(sub, data, rootSchema, path, errs, depth + 1);
        if (errs.length === 0) matches++;
        else branchErrors.push(errs);
      }
      const ok = combiner === 'anyOf' ? matches >= 1 : matches === 1;
      if (!ok) {
        const detail = branchErrors[0] && branchErrors[0][0] ? ` (e.g. ${branchErrors[0][0].message})` : '';
        errors.push({ path, message: `does not satisfy ${combiner} (${matches} of ${schema[combiner].length} branches matched)${detail}` });
      }
    }
  }
  if (Array.isArray(schema.allOf)) {
    for (const sub of schema.allOf) {
      validateNode(sub, data, rootSchema, path, errors, depth + 1);
    }
  }
}

/**
 * Validate data against a schema.
 * @returns {{valid: boolean, errors: Array<{path: string, message: string}>}}
 */
function validate(schema, data) {
  const errors = [];
  validateNode(schema, data, schema, '$', errors, 0);
  return { valid: errors.length === 0, errors };
}

/**
 * Sanity-check that a schema document itself is usable by this validator
 * (parses, refs resolve, patterns compile). Returns {valid, errors:[string]}.
 */
function checkSchemaDocument(schema) {
  const errors = [];
  const seen = new Set();
  const KNOWN_TYPES = ['object', 'array', 'string', 'number', 'integer', 'boolean', 'null'];

  /** Visit a node that IS a schema (keyword checks apply only here). */
  function visitSchema(node, path) {
    if (node === true || node === false || node === null || node === undefined) return;
    if (typeof node !== 'object' || Array.isArray(node)) {
      errors.push(`${path}: schema must be an object or boolean`);
      return;
    }
    if (seen.has(node)) return;
    seen.add(node);

    if (typeof node.$ref === 'string') {
      try {
        resolveRef(node.$ref, schema);
      } catch (err) {
        errors.push(`${path}: ${err.message}`);
      }
    }
    if (typeof node.pattern === 'string') {
      try {
        new RegExp(node.pattern); // eslint-disable-line no-new
      } catch (err) {
        errors.push(`${path}: invalid pattern: ${err.message}`);
      }
    }
    if (node.type !== undefined) {
      const types = Array.isArray(node.type) ? node.type : [node.type];
      for (const t of types) {
        if (typeof t !== 'string' || !KNOWN_TYPES.includes(t)) {
          errors.push(`${path}: unknown type ${JSON.stringify(t)}`);
        }
      }
    }
    // containers whose VALUES are schemas (keys are data names, not keywords)
    for (const container of ['properties', 'patternProperties', '$defs', 'definitions']) {
      const c = node[container];
      if (c && typeof c === 'object' && !Array.isArray(c)) {
        for (const [k, v] of Object.entries(c)) visitSchema(v, `${path}/${container}/${k}`);
      }
    }
    // keywords whose value is a single schema
    for (const kw of ['items', 'additionalProperties', 'not', 'if', 'then', 'else',
      'contains', 'propertyNames']) {
      if (node[kw] !== undefined && typeof node[kw] === 'object') {
        visitSchema(node[kw], `${path}/${kw}`);
      }
    }
    // keywords whose value is an array of schemas
    for (const kw of ['oneOf', 'anyOf', 'allOf', 'prefixItems']) {
      if (Array.isArray(node[kw])) {
        node[kw].forEach((sub, i) => visitSchema(sub, `${path}/${kw}/${i}`));
      }
    }
  }
  visitSchema(schema, '#');
  return { valid: errors.length === 0, errors };
}

module.exports = { validate, checkSchemaDocument, deepEqual };
