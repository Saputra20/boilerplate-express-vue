type ClosableServer = {
  close(callback: (error?: Error) => void): unknown;
};

type ShutdownResources = {
  database: { close(): Promise<void> };
  redis: { close(): void };
  queues?: { close(): Promise<void> };
  logging: { close(): void };
};

export async function shutdown(
  server: ClosableServer,
  resources: ShutdownResources,
): Promise<void> {
  let failure: unknown;

  try {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  } catch (error) {
    failure = error;
  }

  try {
    await resources.queues?.close();
  } catch (error) {
    failure ??= error;
  }

  try {
    await resources.database.close();
  } catch (error) {
    failure ??= error;
  }

  try {
    resources.redis.close();
  } catch (error) {
    failure ??= error;
  }

  try {
    resources.logging.close();
  } catch (error) {
    failure ??= error;
  }

  if (failure) throw failure;
}
