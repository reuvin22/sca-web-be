// Access roles (RBAC). Separate from the free-text job title (`role`) on the profile.
// sca-1, sca-2 and sca-3 see the same pages for now; dev also gets the developer pages.
// A user can have several roles (e.g. an sca-1 invited to the team becomes ["sca-1", "dev"]).
export const ACCESS_ROLES = ["sca-1", "sca-2", "sca-3", "dev"] as const;
export type AccessRole = (typeof ACCESS_ROLES)[number];

// New accounts start as sca-1. Change roles with: npm run user:role -- <email> <role,role>
export const DEFAULT_ACCESS_ROLE: AccessRole = "sca-1";

interface WithRoles {
  accessRoles?: AccessRole[];
  accessRole?: AccessRole; // older accounts: a single role (or none = sca-1)
}

export const rolesOf = (user: WithRoles): AccessRole[] =>
  user.accessRoles?.length ? user.accessRoles : [user.accessRole ?? DEFAULT_ACCESS_ROLE];

export const hasRole = (user: WithRoles, role: AccessRole) => rolesOf(user).includes(role);

// The user's roles plus one more, without duplicates
export const withRole = (user: WithRoles, role: AccessRole): AccessRole[] => [...new Set([...rolesOf(user), role])];
