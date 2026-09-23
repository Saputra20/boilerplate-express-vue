import { createServer } from 'node:net';
import { createRedis } from '../src/config/redis/client.js';
import { loadRedisConfig } from '../src/config/redis/config.js';
import { runServer } from '../src/server.js';

const validRedisEnv = () => ({
  REDIS_HOST: 'localhost',
  REDIS_PORT: '6379',
  REDIS_USERNAME: 'app',
  REDIS_PASSWORD: 'test-redis-password',
  REDIS_DATABASE: '0',
  REDIS_TLS: 'false',
});

describe('redis foundation', () => {
  it('creates a lazy Redis client from separated configuration', () => {
    const config = loadRedisConfig(validRedisEnv());
    const redis = createRedis(config);

    expect(config).toEqual({
      host: 'localhost',
      port: 6379,
      username: 'app',
      password: 'test-redis-password',
      db: 0,
      tls: false,
    });
    expect(redis.client.status).toBe('wait');

    redis.close();
  });

  it('rejects invalid configuration without exposing password values', () => {
    const password = 'do-not-expose-this-password';

    expect(() =>
      loadRedisConfig({ ...validRedisEnv(), REDIS_PASSWORD: password, REDIS_PORT: '0' }),
    ).toThrow('Invalid Redis configuration: REDIS_PORT');

    try {
      loadRedisConfig({ ...validRedisEnv(), REDIS_PASSWORD: password, REDIS_PORT: '0' });
    } catch (error) {
      expect(error instanceof Error ? error.message : '').not.toContain(password);
    }
  });

  it('connects to Redis without sending AUTH when credentials are unset', async () => {
    let sawAuth = false;
    const server = createServer((socket) => {
      let buffer = '';

      socket.on('data', (chunk) => {
        buffer += chunk.toString();
        const parsed = readRedisCommands(buffer);
        buffer = parsed.remainder;

        for (const command of parsed.commands) {
          if (command === 'AUTH') sawAuth = true;
          socket.write(command === 'PING' ? '+PONG\r\n' : '+OK\r\n');
        }
      });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (address === null || typeof address === 'string')
      throw new Error('Test server did not bind');
    const redis = createRedis(
      loadRedisConfig({
        ...validRedisEnv(),
        REDIS_HOST: '127.0.0.1',
        REDIS_PORT: String(address.port),
        REDIS_USERNAME: '',
        REDIS_PASSWORD: '',
      }),
    );

    try {
      await redis.initialize();
      expect(sawAuth).toBe(false);
    } finally {
      redis.close();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('sanitizes Redis initialization failures', async () => {
    const redis = createRedis(
      loadRedisConfig({ ...validRedisEnv(), REDIS_HOST: '127.0.0.1', REDIS_PORT: '1' }),
    );

    await expect(redis.initialize()).rejects.toThrow('Redis initialization failed');
  });

  it('terminates startup safely when Redis initialization fails', async () => {
    const password = 'do-not-log-this-redis-password';
    const redis = createRedis(
      loadRedisConfig({
        ...validRedisEnv(),
        REDIS_HOST: '127.0.0.1',
        REDIS_PORT: '1',
        REDIS_PASSWORD: password,
      }),
    );
    const originalExitCode = process.exitCode;
    let output = '';
    process.exitCode = undefined;

    try {
      await runServer(
        async () => {
          try {
            await redis.initialize();
          } catch {
            throw new Error('API startup failed during Redis initialization');
          }
        },
        (message) => {
          output += message;
        },
      );

      expect(process.exitCode).toBe(1);
      expect(output).toBe('API startup failed during Redis initialization\n');
      expect(output).not.toContain(password);
    } finally {
      process.exitCode = originalExitCode;
      redis.close();
    }
  });

  it('reports safe Redis configuration detail without credentials', async () => {
    const password = 'do-not-log-this-redis-password';
    const originalExitCode = process.exitCode;
    let output = '';
    process.exitCode = undefined;

    try {
      await runServer(
        async () => {
          throw new Error(
            'API startup failed during Redis configuration: Invalid Redis configuration: REDIS_PORT',
          );
        },
        (message) => {
          output += message;
        },
      );

      expect(process.exitCode).toBe(1);
      expect(output).toBe(
        'API startup failed during Redis configuration: Invalid Redis configuration: REDIS_PORT\n',
      );
      expect(output).not.toContain(password);
    } finally {
      process.exitCode = originalExitCode;
    }
  });
});

function readRedisCommands(buffer: string): { commands: string[]; remainder: string } {
  const commands: string[] = [];
  let offset = 0;

  while (buffer.slice(offset, offset + 1) === '*') {
    const arrayEnd = buffer.indexOf('\r\n', offset);
    if (arrayEnd === -1) break;
    const itemCount = Number(buffer.slice(offset + 1, arrayEnd));
    if (!Number.isInteger(itemCount)) break;
    let cursor = arrayEnd + 2;
    const items: string[] = [];

    for (let itemIndex = 0; itemIndex < itemCount; itemIndex += 1) {
      if (buffer.slice(cursor, cursor + 1) !== '$')
        return { commands, remainder: buffer.slice(offset) };
      const lengthEnd = buffer.indexOf('\r\n', cursor);
      if (lengthEnd === -1) return { commands, remainder: buffer.slice(offset) };
      const length = Number(buffer.slice(cursor + 1, lengthEnd));
      const valueStart = lengthEnd + 2;
      const valueEnd = valueStart + length;
      if (!Number.isInteger(length) || buffer.slice(valueEnd, valueEnd + 2) !== '\r\n') {
        return { commands, remainder: buffer.slice(offset) };
      }
      items.push(buffer.slice(valueStart, valueEnd));
      cursor = valueEnd + 2;
    }

    if (items[0] !== undefined) commands.push(items[0].toUpperCase());
    offset = cursor;
  }

  return { commands, remainder: buffer.slice(offset) };
}
