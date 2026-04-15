// =============================================
// supabase.js — Configuração compartilhada
// Importe este arquivo em todas as páginas
// =============================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// ⚠️ SUBSTITUA com os dados do seu projeto Supabase
// Acesse: https://supabase.com → Seu projeto → Settings → API
const SUPABASE_URL = 'https://ibtstncpcihidcggxrts.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ZdMGWJXAc1nE6VFP6EfK4Q_h-HTaKMq';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);