import { useCallback, useMemo, useState } from "react";
import { getAdminDashboard } from "../services/adminApi";
import { normalizeAdminError } from "./adminErrors";
import { AdminProvider } from "./admin/AdminProvider";

export function AdminProvider({ initialDashboard, children }) {
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [dashboardError, setDashboardError] = useState(null);

  const refreshDashboard = useCallback(async () => {
    try {
      const next = await getAdminDashboard();
      setDashboard(next);
      setDashboardError(null);
      return next;
    } catch (error) {
      const normalized = normalizeAdminError(error);
      setDashboardError(normalized);
      throw normalized;
    }
  }, []);

  const value = useMemo(
    () => ({ dashboard, dashboardError, refreshDashboard }),
    [dashboard, dashboardError, refreshDashboard],
  );

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
}