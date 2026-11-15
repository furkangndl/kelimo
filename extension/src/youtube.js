// Makes every word of YouTube's captions hoverable: pauses the video and shows the word's meaning in context.
(() => {
  const ext = globalThis.browser ?? globalThis.chrome;

  const CLOSE_DELAY_MS = 250;
  const WORD_PATTERN = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/u;

  const cache = new Map();
  /** Saved words of the user: lowercase word -> [{ id, meaning }]. */
  const saved = new Map();
  let busy = false;
  let activeSentence = '';
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

  const spanWord = (span) => span.dataset.phrase || cleanWord(span.textContent);

  function markSpan(span) {
    span.classList.toggle('supsf-saved', saved.has(spanWord(span).toLowerCase()));
  }

  function refreshMarks() {
    document.querySelectorAll('.supsf-w').forEach(markSpan);
  }

  async function loadSaved() {
    const result = await ext.runtime.sendMessage({ type: 'SAVED_LIST' }).catch(() => null);
    if (!result?.ok) {
      return;
    }
    saved.clear();
    for (const item of result.data.data) {
      const key = item.word.toLowerCase();
      if (!saved.has(key)) {
        saved.set(key, []);
      }
      saved.get(key).push({ id: item.id, meaning: item.meaning });
    }
    refreshMarks();
  }

  const PHRASES = globalThis.KELIMO_PHRASES ?? new Set();
  const MAX_PHRASE_WORDS = 6;
  const IRREGULAR = {
    was: 'be', were: 'be', been: 'be', am: 'be', is: 'be', are: 'be', had: 'have', has: 'have', did: 'do', does: 'do', done: 'do',
    went: 'go', gone: 'go', goes: 'go', gave: 'give', given: 'give', took: 'take', taken: 'take', made: 'make', came: 'come',
    got: 'get', gotten: 'get', saw: 'see', seen: 'see', knew: 'know', known: 'know', thought: 'think', brought: 'bring',
    bought: 'buy', caught: 'catch', taught: 'teach', told: 'tell', said: 'say', found: 'find', felt: 'feel', kept: 'keep',
    left: 'leave', meant: 'mean', met: 'meet', paid: 'pay', ran: 'run', sat: 'sit', stood: 'stand', understood: 'understand',
    wrote: 'write', written: 'write', spoke: 'speak', spoken: 'speak', broke: 'break', broken: 'break', chose: 'choose',
    chosen: 'choose', drove: 'drive', driven: 'drive', ate: 'eat', eaten: 'eat', fell: 'fall', fallen: 'fall', flew: 'fly',
    grew: 'grow', grown: 'grow', hid: 'hide', hidden: 'hide', held: 'hold', lost: 'lose', rode: 'ride', rose: 'rise',
    risen: 'rise', sold: 'sell', sent: 'send', shook: 'shake', stole: 'steal', swam: 'swim', threw: 'throw', thrown: 'throw',
    woke: 'wake', wore: 'wear', worn: 'wear', won: 'win', built: 'build', dealt: 'deal', fought: 'fight', hung: 'hang',
    led: 'lead', lent: 'lend', laid: 'lay', slept: 'sleep', spent: 'spend', swept: 'sweep', torn: 'tear', tore: 'tear',
    began: 'begin', begun: 'begin', blew: 'blow', blown: 'blow', drew: 'draw', drawn: 'draw', drank: 'drink', sang: 'sing',
    shot: 'shoot', shut: 'shut', sank: 'sink', spun: 'spin', sprang: 'spring', struck: 'strike', swore: 'swear', woken: 'wake',
  };

  /** Possible base forms of a (verb) token, so "gave up" and "looking forward to" can match the listed "give up". */
  function baseForms(word) {
    const forms = new Set([word]);
    if (IRREGULAR[word]) forms.add(IRREGULAR[word]);
    const undouble = (stem) => (stem.length > 2 && stem.at(-1) === stem.at(-2) ? [stem, stem.slice(0, -1)] : [stem]);
    if (word.endsWith('ies')) forms.add(`${word.slice(0, -3)}y`);
    if (word.endsWith('ied')) forms.add(`${word.slice(0, -3)}y`);
    if (word.endsWith('es')) forms.add(word.slice(0, -2));
    if (word.endsWith('s')) forms.add(word.slice(0, -1));
    if (word.endsWith('ed')) {
      undouble(word.slice(0, -2)).forEach((stem) => forms.add(stem));
      forms.add(word.slice(0, -1));
    }
    if (word.endsWith('ing')) {
      const stem = word.slice(0, -3);
      undouble(stem).forEach((form) => forms.add(form));
      forms.add(`${stem}e`);
    }
    return forms;
  }

  /** Longest listed phrase starting at tokens[start]; returns how many tokens it spans (0 if none). */
  function phraseLength(tokens, start) {
    const limit = Math.min(MAX_PHRASE_WORDS, tokens.length - start);
    for (let length = limit; length >= 2; length--) {
      const slice = tokens.slice(start, start + length);
      // A comma or full stop inside means the words are not one expression.
      if (slice.slice(0, -1).some((token) => /[,.;:!?]$/.test(token.raw))) {
        continue;
      }
      const rest = slice.slice(1).map((token) => token.clean);
      for (const first of baseForms(slice[0].clean)) {
        if (PHRASES.has([first, ...rest].join(' '))) {
          return length;
        }
      }
    }
    return 0;
  }

  function makeWordSpan(text, phrase) {
    const span = document.createElement('span');
    span.className = 'supsf-w';
    span.textContent = text;
    if (phrase) {
      span.dataset.phrase = phrase;
    }
    markSpan(span);
    return span;
  }

  function wrapSegment(segment) {
    if (segment.querySelector('.supsf-w')) {
      return;
    }

    const parts = segment.textContent.split(/(\s+)/);
    const tokens = [];
    parts.forEach((part, index) => {
      const word = cleanWord(part);
      if (word) {
        tokens.push({ index, raw: part, word, clean: word.toLowerCase() });
      }
    });

    segment.textContent = '';
    let next = 0;
    for (let t = 0; t < tokens.length; t++) {
      const token = tokens[t];
      for (; next < token.index; next++) {
        segment.appendChild(document.createTextNode(parts[next]));
      }

      const length = phraseLength(tokens, t);
      if (length > 0) {
        const last = tokens[t + length - 1];
        const text = parts.slice(token.index, last.index + 1).join('');
        segment.appendChild(makeWordSpan(text, tokens.slice(t, t + length).map((item) => item.word).join(' ')));
        next = last.index + 1;
        t += length - 1;
      } else {
        segment.appendChild(makeWordSpan(token.raw));
        next = token.index + 1;
      }
    }
    for (; next < parts.length; next++) {
      segment.appendChild(document.createTextNode(parts[next]));
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

  function setHint(text) {
    const hint = popup?.querySelector('.supsf-hint');
    if (hint) {
      hint.textContent = text;
    }
  }

  function setSavedTag(isSaved) {
    popup?.querySelector('.supsf-saved-tag')?.remove();
    if (isSaved) {
      popup?.querySelector('.supsf-word').after(makeElement('span', 'supsf-pos supsf-saved-tag', 'kayıtlı'));
    }
  }

  async function showPopup(span) {
    const word = spanWord(span);
    if (!word) {
      return;
    }

    removePopup();
    activeSpan = span;
    activeSentence = currentSentence();
    pauseVideo();

    popup = makeElement('div', 'supsf-popup');
    popup.appendChild(makeElement('span', 'supsf-word', word));
    popup.appendChild(makeElement('div', 'supsf-meaning', '…'));
    popup.appendChild(makeElement('div', 'supsf-hint', ''));
    popup.addEventListener('mouseenter', cancelClose);
    popup.addEventListener('mouseleave', scheduleClose);
    for (const type of ['click', 'mousedown', 'dblclick']) {
      popup.addEventListener(type, (event) => event.stopPropagation());
    }
    player().appendChild(popup);
    positionPopup(span);

    const meaningElement = popup.querySelector('.supsf-meaning');
    const known = saved.get(word.toLowerCase());

    if (known) {
      meaningElement.textContent = known.map((entry) => entry.meaning).join(', ');
      setSavedTag(true);
      setHint('Tıkla: listeden çıkar');
      return;
    }

    const result = await lookup(word, activeSentence);
    if (!popup || activeSpan !== span) {
      return;
    }

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
    setHint(meaning ? 'Tıkla: kaydet' : '');
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

  async function onClick(event) {
    const span = event.target.closest?.('.supsf-w');
    if (!span) {
      return;
    }
    event.stopPropagation();
    event.preventDefault();

    const word = spanWord(span);
    const key = word.toLowerCase();
    if (!word || busy) {
      return;
    }

    busy = true;
    try {
      const known = saved.get(key);
      if (known) {
        const removed = await ext.runtime.sendMessage({ type: 'REMOVE', ids: known.map((entry) => entry.id) }).catch(() => null);
        if (removed?.ok) {
          saved.delete(key);
          refreshMarks();
          setSavedTag(false);
          setHint('Listeden çıkarıldı');
        } else {
          setHint('Çıkarılamadı');
        }
        return;
      }

      const result = await lookup(word, activeSentence || currentSentence());
      if (!result?.ok) {
        if (result?.error === 'not_logged_in') {
          ext.runtime.sendMessage({ type: 'LOGIN' });
        }
        setHint('Kaydedilemedi');
        return;
      }
      const { meaning } = result.data;
      if (!meaning) {
        setHint('Anlam bulunamadı');
        return;
      }

      const savedResult = await ext.runtime.sendMessage({ type: 'SAVE', word, meaning }).catch(() => null);
      if (savedResult?.ok) {
        saved.set(key, [{ id: savedResult.data?.data?.id, meaning }]);
        refreshMarks();
        setSavedTag(true);
        setHint('Kaydedildi ✓');
      } else {
        setHint('Kaydedilemedi');
      }
    } finally {
      busy = false;
    }
  }

  function attach(container) {
    observer?.disconnect();
    observedContainer = container;
    observer = new MutationObserver(wrapAllSegments);
    observer.observe(container, { childList: true, subtree: true, characterData: true });
    wrapAllSegments();
    loadSaved();

    container.addEventListener('mouseover', onMouseOver);
    container.addEventListener('mouseout', onMouseOut);
    container.addEventListener('click', onClick, true);
    container.addEventListener('mousedown', (event) => {
      if (event.target.closest?.('.supsf-w')) {
        event.stopPropagation();
      }
    });
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      loadSaved();
    }
  });

  // YouTube is a single-page app: re-attach whenever the player's caption container is replaced.
  setInterval(() => {
    const container = document.querySelector('.ytp-caption-window-container');
    if (container && container !== observedContainer) {
      attach(container);
    }
  }, 1000);
})();
