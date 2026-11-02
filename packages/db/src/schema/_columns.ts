import { timestamp, uuid } from "drizzle-orm/pg-core";
import { uuidv7 } from "../uuid";

/** Primary key: UUIDv7 (time-ordered, index-friendly), generated in the app. */
export const id = () =>
  uuid()
    .primaryKey()
    .$defaultFn(() => uuidv7());

/** `created_at` / `updated_at`, on every table. */
export const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/** Soft delete marker, for tables where we keep history. */
export const softDelete = {
  deletedAt: timestamp({ withTimezone: true }),
};
