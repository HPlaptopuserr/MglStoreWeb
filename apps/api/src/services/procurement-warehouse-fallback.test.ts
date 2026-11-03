import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { buildProcurementAdvice } from './procurement-ai.service';

test('warehouse-only demand remains useful without AI and never becomes personal purchase volume', async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    const result = await buildProcurementAdvice([{
      productId: 'warehouse-bestseller', name: 'Сүү', availableStock: 500,
      organizationStock: 0, reorderPoint: 0, soldQuantity90d: 0,
      systemRequestedQuantity90d: 0, previouslyRequestedQuantity: 0,
      warehouseOutgoingQuantity90d: 9000,
    }]);
    assert.equal(result.mode, 'smart');
    assert.equal(result.suggestions.length, 1);
    assert.equal(result.suggestions[0].quantity, 1);
    assert.match(result.suggestions[0].reason, /Агуулахын/);
  } finally {
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
  }
});
