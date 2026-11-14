// Runs only on the panel origin: forwards the login token from the page to the extension.
const ext = globalThis.browser ?? globalThis.chrome;

window.addEventListener('message', (event) => {
  if (event.source !== window || event.origin !== window.location.origin || !event.data) {
    return;
  }

  if (event.data.type === 'SUPSF_AUTH' && typeof event.data.token === 'string') {
    ext.runtime.sendMessage({ type: 'AUTH', token: event.data.token });
  } else if (event.data.type === 'SUPSF_LOGOUT') {
    ext.runtime.sendMessage({ type: 'LOGOUT' });
  }
});
