import fs from 'node:fs';
import assert from 'node:assert/strict';
import {estimate,estimateInternalWork} from '../content/estimator.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('../content/catalog.json',import.meta.url)));
const packages=JSON.parse(fs.readFileSync(new URL('../content/packages.json',import.meta.url)));
const selections=o=>Object.entries(o).map(([id,quantity])=>({id,quantity}));
for(const p of packages){const i=catalog.items.find(i=>i.id===p.name.toLowerCase());assert.deepEqual([i.setup,i.monthly],[p.development,p.monthly]);}
let q=estimate(catalog,selections({email:3,scheduling:3,admin:1,domain:2}));
assert.deepEqual([q.setup,q.monthly],[1500,210]);
q=estimate(catalog,selections({essential:1,email:3,scheduling:3,admin:1,domain:2}));assert.deepEqual([q.setup,q.monthly],[3495,260]);
assert.throws(()=>estimate(catalog,selections({email:1.5})),/Invalid quantity/);
assert.throws(()=>estimate(catalog,selections({email:-1})),/Invalid quantity/);
assert.throws(()=>estimate(catalog,selections({missing:1})),/Unknown service/);
assert.throws(()=>estimate(catalog,selections({growth:1})),/Legacy package/);
assert.throws(()=>estimate(catalog,selections({labor:1})),/Unknown service/);
assert.equal(estimate(catalog,selections({store:1})).starting_estimate,true);
assert.equal(estimate(catalog,selections({local_seo:1,monitoring:1})).requires_scope_review,true);
assert.equal(estimate(catalog,selections({domain:1,domain_transfer:1})).requires_scope_review,true);
console.log('PASS: estimate examples, package consistency, quantities and scope-overlap checks.');
assert.throws(()=>estimate(catalog,selections({enterprise:1})),/individually scoped quote/);
assert.throws(()=>estimate(catalog,selections({enterprise:1,email:3})),/individually scoped quote/);
q=estimate(catalog,selections({essential:1,scheduling:1}));assert.deepEqual([q.setup,q.monthly],[2245,85]);
q=estimate(catalog,selections({essential:1,admin:1}));assert.deepEqual([q.setup,q.monthly],[2745,115]);
console.log('PASS: configured examples, custom Enterprise referral, legacy Growth exclusion.');

const privateGuidance={hourly_rate:75,minimum_labor_charge:40};
assert.equal(estimateInternalWork(.5,privateGuidance).reference_amount,40);
assert.equal(estimateInternalWork(.25,privateGuidance).reference_amount,40);
assert.equal(estimateInternalWork(2,privateGuidance).reference_amount,150);
assert.throws(()=>estimateInternalWork(0,privateGuidance),/positive effort/);
assert.throws(()=>estimateInternalWork(1),/private pricing/);
const mapping=JSON.parse(fs.readFileSync(new URL('../content/capability-map.json',import.meta.url)));
assert.equal(mapping.capabilities.length,24);
for(const capability of mapping.capabilities){assert.ok(capability.question);for(const id of capability.service_ids)assert.ok(catalog.items.some(i=>i.id===id),`Unmapped price: ${id}`);}
assert.ok(!('hourly_rate' in catalog));assert.ok(!('minimum_labor_charge' in catalog));
assert.ok(catalog.items.some(i=>i.id==='ppc'));assert.ok(catalog.items.some(i=>i.id==='consult'));assert.ok(catalog.items.some(i=>i.id==='audit'));
for(const i of catalog.items){assert.ok(i.scope&&i.delivery&&i.jasper_action);assert.ok(i.questions.length);if(i.price_kind==='custom')assert.deepEqual([i.setup,i.monthly],[null,null]);else assert.ok(Number.isFinite(i.setup)&&Number.isFinite(i.monthly));}
q=estimate(catalog,selections({upload_form:1,form:1}));assert.equal(q.customer_estimate_ready,false);assert.ok(q.questions.some(x=>x.includes('already includes form')));
q=estimate(catalog,selections({cms_area:1}));assert.equal(q.requires_scope_review,true);assert.ok(q.questions.some(x=>x.includes('prerequisite')));
assert.equal(estimate(catalog,selections({client_portal:1})).starting_estimate,true);
console.log('PASS: complete capability mapping, internal minimum, dependencies, overlaps and public/private separation.');

q=estimate(catalog,selections({essential:1,email:20}));assert.deepEqual([q.setup,q.monthly],[2620,250]);
