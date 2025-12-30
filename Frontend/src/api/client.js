import axios from "axios";
import { supabase } from "../supabaseClient";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
