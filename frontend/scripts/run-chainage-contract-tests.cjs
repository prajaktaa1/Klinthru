const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,f);
const front=require('../src/lib/chainage.ts'), back=require('../../backend/src/coreEngine/chainage/ChainageAgent.ts');
for(const value of ['0+050','1+000','18+900','249+000','18.9 km','18,900 metres']) { assert.deepEqual(front.chainageSummary(value),back.chainageSummary(value),value); }
const ecda=fs.readFileSync(path.join(__dirname,'../src/components/ecda-assessment-workspace.tsx'),'utf8');
assert.match(ecda,/chainageSummary/, 'ECDA must use the shared Chainage contract'); assert.doesNotMatch(ecda,/replace\(\/\[\^\\d\.\-\]\+\/g/, 'ECDA must not retain its local numeric scraper');
console.log('PASS frontend/backend Chainage contract parity and ECDA shared-parser checks.');
