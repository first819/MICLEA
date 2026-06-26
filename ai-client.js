// Shared AI client for MICLEA feature pages.
// Load with <script type="module" src="ai-client.js"></script> BEFORE app-shell.js.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.8/+esm'

const SUPABASE_URL  = 'https://eezjeiitzvtduarviume.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlemplaWl0enZ0ZHVhcnZpdW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyOTg4MjAsImV4cCI6MjA5NTg3NDgyMH0.Z2JC8QufY-sVp9VoUg8j08RZjHgKnePWJSZkP8U6oFc'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)
window.miclSupabase = supabase

async function ai(fnName, body) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('not_signed_in')
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body ?? {}),
  })
  const out = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(out.error || `http_${res.status}`)
    err.status = res.status
    err.need = out.need
    throw err
  }
  return out
}

// Convenience: show an upgrade toast on a 403, generic toast otherwise.
function onAiError(e) {
  if (e.status === 403 && window.Miclea) {
    window.Miclea.toast(`Upgrade to ${e.need || 'Pro'} to use Micl AI`, 'err')
  } else if (window.Miclea) {
    window.Miclea.toast('Micl had trouble — try again', 'err')
  }
  console.error('[Micl AI]', e)
}

window.Micl = { ai, onAiError, supabase }
window.dispatchEvent(new Event('micl-ai-ready'))
