require('../apps/api/node_modules/dotenv').config();
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const { normalize } = require('../scripts/normalize-vendor-warehouses.cjs');
const repair = (db, input) => normalize(db, {...input,sourceIds:[input.sourceId]});
const db = new PrismaClient();
if (!['127.0.0.1', 'localhost'].includes(new URL(process.env.DATABASE_URL).hostname)) throw new Error('Local DB only');
(async () => {
 const key = randomUUID();
 const org = await db.organization.create({data:{name:'[TEST] repair',slug:key,taxId:key}});
 const user = await db.user.create({data:{email:`${key}@example.invalid`}});
 let source, target, count;
 try {
  source=await db.warehouse.create({data:{name:'[TEST] repair - Үндсэн агуулах',address:'Test',type:'CENTRAL',organizations:{create:{organizationId:org.id}}}});
  target=await db.warehouse.create({data:{name:'[TEST] repair - Үндсэн агуулах',address:'Test',type:'VENDOR_INTERNAL',organizations:{create:{organizationId:org.id}}}});
  const a=await db.product.create({data:{name:'Migrated',organizationId:org.id,stock:5,price:1,warehouseInventories:{create:{warehouseId:source.id,quantity:5}}}});
  const b=await db.product.create({data:{name:'Counted',organizationId:org.id,stock:7,price:1,warehouseInventories:{create:{warehouseId:target.id,quantity:7}}}});
  count=await db.stocktake.create({data:{organizationId:org.id,warehouseId:target.id,title:'Keep count',kind:'PARTIAL',createdById:user.id,lines:{create:{productId:b.id,name:b.name,expected:7,counted:3,note:'Keep note',stockUpdatedAt:b.updatedAt}}}});
  const input={organizationId:org.id,sourceId:source.id,targetId:target.id,stocktakeId:count.id};
  const dry=await repair(db,input); assert.equal(dry.applied,false);assert.equal(dry.movedRows,1);
  await db.warehouseInventory.create({data:{warehouseId:target.id,productId:a.id,quantity:0}});
  await assert.rejects(repair(db,input),/Overlapping/);
  await db.warehouseInventory.delete({where:{warehouseId_productId:{warehouseId:target.id,productId:a.id}}});
  const out=await repair(db,{...input,apply:true,backupPath:`work/repair-test-${key}.json`});
  assert.equal(out.preservedCounts,true); assert.equal(out.preservedProducts,true);
  assert.equal(await db.warehouseInventory.count({where:{warehouseId:source.id}}),0);
  assert.equal((await db.product.findUnique({where:{id:a.id}})).stock,5);
  assert.equal((await db.warehouseInventory.findUnique({where:{warehouseId_productId:{warehouseId:target.id,productId:a.id}}})).quantity,5);
  assert.equal((await db.stocktakeLine.findFirst({where:{stocktakeId:count.id}})).counted,3);
  assert.equal((await repair(db,{...input,apply:true,backupPath:'unused'})).warehouses,0);
  await db.warehouse.update({where:{id:target.id},data:{type:'CENTRAL'}});
  const convert=await repair(db,{sourceId:target.id,apply:true,backupPath:`work/convert-test-${key}.json`});
  assert.equal(convert.convertedRows,2);
  assert.equal((await db.warehouse.findUnique({where:{id:target.id}})).type,'VENDOR_INTERNAL');
  console.log('PASS conversion, dry run, overlap rejection, atomic repair, stock/count preservation, retry safety');
 } finally {
  await db.inventoryLedger.deleteMany({where:{product:{organizationId:org.id}}});
  await db.stocktake.deleteMany({where:{organizationId:org.id}});
  await db.warehouseInventory.deleteMany({where:{product:{organizationId:org.id}}});
  await db.product.deleteMany({where:{organizationId:org.id}});
  await db.warehouseOrganization.deleteMany({where:{organizationId:org.id}});
  await db.warehouse.deleteMany({where:{id:{in:[source?.id,target?.id].filter(Boolean)}}});
  await db.organization.delete({where:{id:org.id}});await db.user.delete({where:{id:user.id}});
 }
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>db.$disconnect());
