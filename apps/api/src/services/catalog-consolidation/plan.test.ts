import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { cleanCatalogName, globalBarcode, planCatalogConsolidation, type CatalogSource } from './plan';
const source = (patch: Partial<CatalogSource> = {}): CatalogSource => ({
  id: 'one', organizationId: 'store-one', name: 'Сүү 1.5l', barcode: '4006381333931', unit: 'pcs', categoryName: null, imageUrl: null, masterProductId: null, isActive: true, isRestaurantMenuItem: false, reviewStatus: 'APPROVED', updatedAt: '2026-09-30T00:00:00.000Z', ...patch,
});
test('cosmetic normalization preserves sizes and punctuation', () => {
  assert.equal(cleanCatalogName('  Сүү  1.5l  '), 'Сүү 1.5 л');
  assert.equal(cleanCatalogName('Сүү 15l'), 'Сүү 15 л');
  assert.equal(globalBarcode('4006381333931'), '4006381333931');
  assert.equal(globalBarcode('4006381333932'), null);
  assert.equal(globalBarcode('2000000000008'), null);
  assert.equal(globalBarcode('1234'), null);
});
test('consistent products merge across stores without mutating input', () => {
  const sources = [source(), source({ id: 'two', organizationId: 'store-two', name: 'Сүү 1.5 л', unit: 'ш' })];
  const original = JSON.stringify(sources);
  const plan = planCatalogConsolidation(sources, []);
  assert.equal(plan.length, 1);
  assert.equal(plan[0].action, 'CREATE');
  assert.equal(plan[0].canonicalName, 'Сүү 1.5 л');
  assert.equal(plan[0].sourceIds.length, 2);
  assert.equal(JSON.stringify(sources), original);
});
test('size conflicts never merge despite the same barcode', () => {
  const plan = planCatalogConsolidation([source(), source({id:'two', name:'Сүү 15l'})], []);
  assert.equal(plan[0].action, 'REVIEW');
});
test('unsafe sources stay out of the shared catalog', () => {
  for (const patch of [{barcode:null}, {isActive:false}, {reviewStatus:'PENDING'}, {isRestaurantMenuItem:true}, {masterProductId:'different'}]) {
    assert.equal(planCatalogConsolidation([source(patch)], [])[0].action, 'REVIEW');
  }
});
test('repeated imports recognize the existing master and conflicts need review', () => {
  const master = {id:'master', canonicalName:'Сүү 1.5 л', barcode:'4006381333931', unit:'ш', sourceProductId:'one', status:'ACTIVE'};
  assert.equal(planCatalogConsolidation([source()], [master])[0].action, 'EXISTS');
  assert.equal(planCatalogConsolidation([source()], [{...master, canonicalName:'Сүү 15 л'}])[0].action, 'REVIEW');
});
