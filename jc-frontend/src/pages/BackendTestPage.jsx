import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Compass, Server } from "lucide-react";
import apiClient, { getApiErrorMessage, unwrapApiResponse } from "../services/apiClient";

export default function BackendTestPage() {
  const [apiData, setApiData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const fetchBackendData = async () => {
      try {
        const response = await apiClient.get("/regions");
        if (active) {
          setApiData(unwrapApiResponse(response));
          setError("");
        }
      } catch (requestError) {
        if (active) {
          setError(getApiErrorMessage(requestError, "백엔드 연결에 실패했습니다."));
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchBackendData();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-[#F0F8FF]">
      <div className="w-full max-w-md p-6 bg-white rounded-2xl shadow-xl">
        <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Compass className="text-[#00D2D3] w-6 h-6" />
            <span className="font-bold text-lg text-[#004753]">Journey Connect</span>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-2 text-[#004753] font-bold text-xl">
            <Server className="w-5 h-5" />
            <h2>백엔드 연동 상태</h2>
          </div>

          {loading && (
            <div className="p-4 bg-slate-50 rounded-xl text-center text-sm text-slate-500 animate-pulse">
              백엔드 응답을 기다리는 중입니다.
            </div>
          )}

          {!loading && error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2.5 text-red-700">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
              <div className="text-sm">
                <p className="font-bold">연동 실패</p>
                <p className="text-xs text-red-500 mt-1">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && (
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-2.5 text-emerald-800">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-500" />
              <div className="text-sm">
                <p className="font-bold text-emerald-900">API 통신 정상</p>
                <p className="mt-1 text-slate-700 font-medium">
                  지역 데이터 {Array.isArray(apiData) ? apiData.length : 0}건을 받았습니다.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
