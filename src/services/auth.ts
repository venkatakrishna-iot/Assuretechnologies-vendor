export interface AuthUser {
  id: number;
  email?: string;
  role: string;
  full_name?: string;
  mobile?: string;
}

export const loginUser = (user: AuthUser) => {
  localStorage.setItem("user", JSON.stringify(user));
};

export const logoutUser = () => {
  localStorage.removeItem("vendor_token");
  localStorage.removeItem("user");
};

export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem("user") || !!localStorage.getItem("vendor_token");
};

export const getCurrentUser = (): AuthUser | null => {
  const userStr = localStorage.getItem("user");
  if (!userStr) return null;
  try {
    return JSON.parse(userStr) as AuthUser;
  } catch (e) {
    return null;
  }
};
