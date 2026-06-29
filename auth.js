// Load with <script type="module" src="auth.js">
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.8/+esm'

const SUPABASE_URL  = 'https://eezjeiitzvtduarviume.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlemplaWl0enZ0ZHVhcnZpdW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyOTg4MjAsImV4cCI6MjA5NTg3NDgyMH0.Z2JC8QufY-sVp9VoUg8j08RZjHgKnePWJSZkP8U6oFc'
const DASHBOARD_URL = '/dashboard'
const ONBOARDING_URL = '/onboarding'
const LOGIN_URL     = '/login'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000

// Redirect to dashboard if user is already logged in (used on login/signup pages)
export async function redirectIfLoggedIn() {
  const { data, error } = await supabase.auth.getUser()
  if (error) { return; }
  if (data?.user) {
    window.location.replace(DASHBOARD_URL)
  }
}

// Sign out and redirect to login page
export async function signOut() {
  await supabase.auth.signOut()
  window.location.replace(LOGIN_URL)
}

// Store the remember_until timestamp in Supabase user metadata
async function setRememberMe(checked) {
  const remember_until = checked ? Date.now() + THIRTY_DAYS : null
  await supabase.auth.updateUser({ data: { remember_until } })
}

// Returns true if the user's Supabase metadata has a valid remember_until
export async function isRemembered() {
  const { data } = await supabase.auth.getUser()
  const until = data?.user?.user_metadata?.remember_until ?? 0
  return until > Date.now()
}

// Attach signOut to any element with data-action="signout"
document.addEventListener('DOMContentLoaded', async () => {
  const isNewPasswordPage = !!document.getElementById('newPasswordBtn')
  if (!isNewPasswordPage) {
    await redirectIfLoggedIn()
  }

  document.querySelectorAll('[data-action="signout"]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault()
      signOut()
    })
  })

  // Wire up OAuth buttons (login + signup pages both have these)
  async function signInWithProvider(provider) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin + ONBOARDING_URL }
    })
    if (error) alert(error.message)
  }
  document.getElementById('googleBtn')?.addEventListener('click', () => signInWithProvider('google'))
  document.getElementById('appleBtn')?.addEventListener('click',  () => signInWithProvider('apple'))

  // Wire up login form if present
  const loginBtn = document.getElementById('loginBtn')
  if (loginBtn) {
    loginBtn.closest('form').addEventListener('submit', async e => {
      e.preventDefault()
      const email    = document.getElementById('email').value.trim()
      const password = document.getElementById('password').value
      const remember = document.getElementById('rememberMe')?.checked ?? false

      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { alert(error.message); return; }

      await setRememberMe(remember)
      window.location.replace(DASHBOARD_URL)
    })
  }

  // Wire up forgot-password form
  const resetPasswordBtn = document.getElementById('resetPasswordBtn')
  if (resetPasswordBtn) {
    resetPasswordBtn.closest('form').addEventListener('submit', async e => {
      e.preventDefault()
      const email = document.getElementById('email').value.trim()
      if (!email) { alert('Please enter your email'); return; }

      resetPasswordBtn.textContent = 'Sending…'
      resetPasswordBtn.disabled = true

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/new-password'
      })

      if (error) {
        alert(error.message)
        resetPasswordBtn.textContent = 'Send Reset Link'
        resetPasswordBtn.disabled = false
        return
      }

      // Send custom password reset email
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/send-password-reset-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON}`,
          },
          body: JSON.stringify({
            email: email,
            token: email,
          }),
        })
      } catch (emailError) {
        console.error('Email send failed:', emailError)
      }

      resetPasswordBtn.textContent = 'Send Reset Link'
      resetPasswordBtn.disabled = false

      document.getElementById('resetForm').style.display = 'none'
      document.querySelector('.headline').style.display = 'none'
      document.querySelector('.sub').style.display = 'none'
      document.getElementById('sentTo').textContent = email
      document.getElementById('successMsg').style.display = 'block'
    })
  }

  // Wire up new-password form
  const newPasswordBtn = document.getElementById('newPasswordBtn')
  if (newPasswordBtn) {
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Recovery session active — form is already visible, wait for submit
      }
    })

    newPasswordBtn.closest('form').addEventListener('submit', async e => {
      e.preventDefault()
      const pw      = document.getElementById('password').value
      const confirm = document.getElementById('confirm').value
      const err     = document.getElementById('matchError')

      if (pw !== confirm) {
        document.getElementById('confirm').classList.add('error')
        err.style.display = 'block'
        return
      }
      document.getElementById('confirm').classList.remove('error')
      err.style.display = 'none'

      newPasswordBtn.textContent = 'Saving…'
      newPasswordBtn.disabled = true

      const { error } = await supabase.auth.updateUser({ password: pw })

      newPasswordBtn.textContent = 'Save New Password'
      newPasswordBtn.disabled = false

      if (error) { alert(error.message); return; }

      const { data } = await supabase.auth.getUser()
      const email = data?.user?.email || ''

      document.getElementById('pageTitle').style.display = 'none'
      document.getElementById('pageSub').style.display = 'none'
      document.getElementById('newPwForm').style.display = 'none'
      document.getElementById('confirmedEmail').textContent = email
      document.getElementById('successState').style.display = 'block'
    })
  }

  // Wire up signup form if present
  const signupBtn = document.getElementById('signupBtn')
  if (signupBtn) {
    signupBtn.closest('form').addEventListener('submit', async e => {
      e.preventDefault()
      const name     = document.getElementById('name').value.trim()
      const email    = document.getElementById('email').value.trim()
      const password = document.getElementById('password').value
      const terms    = document.getElementById('terms').checked

      if (!name) { alert('Please enter your name'); return; }
      if (!email) { alert('Please enter your email'); return; }
      if (!password) { alert('Please enter a password'); return; }
      if (!terms) { alert('Please agree to the Terms & Privacy'); return; }

      signupBtn.textContent = 'Creating account…'
      signupBtn.disabled = true

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } }
      })

      if (error) { alert(error.message); signupBtn.textContent = 'Sign Up'; signupBtn.disabled = false; return; }

      // Send custom verification email
      if (data?.user?.id) {
        try {
          await fetch(`${SUPABASE_URL}/functions/v1/send-verification-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_ANON}`,
            },
            body: JSON.stringify({
              email: email,
              userId: data.user.id,
            }),
          })
        } catch (emailError) {
          console.error('Email send failed:', emailError)
        }
      }

      signupBtn.textContent = 'Sign Up'
      signupBtn.disabled = false
      alert('Account created! Please check your email to verify.')
      // Don't redirect yet - user must verify email first
    })
  }
})
