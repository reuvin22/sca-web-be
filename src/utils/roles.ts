// Access roles (RBAC). Separate from the free-text job title (`role`) on the profile.
// sca-1, sca-2 and sca-3 see the same pages for now; dev also gets the developer pages.
export const ACCESS_ROLES = ["sca-1", "sca-2", "sca-3", "dev"] as const;
export type AccessRole = (typeof ACCESS_ROLES)[number];

// New accounts start as sca-1. Change roles with: npm run user:role -- <email> <role>
export const DEFAULT_ACCESS_ROLE: AccessRole = "sca-1";

// Accounts created before roles existed have no accessRole yet
export const roleOf = (user: { accessRole?: AccessRole }): AccessRole => user.accessRole ?? DEFAULT_ACCESS_ROLE;
