import { relations } from "drizzle-orm";
import {
  profiles,
  subscriptions,
  packages,
  packageTools,
  tools,
  payments,
  userRoles,
  adminActions,
} from "./schema";

export const profilesRelations = relations(profiles, ({ many }) => ({
  subscriptions: many(subscriptions),
  payments: many(payments),
  roles: many(userRoles),
  adminActions: many(adminActions, { relationName: "admin" }),
  targetAdminActions: many(adminActions, { relationName: "target" }),
}));

export const packagesRelations = relations(packages, ({ many }) => ({
  packageTools: many(packageTools),
  subscriptions: many(subscriptions),
}));

export const toolsRelations = relations(tools, ({ many }) => ({
  packageTools: many(packageTools),
}));

export const packageToolsRelations = relations(packageTools, ({ one }) => ({
  package: one(packages, { fields: [packageTools.packageId], references: [packages.id] }),
  tool: one(tools, { fields: [packageTools.toolId], references: [tools.id] }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  profile: one(profiles, { fields: [subscriptions.userId], references: [profiles.id] }),
  package: one(packages, { fields: [subscriptions.packageId], references: [packages.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  profile: one(profiles, { fields: [payments.userId], references: [profiles.id] }),
  package: one(packages, { fields: [payments.packageId], references: [packages.id] }),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  profile: one(profiles, { fields: [userRoles.userId], references: [profiles.id] }),
}));

export const adminActionsRelations = relations(adminActions, ({ one }) => ({
  admin: one(profiles, { fields: [adminActions.adminUserId], references: [profiles.id], relationName: "admin" }),
  target: one(profiles, { fields: [adminActions.targetUserId], references: [profiles.id], relationName: "target" }),
}));
