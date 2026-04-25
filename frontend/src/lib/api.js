import axios from "axios";

const BASE = process.env.REACT_APP_BACKEND_URL;

export const api = axios.create({
  baseURL: `${BASE}/api`,
  withCredentials: true,
});

// Attach token from localStorage as fallback (cookies are primary)
api.interceptors.request.use((config) => {
  const t = localStorage.getItem("lc_token");
  if (t && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${t}`;
  }
  return config;
});

export function formatErr(detail) {
  if (detail == null) return "Something went wrong.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}
