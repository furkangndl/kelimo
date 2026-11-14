// Makes every word of YouTube's captions hoverable: pauses the video and shows the word's meaning in context.
(() => {
  const ext = globalThis.browser ?? globalThis.chrome;

  const CLOSE_DELAY_MS = 250;
  const WORD_PATTERN = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/u;

  const cache = new Map();
  let popup = null;
  let activeSpan = null;
  let closeTimer = null;
  let pausedByUs = false;
  let observedContainer = null;
  let observer = null;

  const video = () => document.querySelector('video.html5-main-video');
  const player = () => document.getElementById('movie_player');

  function currentSentence() {
    return Array.from(document.querySelectorAll('.ytp-caption-segment'))
      .map((segment) => segment.textContent)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function cleanWord(text) {
    const match = text.match(WORD_PATTERN);
    return match ? match[0].replace(/^['’-]+|['’-]+$/g, '') : '';
  }

  function wrapSegment(segment) {
    if (segment.querySelector('.supsf-w')) {
      return;
    }

    const parts = segment.textContent.split(/(\s+)/);
    segment.textContent = '';

    for (const part of parts) {
      if (cleanWord(part)) {
        const span = document.createElement('span');
        span.className = 'supsf-w';
        span.textContent = part;
        segment.appendChild(span);
      } else {
        segment.appendChild(document.createTextNode(part));
      }
    }
  }

  function wrapAllSegments() {
    document.querySelectorAll('.ytp-caption-segment').forEach(wrapSegment);
  }

  function pauseVideo() {
    const element = video();
    if (element && !element.paused) {
      element.pause();
      pausedByUs = true;
    }
  }

  function resumeVideo() {
    const element = video();
    if (element && pausedByUs) {
      element.play();
    }
    pausedByUs = false;
  }

  function removePopup() {
    clearTimeout(closeTimer);
    popup?.remove();
    popup = null;
    activeSpan = null;
  }

  function closePopup() {
    removePopup();
    resumeVideo();
  }

  function scheduleClose() {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(closePopup, CLOSE_DELAY_MS);
  }

  function cancelClose() {
    clearTimeout(closeTimer);
  }

  function lookup(word, sentence) {
    const key = `${word}|${sentence}`;
    if (!cache.has(key)) {
      cache.set(
        key,
        ext.runtime.sendMessage({ type: 'TRANSLATE', word, sentence }).catch(() => ({ ok: false, error: 'network' })),
      );
    }
    return cache.get(key);
  }

  function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) {
      element.className = className;
    }
    if (text) {
      element.textContent = text;
    }
    return element;
  }

  function positionPopup(span) {
    const host = player().getBoundingClientRect();
    const rect = span.getBoundingClientRect();
    popup.style.left = `${rect.left + rect.width / 2 - host.left}px`;
    popup.style.top = `${rect.top - host.top - 8}px`;
  }

  async function saveFrom(word, meaning, button) {
    const result = await ext.runtime.sendMessage({ type: 'SAVE', word, meaning });
    if (result?.ok) {
      button.textContent = 'Kaydedildi ✓';
      button.disabled = true;
    } else {
      button.textContent = 'Kaydedilemedi';
    }
  }

  async function showPopup(span) {
    const word = cleanWord(span.textContent);
    if (!word) {
      return;
    }

    removePopup();
    activeSpan = span;
    pauseVideo();

    popup = makeElement('div', 'supsf-popup');
    popup.appendChild(makeElement('span', 'supsf-word', word));
    popup.appendChild(makeElement('div', 'supsf-meaning', '…'));
    popup.addEventListener('mouseenter', cancelClose);
    popup.addEventListener('mouseleave', scheduleClose);
    for (const type of ['click', 'mousedown', 'dblclick']) {
      popup.addEventListener(type, (event) => event.stopPropagation());
    }
    player().appendChild(popup);
    positionPopup(span);

    const result = await lookup(word, currentSentence());
    if (!popup || activeSpan !== span) {
      return;
    }

    const meaningElement = popup.querySelector('.supsf-meaning');

    if (!result?.ok) {
      meaningElement.textContent = result?.error === 'not_logged_in' ? 'Önce giriş yapmalısın.' : 'Anlam alınamadı.';
      if (result?.error === 'not_logged_in') {
        const login = makeElement('button', '', 'Giriş yap');
        login.addEventListener('click', () => ext.runtime.sendMessage({ type: 'LOGIN' }));
        popup.appendChild(login);
      }
      return;
    }

    const { meaning, pos } = result.data;
    if (pos) {
      popup.querySelector('.supsf-word').after(makeElement('span', 'supsf-pos', pos));
    }
    meaningElement.textContent = meaning || 'Anlam bulunamadı.';

    if (meaning) {
      const button = makeElement('button', '', 'Kaydet');
      button.addEventListener('click', () => saveFrom(word, meaning, button));
      popup.appendChild(button);
      span.dataset.supsfMeaning = meaning;
    }
  }

  function onMouseOver(event) {
    const span = event.target.closest?.('.supsf-w');
    if (!span || span === activeSpan) {
      if (span) {
        cancelClose();
      }
      return;
    }
    showPopup(span);
  }

  function onMouseOut(event) {
    if (event.target.closest?.('.supsf-w')) {
      scheduleClose();
    }
  }

  function onClick(event) {
    const span = event.target.closest?.('.supsf-w');
    if (!span) {
      return;
    }
    event.stopPropagation();
    event.preventDefault();
    popup?.querySelector('button:not([disabled])')?.click();
  }

  function attach(container) {
    observer?.disconnect();
    observedContainer = container;
    observer = new MutationObserver(wrapAllSegments);
    observer.observe(container, { childList: true, subtree: true, characterData: true });
    wrapAllSegments();

    container.addEventListener('mouseover', onMouseOver);
    container.addEventListener('mouseout', onMouseOut);
    container.addEventListener('click', onClick, true);
    container.addEventListener('mousedown', (event) => {
      if (event.target.closest?.('.supsf-w')) {
        event.stopPropagation();
      }
    });
  }

  // YouTube is a single-page app: re-attach whenever the player's caption container is replaced.
  setInterval(() => {
    const container = document.querySelector('.ytp-caption-window-container');
    if (container && container !== observedContainer) {
      attach(container);
    }
  }, 1000);
})();
