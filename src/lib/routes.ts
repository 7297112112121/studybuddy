export const ROUTES = {
  login: "/login",
  register: "/register",
  workbench: "/workbench",
} as const;

export type Routes = typeof ROUTES;
