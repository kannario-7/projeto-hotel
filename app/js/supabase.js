// Conexão com o Supabase (backend do HospedaPrime).
// A URL e a anon key são públicas e seguras para o front-end;
// a proteção real dos dados vem das políticas RLS no banco.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const SUPABASE_URL = "https://bizfrksuwscosxutunfy.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpemZya3N1d3Njb3N4dXR1bmZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMjk4NzIsImV4cCI6MjEwMzgwNTg3Mn0.kRglbjmeLup0Tn7Nn5doFXMAtrsAYk25x3fZcoCdr5k";

// Mantem a sessao salva no navegador (localStorage) e renova o token sozinho,
// para o usuario continuar logado ao atualizar a pagina (F5).
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: "hospedaprime-auth",
    storage: window.localStorage
  }
});
