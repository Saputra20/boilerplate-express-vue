import { customType } from 'drizzle-orm/pg-core';

export const lowercaseText = customType<{ data: string; driverData: string }>({
  dataType: () => 'text',
  toDriver: (value) => value.toLowerCase(),
});
