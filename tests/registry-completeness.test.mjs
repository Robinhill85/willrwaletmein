// Regression: final submission QA found a 14-match answer falsely excluding IXS
// because the tool cut the JSON at 9,000 characters before the IXS entry.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const fixture=Array.from({length:26},(_,i)=>({id:i===25?'ixs-blackrock-hy-bond':`vault-${i}`,name:`Vault ${i}`,underlying:'Verified details '.repeat(100)}));
const code=ts.transpileModule(fs.readFileSync('src/lib/tools.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const exportsObject={};
vm.runInNewContext(code,{exports:exportsObject,require:name=>{
 if(name==='./registry')return {loadRegistry:async()=>fixture,eligible:()=>true,summarize:v=>v};
 if(name==='./cmc')return {compact:v=>JSON.stringify(v).slice(0,9000)};
 if(name==='./data-status')return {IXS_VAULT_NAME:'IXS High Yield Corporate Bond Vault'};
 throw new Error(`Unexpected dependency: ${name}`);
}});
test('search retains every returned vault and its complete terms even beyond 9 KB',async()=>{
 const {result}=await exportsObject.runTool('vault_ledger_search',{},[]);
 const data=JSON.parse(result);
 assert.equal(data.count,26);
 assert.equal(data.vaults.length,26);
 assert.equal(data.vaults.at(-1).id,'ixs-blackrock-hy-bond');
});
test('full terms are not cut off by the tool transport',async()=>{
 const longVault={...fixture[25],risk_notes:'Terms and conditions '.repeat(800)};
 fixture[25]=longVault;
 const {result}=await exportsObject.runTool('vault_terms',{id:longVault.id},[]);
 assert.equal(JSON.parse(result).risk_notes,longVault.risk_notes);
});
test('issuer and ticker match across separate fields in either order',async()=>{
 fixture[0]={id:'ondo-ousg',name:'Ondo Short-Term US Government Treasuries',issuer:'Ondo Finance',tokens:['OUSG'],underlying:'Treasury funds'};
 for(const query of ['Ondo OUSG','ousg ondo','  ONDO   OUSG  ']) {
  const {result}=await exportsObject.runTool('vault_ledger_search',{query},[]);
  assert.deepEqual(JSON.parse(result).vaults.map(v=>v.id),['ondo-ousg']);
 }
 const {result}=await exportsObject.runTool('vault_ledger_search',{query:'Ondo nonexistent'},[]);
 assert.equal(JSON.parse(result).count,0);
});
