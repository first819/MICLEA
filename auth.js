// Load with <script type="module" src="auth.js">
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.8/+esm'

const SUPABASE_URL  = 'https://YOUR_PROJECT.supabase.co'  // TODO: replace
const SUPABASE_ANON = 'YOUR_ANON_KEY'                     // TODO: replace — app will silently fail auth calls until this is set
const DASHBOARD_URL = '/dashboard'                         // TODO: replace when app route is known

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)

document.addEventListener('DOMContentLoaded', async () => {
  const { data, error } = await supabase.auth.getSession()
  if (error) { console.error('auth check failed', error); return; }
  if (data?.session) {
    window.location.replace(DASHBOARD_URL)
  }
})
