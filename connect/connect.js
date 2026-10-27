// Bundled with the app's pinned Supabase SDK at deployment; never loads remote executable code.
import { createClient } from '@supabase/supabase-js';
const element = (id) => document.getElementById(id);
const pendingKey = 'staytoned-mcp-consent';
async function start() {
  if (window.top !== window.self) return;
  const configResponse = await fetch('/connect/config.json', { cache: 'no-store' });
  if (!configResponse.ok) return;
  const config = await configResponse.json();
  const current = new URL(location.href);
  let params;
  if (current.searchParams.has('client_id')) {
    params = current.searchParams;
    sessionStorage.setItem(pendingKey, params.toString());
    history.replaceState(null, '', '/connect/');
  } else {
    params = new URLSearchParams(sessionStorage.getItem(pendingKey) ?? '');
  }
  const response = await fetch(`${config.oauthUrl}/consent-info?${params}`, { cache: 'no-store' });
  if (!response.ok) {
    element('validation').textContent = 'Open a new connection request from your assistant.';
    return;
  }
  const info = await response.json();
  element('client-name').textContent = `${info.client_name} wants to connect to StayToned.`;
  const supabase = createClient(config.supabaseUrl, config.publishableKey, {
    auth: {
      flowType: 'pkce',
      storage: sessionStorage,
      storageKey: 'staytoned-mcp-sign-in',
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
  const update = (session) => {
    const signedIn = session && !session.user.is_anonymous && session.user.email_confirmed_at;
    element('sign-in').hidden = Boolean(signedIn);
    element('consent').hidden = !signedIn;
    element('account').textContent = signedIn ? `Signed in as ${session.user.email}` : '';
  };
  supabase.auth.onAuthStateChange((_event, session) => update(session));
  update((await supabase.auth.getSession()).data.session);
  element('deny').hidden = false;
  const run = async (button, action) => {
    button.disabled = true;
    element('validation').textContent = '';
    try {
      await action();
    } catch {
      /* Do not log sessions, parameters, or provider errors. */
    } finally {
      button.disabled = false;
    }
  };
  for (const provider of ['google', 'apple'])
    element(provider).onclick = () =>
      run(element(provider), async () => {
        await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: `${location.origin}/connect/` } });
      });
  element('password-form').onsubmit = (event) => {
    event.preventDefault();
    const button = event.currentTarget.querySelector('button');
    void run(button, async () => {
      const { error } = await supabase.auth.signInWithPassword({
        email: element('email').value,
        password: element('password').value,
      });
      element('password').value = '';
      if (error) element('validation').textContent = 'Check your email and password, then sign in again.';
    });
  };
  element('change-account').onclick = () =>
    run(element('change-account'), () => supabase.auth.signOut({ scope: 'local' }));
  for (const decision of ['approve', 'deny'])
    element(decision).onclick = () =>
      run(element(decision), async () => {
        const session = (await supabase.auth.getSession()).data.session;
        const body = new URLSearchParams(params);
        body.set('decision', decision);
        const response = await fetch(`${config.oauthUrl}/consent`, {
          method: 'POST',
          body,
          headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
        });
        if (!response.ok) return;
        const result = await response.json();
        const destination = new URL(result.redirect);
        const expected = new URL(params.get('redirect_uri'));
        if (destination.origin !== expected.origin || destination.pathname !== expected.pathname) return;
        sessionStorage.removeItem(pendingKey);
        await supabase.auth.signOut({ scope: 'local' });
        location.assign(destination.href);
      });
}
void start().catch(() => {});
