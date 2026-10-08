import {test} from 'node:test';import assert from 'node:assert/strict';import {scoreEvidence,dedupeKey,sourceCorpus,weights} from '../src/lib/domain.ts';
const ev=(signal_type:string,extra={})=>({signal_type,source_url:'https://example.org/source',extracted_text:'Direct source statement',confidence:.95,verified:true,...extra});
test('no evidence earns no points',()=>assert.equal(scoreEvidence([]).score,0));
test('unverified or low confidence evidence cannot score',()=>assert.equal(scoreEvidence([ev('looking_for_creators',{verified:false}),ev('new_product_launch',{confidence:.5})]).score,0));
test('duplicate signals score once',()=>assert.equal(scoreEvidence([ev('looking_for_creators'),ev('looking_for_creators')]).score,20));
test('all verified default signals total 100',()=>{const r=scoreEvidence(Object.keys(weights).map(k=>ev(k)));assert.equal(r.score,100);assert.equal(r.level,'High')});
test('custom scores are capped and thresholds respected',()=>assert.equal(scoreEvidence([ev('active_social')],{active_social:150},50,75).score,100));
test('website identity ignores www and path',()=>assert.equal(dedupeKey({company_name:'Company',website:'https://www.example.org/shop'}),dedupeKey({company_name:'Company',website:'https://example.org'})));
test('source corpus preserves quotes and line breaks',()=>assert.equal(sourceCorpus({text:'A "quoted"\nsource'}),'A "quoted"\nsource'));
