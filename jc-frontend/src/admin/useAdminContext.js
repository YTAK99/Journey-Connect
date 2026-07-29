import { useContext } from "react";
import { AdminContext } from "./AdminContext";

export function useAdminContext() {
  const value = useContext(AdminContext);

  if (!value) {
    throw new Error("AdminProvider가 필요합니다.");
  }

  return value;
}