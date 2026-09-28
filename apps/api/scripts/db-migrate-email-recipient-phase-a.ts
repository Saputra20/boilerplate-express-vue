import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createDatabase } from '../src/config/database/client.js';
import { loadDatabaseConfig } from '../src/config/database/config.js';

const phaseATag = '0017_add-encrypted-email-recipient-fields';
const currentDirectory = dirname(fileURLToPath(import.meta.url));
const sourceDirectory = resolve(currentDirectory, '../drizzle');

type MigrationJournal = {
  version: string;
  dialect: string;
  entries: Array<{ idx: number; version: string; when: number; tag: string; breakpoints: boolean }>;
};

export async function migrateEmailRecipientPhaseA(): Promise<void> {
  const journal = JSON.parse(
    await readFile(join(sourceDirectory, 'meta/_journal.json'), 'utf8'),
  ) as MigrationJournal;
  const phaseAIndex = journal.entries.findIndex(({ tag }) => tag === phaseATag);
  if (phaseAIndex < 0) throw new Error('Email recipient phase-A migration is missing');

  const stagedDirectory = await mkdtemp(join(tmpdir(), 'email-recipient-phase-a-'));
  const migrationsDirectory = join(stagedDirectory, 'drizzle');
  await mkdir(join(migrationsDirectory, 'meta'), { recursive: true });
  const entries = journal.entries.slice(0, phaseAIndex + 1);
  for (const entry of entries) {
    await copyFile(
      join(sourceDirectory, `${entry.tag}.sql`),
      join(migrationsDirectory, `${entry.tag}.sql`),
    );
  }
  await writeFile(
    join(migrationsDirectory, 'meta/_journal.json'),
    JSON.stringify({ ...journal, entries }, null, 2),
    { mode: 0o600 },
  );

  const database = createDatabase(loadDatabaseConfig());
  try {
    await database.initialize();
    await migrate(database.db, { migrationsFolder: migrationsDirectory });
  } finally {
    await database.close();
    await rm(stagedDirectory, { recursive: true, force: true });
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : undefined;
if (invokedPath === fileURLToPath(import.meta.url)) {
  migrateEmailRecipientPhaseA()
    .then(() => console.log('Email recipient phase-A schema is ready for encrypted backfill'))
    .catch((error: unknown) => {
      console.error(
        error instanceof Error ? error.message : 'Email recipient phase-A migration failed',
      );
      process.exitCode = 1;
    });
}
