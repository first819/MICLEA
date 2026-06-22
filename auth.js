import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const SUPABASE_URL  = 'https://YOUR_PROJECT.supabase.co'  // TODO: replace
const SUPABASE_ANON = 'YOUR_ANON_KEY'                     // TODO: replace
const DASHBOARD_URL = '/dashboard'                         // TODO: replace when app route is known

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)

document.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session) {
    window.location.replace(DASHBOARD_URL)
  }
})
