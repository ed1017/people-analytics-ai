/** Pure comparison groundwork. No calculator, storage, UI, or result validation.
 * Adapter requirements before save/compare:
 * - Require non-null stable dataset, goal and scope identifiers and validate
 *   their ownership/context; generic JSON equality does not validate scope.
 * - Validate full inputs against the actual calculator contract, including a
 *   contiguous monthly axis and its required relationship to asOf.
 * - Capture the full input key at calculation time and bind it to the actual
 *   calculator version and results. Never refresh the key for old results.
 * - Recompute with that calculator on reload and validate stored results.
 * These helpers alone establish neither domain validity nor result correctness.
 * A key is an equality token, not a cryptographic integrity certificate.
 */
const fail = message => { throw new Error(message); };
function canonical(value, depth = 0) {
  if (depth > 20) fail('Scenario input nesting is excessive.');
  if (value === null || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (typeof value === 'string' && value.length <= 200000) return JSON.stringify(value);
  if (Array.isArray(value)) {
    if (Object.getPrototypeOf(value) !== Array.prototype) fail('Scenario arrays must have the standard prototype.');
    if (value.length > 5000 || Reflect.ownKeys(value).length !== value.length + 1) fail('Invalid scenario array.');
    const items = [];
    for (let index = 0; index < value.length; index++) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) fail('Scenario arrays must be plain data.');
      items.push(canonical(descriptor.value, depth + 1));
    }
    return '[' + items.join(',') + ']';
  }
  if (value && Object.getPrototypeOf(value) === Object.prototype) {
    const keys = Reflect.ownKeys(value);
    if (keys.length > 300 || keys.some(key => typeof key !== 'string' || key.length > 150 || ['__proto__', 'prototype', 'constructor'].includes(key))) fail('Invalid scenario object.');
    return '{' + keys.sort().map(key => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) fail('Scenario inputs must be plain data.');
      return JSON.stringify(key) + ':' + canonical(descriptor.value, depth + 1);
    }).join(',') + '}';
  }
  fail('Scenario inputs must be finite JSON data.');
}
export function monthlyScenarioInputKey(inputs) {
  const key = canonical(inputs);
  if (new TextEncoder().encode(key).length > 384 * 1024) fail('Scenario input size is excessive.');
  return key;
}
export function monthlyScenarioInputsAreCurrent(calculatedInputKey, currentInputs) {
  try { return typeof calculatedInputKey === 'string' && calculatedInputKey === monthlyScenarioInputKey(currentInputs); }
  catch { return false; }
}
const basisKeys = ['schemaVersion', 'calculatorVersion', 'semantics', 'unitBasis', 'scope', 'asOf', 'months'];
function validBasis(basis) {
  if (!basis || Object.getPrototypeOf(basis) !== Object.prototype || Object.keys(basis).sort().join() !== [...basisKeys].sort().join()) return false;
  const text = value => typeof value === 'string' && value.trim() === value && value.length > 0 && value.length <= 240;
  const date = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  return basis.schemaVersion === 1 && text(basis.calculatorVersion) && text(basis.semantics) && text(basis.unitBasis)
    && basis.scope && Object.getPrototypeOf(basis.scope) === Object.prototype && Object.keys(basis.scope).length > 0
    && date(basis.asOf) && Array.isArray(basis.months) && basis.months.length > 0 && basis.months.length <= 120
    && basis.months.every((month, index) => typeof month === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(month) && (!index || month > basis.months[index - 1]));
}
/** Scope uses stable identifiers supplied by the adapter, not display labels.
 * This is a structural compatibility check, not contract validation: nonempty
 * scope objects may still contain invalid IDs; ordered months may have gaps or
 * an invalid relationship to asOf. The adapter must reject those first.
 * Units/semantics describe conventions, never the numeric productivity,
 * workload, hires or exits assumptions that users intentionally vary.
 */
export function compareMonthlyScenarioBasis(left, right) {
  try {
    monthlyScenarioInputKey(left); monthlyScenarioInputKey(right);
    if (!validBasis(left) || !validBasis(right)) return {compatible: false, differences: ['invalid-basis']};
    const differences = basisKeys.filter(key => monthlyScenarioInputKey(left[key]) !== monthlyScenarioInputKey(right[key]));
    return {compatible: differences.length === 0, differences};
  } catch { return {compatible: false, differences: ['invalid-basis']}; }
}
/** Returns top-level assumption changes; nested schedules remain whole values.
 * Missing values are explicit, preserving the distinction from JSON null.
 */
export function monthlyScenarioAssumptionDifferences(left, right) {
  monthlyScenarioInputKey(left); monthlyScenarioInputKey(right);
  if (!left || !right || Object.getPrototypeOf(left) !== Object.prototype || Object.getPrototypeOf(right) !== Object.prototype) fail('Assumptions must be objects.');
  return [...new Set([...Object.keys(left), ...Object.keys(right)])].sort().flatMap(field => {
    const before = Object.hasOwn(left, field) ? {present: true, value: left[field]} : {present: false};
    const after = Object.hasOwn(right, field) ? {present: true, value: right[field]} : {present: false};
    return monthlyScenarioInputKey(before) === monthlyScenarioInputKey(after) ? [] : [{field, before: structuredClone(before), after: structuredClone(after)}];
  });
}
