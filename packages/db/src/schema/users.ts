import { boolean, pgEnum, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { id, softDelete, timestamps } from "./_columns";

/**
 * Platform role (section 3). "professional" is granted by an admin after
 * RCVS verification (M6); moderators and admins are assigned by hand.
 */
export const userRole = pgEnum("user_role", ["owner", "professional", "moderator", "admin"]);

/**
 * Users. Column names follow Better Auth's user model (name, email,
 * emailVerified, image) so its Drizzle adapter can use this table in M2.
 */
export const users = pgTable(
  "users",
  {
    id: id(),
    email: text().notNull(),
    emailVerified: boolean().notNull().default(false),
    name: text().notNull(),
    /** Shown publicly (forums). Never the email. */
    displayName: text().notNull(),
    image: text(),
    role: userRole().notNull().default("owner"),
    ...timestamps,
    ...softDelete,
  },
  (t) => [uniqueIndex("users_email_uq").on(t.email)],
);
