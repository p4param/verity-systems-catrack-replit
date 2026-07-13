const { z } = require('zod');

const schema = z.object({
  width: z.number().optional().nullable()
});

console.log('Test 1 (empty object):', schema.safeParse({}).success);
console.log('Test 2 (null):', schema.safeParse({ width: null }).success);
console.log('Test 3 (NaN):', schema.safeParse({ width: NaN }).success);
