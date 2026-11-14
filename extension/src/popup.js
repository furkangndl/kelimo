const ext = globalThis.browser ?? globalThis.chrome;
const status = document.getElementById('status');
const primary = document.getElementById('primary');
const signOut = document.getElementById('signout');

ext.runtime.sendMessage({ type: 'STATUS' }).then(({ loggedIn, panelUrl }) => {
  if (loggedIn) {
    status.textContent = 'Giriş yapıldı.';
    primary.textContent = 'Kelimelerimi aç';
    primary.onclick = () => ext.tabs.create({ url: `${panelUrl}/words` });
    signOut.hidden = false;
    signOut.onclick = async () => {
      await ext.runtime.sendMessage({ type: 'SIGN_OUT' });
      window.close();
    };
  } else {
    status.textContent = 'Giriş yapmadın.';
    primary.textContent = 'Giriş yap';
    primary.onclick = () => ext.runtime.sendMessage({ type: 'LOGIN' });
  }
});
