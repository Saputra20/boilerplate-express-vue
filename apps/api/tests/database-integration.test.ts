import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { createDatabase } from '../src/config/database/client.js';
import { API_INTEGRATION_ENABLED, testDatabaseConfig } from './helpers/integration.js';

const integrationDescribe = API_INTEGRATION_ENABLED ? describe : describe.skip;

integrationDescribe('PostgreSQL test isolation', () => {
  let database!: ReturnType<typeof createDatabase>;
  let tableName: string;
  let tableCreated = false;

  beforeEach(async () => {
    database = createDatabase(testDatabaseConfig);
    tableName = `test_backend_${randomUUID().replaceAll('-', '')}`;
    await database.initialize();
    await database.db.execute(
      sql.raw(`CREATE TABLE "${tableName}" (id uuid PRIMARY KEY, label text NOT NULL)`),
    );
    tableCreated = true;
  });

  afterEach(async () => {
    if (tableCreated) {
      await database.db.execute(sql.raw(`DROP TABLE IF EXISTS "${tableName}"`));
    }
    await database.close().catch(() => undefined);
  });

  it('creates, reads, and removes isolated synthetic state', async () => {
    const id = randomUUID();
    await database.db.execute(
      sql.raw(`INSERT INTO "${tableName}" (id, label) VALUES ('${id}', 'test-value')`),
    );

    const result = await database.db.execute<{ label: string }>(
      sql.raw(`SELECT label FROM "${tableName}" WHERE id = '${id}'`),
    );

    expect(result.rows).toEqual([{ label: 'test-value' }]);
  });
});
