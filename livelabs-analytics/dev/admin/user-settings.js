(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let csrf = '';
  let sessionTimer;

  function status(message) {
    $('status').textContent = message;
  }

  function scheduleExpiry(expires) {
    clearTimeout(sessionTimer);
    sessionTimer = setTimeout(() => location.replace('/admin'), Math.max(0, expires * 1000 - Date.now()));
  }

  async function api(path, body) {
    const response = await fetch('/api/admin/' + path, body ? {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
      body: JSON.stringify(body)
    } : {});
    const expiry = Number(response.headers.get('X-Session-Expires'));
    if (Number.isFinite(expiry) && expiry > 0) scheduleExpiry(expiry);
    if (response.status === 401) {
      location.replace('/admin');
      throw new Error('Session expired.');
    }
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Request failed.');
    return data;
  }

  $('password-form').addEventListener('submit', async event => {
    event.preventDefault();
    const button = event.submitter || event.currentTarget.querySelector('[type="submit"]');
    button.disabled = true;
    const endLoading = window.LiveLabsLoading.begin('Updating account password…');
    try {
      await api('password', Object.fromEntries(new FormData(event.currentTarget)));
      status('Password changed. Sign in with the new password.');
      location.replace('/admin');
    } catch (error) {
      status(error.message);
      window.LiveLabsLoading.fail('Password could not be changed.');
    } finally {
      button.disabled = false;
      endLoading();
    }
  });

  (async () => {
    try {
      const session = await api('session');
      csrf = session.csrf;
      $('identity').textContent = `Signed in as ${session.username} · session expires ${new Date(session.idleExpires * 1000).toLocaleString()}`;
      $('session-info').textContent = `${session.remembered ? 'Remembered session' : 'Temporary session'} · expires ${new Date(session.idleExpires * 1000).toLocaleString()} unless you sign in again.`;
      window.LiveLabsLoading.ready();
    } catch (error) {
      status(error.message);
      window.LiveLabsLoading.fail('User settings could not be loaded.');
    }
  })();
})();
