const ext = globalThis.browser ?? globalThis.chrome;
const title = document.getElementById('title');
const sub = document.getElementById('sub');
const primary = document.getElementById('primary');
const signOut = document.getElementById('signout');

ext.runtime.sendMessage({ type: 'STATUS' }).then(({ loggedIn, panelUrl }) => {
  if (loggedIn) {
    title.textContent = 'Giriş yapıldı';
    sub.textContent = 'Kelimeleri panelde bulabilirsin.';
    primary.textContent = 'Kelimelerimi aç';
    primary.onclick = () => ext.tabs.create({ url: `${panelUrl}/words` });
    signOut.hidden = false;
    signOut.onclick = async () => {
      await ext.runtime.sendMessage({ type: 'SIGN_OUT' });
      window.close();
    };
  } else {
    title.textContent = 'Giriş yapmadın';
    sub.textContent = 'Kelime kaydetmek için giriş yap.';
    primary.textContent = 'Giriş yap';
    primary.onclick = () => ext.runtime.sendMessage({ type: 'LOGIN' });
  }
});
