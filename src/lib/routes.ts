export const ROUTES = {
  login: "/login",
  register: "/register",
  workbench: "/workbench",
  calendar: "/calendar",
} as const;

export type Routes = typeof ROUTES;
