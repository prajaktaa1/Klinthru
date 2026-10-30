const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Exercise form event handlers without a browser or any API/database requests.
let slots = [], cursor = 0;
const react = {
  useState(initial) {
    const index = cursor++;
    if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
    return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
  },
  useRef(initial) {
    const index = cursor++;
    if (!(index in slots)) slots[index] = { current: initial };
    return slots[index];
  },
  useMemo: fn => fn(),
  useEffect() {},
  useId: () => 'test-id'
};
const element = (type, props) => ({ type, props });
function load(relativePath) {
  const filename = path.resolve(__dirname, '..', relativePath);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 }
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, { module, exports: module.exports, require(name) {
    if (name === 'react') return react;
    if (name === 'react/jsx-runtime') return { jsx: element, jsxs: element };
    if (name === 'next/link') return { default: 'a' };
    if (name === '@/lib/sensor-assignment-options') return load('src/lib/sensor-assignment-options.ts');
    throw new Error(`Unexpected import: ${name}`);
  } }, { filename });
  return module.exports;
}
const { SensorAssignmentForm } = load('src/components/sensor-assignment-form.tsx');
function nodes(tree) {
  if (tree == null || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}
function field(tree, label) {
  const wrapper = nodes(tree).find(node => node.props?.label === label);
  assert.ok(wrapper, `Missing field: ${label}`);
  return nodes(wrapper.props.children)[0];
}
const event = { preventDefault() {} };
const device = { id: 'test-record', deviceId: 'TEST-FLOW-001', deviceType: 'Flow Meter', isDemoData: false };
let submitted = [], release;
let props = {
  devices: [device], demoDeviceCount: 0, devicesError: null, isDevicesLoading: false,
  isSaving: false, mode: 'create', onCancel() {},
  onSubmit: input => { submitted.push(input); return new Promise(resolve => { release = resolve; }); }
};
function render() { cursor = 0; return SensorAssignmentForm(props); }
function change(label, value) {
  const control = field(render(), label);
  control.props.onChange(control.type === 'input' || control.type === 'select' || control.type === 'textarea' ? { target: { value } } : value);
}
function submit() { render().props.onSubmit(event); }
async function run() {
  let tree = render();
  for (const label of ['Registered sensor', 'Sensor category', 'Sensor name', 'Sensor/device type', 'Pipeline or asset', 'Installation location', 'Installation type', 'Values measured', 'Measurement unit', 'Installation date', 'Data source', 'Assignment status']) field(tree, label);
  assert.ok(!JSON.stringify(tree).includes('Notes (optional)'));
  submit();
  assert.equal(submitted.length, 0, 'Unregistered sensor must not submit');
  change('Registered sensor', device.deviceId);
  tree = render();
  assert.equal(field(tree, 'Sensor category').props.value, 'Internal Process Sensors');
  assert.equal(field(tree, 'Sensor name').props.value, 'Flow Meter');
  assert.equal(field(tree, 'Sensor/device type').props.value, 'Flow Meter');
  change('Registered sensor', '');
  assert.equal(field(render(), 'Registered sensor').props.value, '', 'Placeholder clears selection');
  change('Registered sensor', device.deviceId);
  change('Pipeline or asset', '   ');
  submit();
  assert.equal(submitted.length, 0, 'Whitespace required values must fail');
  change('Pipeline or asset', '  Pipeline A  ');
  change('Installation location', ' Section 2 ');
  change('Installation date', '2026-02-30');
  submit();
  assert.equal(submitted.length, 0, 'Invalid calendar dates must fail');
  change('Installation date', '2026-09-15');
  submit(); submit();
  assert.equal(submitted.length, 1, 'Rapid duplicate submissions must create one request');
  assert.equal(submitted[0].pipelineOrAsset, 'Pipeline A');
  assert.equal(submitted[0].installationLocation, 'Section 2');
  assert.equal(submitted[0].notes, '');
  assert.equal(nodes(render()).find(node => node.type === 'fieldset').props.disabled, true);
  release();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(nodes(render()).find(node => node.type === 'fieldset').props.disabled, false);
  nodes(render()).find(node => node.type === 'button' && node.props.children === 'Cancel').props.onClick();
  assert.equal(field(render(), 'Registered sensor').props.value, '');
  assert.equal(field(render(), 'Pipeline or asset').props.value, '');
  props = { ...props, devices: [], demoDeviceCount: 1 };
  tree = render();
  assert.ok(!JSON.stringify(tree).includes('No registered sensors available. Add a sensor in Sensors first.'));
  assert.ok(!nodes(tree).some(node => node.props?.href === '/sensors'));
  props = { ...props, devices: [device], devicesError: 'Backend unavailable' };
  assert.ok(nodes(render()).some(node => node.props?.role === 'alert' && node.props.children === 'Backend unavailable'));
  submit();
  assert.equal(submitted.length, 1, 'Loading errors must block submission');
  console.log('Sensor assignment form checks passed: fields, autofill, removed empty-state and Notes UI, errors, required values, date validation, duplicate guard, trimming, pending state, and cancel reset.');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
