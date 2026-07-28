import { useContext } from "react";
import { AdminContext } from "./AdminContext";

export function useAdminContext() {
  const value = useContext(AdminContext);
  if (!value) {
    throw new Error("AdminProvider is required");
  }
  return value;
}
