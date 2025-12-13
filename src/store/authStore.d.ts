export type AuthUser = { id?: number | null } | null;
export type AuthStore = {
  user?: AuthUser;
  token?: string | null;
  [key: string]: any;
};

declare const useAuthStore: any;
export { useAuthStore };
export default useAuthStore;
