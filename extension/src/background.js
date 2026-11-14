importScripts('config.js');

const ext = globalThis.browser ?? globalThis.chrome;
const { apiBase, panelUrl } = globalThis.SUPSF_CONFIG;

const MENU_ID = 'supsf-save-word';

async function getToken() {
  const { token } = await ext.storage.local.get('token');
  return token || null;
}

async function api(path, options = {}) {
  const token = await getToken();
  if (!token) {
    return { ok: false, error: 'not_logged_in' };
  }

  try {
    const response = await fetch(`${apiBase}${path}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 401) {
      await ext.storage.local.remove('token');
      return { ok: false, error: 'not_logged_in' };
    }
    if (!response.ok) {
      return { ok: false, error: 'request_failed' };
    }

    return { ok: true, data: response.status === 204 ? null : await response.json() };
  } catch {
    return { ok: false, error: 'network' };
  }
}

function translate(word, sentence) {
  const query = new URLSearchParams({ word });
  if (sentence) {
    query.set('sentence', sentence);
  }
  return api(`/translate?${query}`);
}

function saveWord(word, meaning) {
  return api('/words', { method: 'POST', body: JSON.stringify({ word, meaning }) });
}

function openLogin() {
  return ext.tabs.create({ url: `${panelUrl}/login?ext=1` });
}

/** Runs inside the page: returns the sentence that contains the current selection. */
function pageSelectionSentence() {
  const selection = window.getSelection();
  const selected = selection ? selection.toString().trim() : '';
  const text = selection && selection.anchorNode ? selection.anchorNode.textContent || '' : '';
  const index = text.indexOf(selected);

  if (!selected || index < 0) {
    return selected;
  }

  const before = Math.max(text.lastIndexOf('.', index - 1), text.lastIndexOf('!', index - 1), text.lastIndexOf('?', index - 1));
  const afterCandidates = ['.', '!', '?']
    .map((mark) => text.indexOf(mark, index + selected.length))
    .filter((position) => position >= 0);
  const end = afterCandidates.length ? Math.min(...afterCandidates) + 1 : text.length;

  return text.slice(before + 1, end).trim().slice(0, 500);
}

/** Runs inside the page: shows a short message. */
function pageToast(message) {
  const element = document.createElement('div');
  element.textContent = message;
  Object.assign(element.style, {
    position: 'fixed',
    right: '16px',
    bottom: '16px',
    zIndex: '2147483647',
    padding: '10px 14px',
    background: '#111827',
    color: '#fff',
    font: '14px system-ui, sans-serif',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,.3)',
  });
  document.documentElement.appendChild(element);
  setTimeout(() => element.remove(), 3000);
}

function toast(tabId, message) {
  return ext.scripting.executeScript({ target: { tabId }, func: pageToast, args: [message] }).catch(() => {});
}

async function saveSelection(info, tab) {
  const word = (info.selectionText || '').trim();
  if (!word || !tab?.id) {
    return;
  }

  if (!(await getToken())) {
    await toast(tab.id, 'Kaydetmek için önce giriş yap.');
    await openLogin();
    return;
  }

  const [{ result: sentence } = {}] = await ext.scripting
    .executeScript({ target: { tabId: tab.id }, func: pageSelectionSentence })
    .catch(() => []);

  const translated = await translate(word, sentence);
  if (!translated.ok || !translated.data.meaning) {
    await toast(tab.id, 'Anlam bulunamadı.');
    return;
  }

  const saved = await saveWord(word, translated.data.meaning);
  await toast(tab.id, saved.ok ? `Kaydedildi: ${word} → ${translated.data.meaning}` : 'Kaydedilemedi.');
}

ext.runtime.onInstalled.addListener(() => {
  ext.contextMenus.create({ id: MENU_ID, title: 'Kelimo’ya kaydet: “%s”', contexts: ['selection'] });
});

ext.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === MENU_ID) {
    saveSelection(info, tab);
  }
});

ext.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const respond = (promise) => {
    promise.then(sendResponse);
    return true;
  };

  switch (message.type) {
    case 'AUTH':
      // Only accept tokens handed over by the panel origin.
      if (sender.url && new URL(sender.url).origin === new URL(panelUrl).origin) {
        return respond(ext.storage.local.set({ token: message.token }).then(() => ({ ok: true })));
      }
      return false;
    case 'LOGOUT':
      if (sender.url && new URL(sender.url).origin === new URL(panelUrl).origin) {
        return respond(ext.storage.local.remove('token').then(() => ({ ok: true })));
      }
      return false;
    case 'TRANSLATE':
      return respond(translate(message.word, message.sentence));
    case 'SAVE':
      return respond(saveWord(message.word, message.meaning));
    case 'LOGIN':
      return respond(openLogin().then(() => ({ ok: true })));
    case 'STATUS':
      return respond(getToken().then((token) => ({ loggedIn: !!token, panelUrl })));
    case 'SIGN_OUT':
      return respond(ext.storage.local.remove('token').then(() => ({ ok: true })));
    default:
      return false;
  }
});
