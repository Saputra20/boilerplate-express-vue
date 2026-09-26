import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type { NodePgTransaction } from 'drizzle-orm/node-postgres';
import type * as schema from '../../src/config/drizzle/schema/index.js';

export type SeedTransaction = NodePgTransaction<
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;
