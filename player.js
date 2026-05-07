// ── Player — audio, playback controls, progress bar, library, theme, toast ──
(function () {
var APP = window.APP;
var audio = APP.audio;

// ── DOM refs ──
var playBtn        = document.getElementById('playBtn');
var playIcon       = document.getElementById('playIcon');
var progressFill   = document.getElementById('progressFill');
var progressThumb  = document.getElementById('progressThumb');
var progressWrap   = document.getElementById('progressWrap');
var currentTimeEl  = document.getElementById('currentTime');
var totalTimeEl    = document.getElementById('totalTime');
var coverWrap      = document.getElementById('coverWrap');
var ambient        = document.getElementById('ambient');
var bookTitle      = document.getElementById('bookTitle');
var toast          = document.getElementById('toast');

// ── Helpers (shared via APP) ──
APP.fmt = function (s) {
  s = Math.floor(s || 0);
  var h = Math.floor(s / 3600);
  var m = Math.floor((s % 3600) / 60);
  var sec = s % 60;
  return h > 0
    ? h + ':' + String(m).padStart(2,'0') + ':' + String(sec).padStart(2,'0')
    : m + ':' + String(sec).padStart(2,'0');
};

APP.fmtTs = function (s) {
  s = Math.floor(s || 0);
  return [Math.floor(s/3600), Math.floor((s%3600)/60), s%60]
    .map(function (n) { return String(n).padStart(2,'0'); }).join(':');
};

APP.escHtml = function (s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
};

// ── Toast (shared via APP) ──
var toastTimer;
APP.showToast = function (msg, type) {
  clearTimeout(toastTimer);
  toast.textContent = msg;
  toast.className   = 'toast visible' + (type ? ' ' + type : '');
  toastTimer = setTimeout(function () { toast.classList.remove('visible'); }, type === 'error' ? 4000 : 2500);
};

// ── Audio Player ──
document.getElementById('fileInput').addEventListener('change', async function (e) {
  var file = e.target.files[0];
  if (!file) return;
  closeLibraryModal();
  audio.src = URL.createObjectURL(file);
  audio.load();
  var name = file.name.replace(/\.(mp3|m4a|m4b|wav|ogg|flac|aac)$/i, '').replace(/[-_]/g, ' ');
  bookTitle.textContent = name;
  document.getElementById('bookAuthor').textContent = 'Local file';
  ambient.classList.add('active');
  APP.setCurrentBook(name);
  APP.renderProgressMarkers();
});

audio.addEventListener('loadedmetadata', function () {
  totalTimeEl.textContent = APP.fmt(audio.duration);
  APP.duration = audio.duration;
  if (APP.renderProgressMarkers) APP.renderProgressMarkers();
});

audio.addEventListener('timeupdate', function () {
  var pct = (audio.currentTime / audio.duration) * 100 || 0;
  progressFill.style.width = pct + '%';
  progressThumb.style.left = pct + '%';
  currentTimeEl.textContent = APP.fmt(audio.currentTime);
});

audio.addEventListener('play', function () {
  playIcon.innerHTML = '<path d="M6 4h4v16H6zM14 4h4v16h-4z"/>';
  coverWrap.classList.add('playing');
  if (APP.startListening) APP.startListening();
});

audio.addEventListener('pause', function () {
  playIcon.innerHTML = '<path d="M8 5.14v14l11-7-11-7z"/>';
  coverWrap.classList.remove('playing');
  // Only stop if passively listening; let an active capture complete
  if (APP.srState === 'listening' && APP.stopListening) APP.stopListening();
});

audio.addEventListener('error', function () {
  var code = audio.error ? audio.error.code : 0;
  var msg  = code === 4 ? 'Could not load — check the URL or try another source'
           : code === 3 ? 'Audio decoding error'
           : 'Failed to load audio';
  APP.showToast(msg, 'error');
  bookTitle.textContent = 'Load an audiobook to begin';
  document.getElementById('bookAuthor').textContent = 'tap "Open File" or "Load URL" above';
  ambient.classList.remove('active');
  coverWrap.classList.remove('playing');
  playIcon.innerHTML = '<path d="M8 5.14v14l11-7-11-7z"/>';
});

audio.addEventListener('ended', function () {
  playIcon.innerHTML = '<path d="M8 5.14v14l11-7-11-7z"/>';
  coverWrap.classList.remove('playing');
  if (APP.stopListening) APP.stopListening();
});

playBtn.addEventListener('click', function () { if (audio.src) audio.paused ? audio.play() : audio.pause(); });
document.getElementById('skipBackBtn').addEventListener('click', function () { audio.currentTime = Math.max(0, audio.currentTime - 15); });
document.getElementById('skipFwdBtn').addEventListener('click', function () { audio.currentTime = audio.currentTime + 30; });

progressWrap.addEventListener('click', function (e) {
  if (!audio.duration) return;
  var rect = progressWrap.getBoundingClientRect();
  audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
});

// ── Library ──
var LIBRARY = [
  {
    label: 'Alice in Wonderland',
    initial: 'A',
    color: '#4a8fa8',
    url: 'https://ia601400.us.archive.org/13/items/alicesadventuresinwonderland_1902_librivox/alicesadventuresinwonderland_01_carroll_64kb.mp3',
    title: "Alice's Adventures in Wonderland — Ch. 1",
    author: 'Lewis Carroll · LibriVox',
    meta: 'Ch. 1  ·  ~12 min'
  },
  {
    label: 'Pride & Prejudice',
    initial: 'P',
    color: '#9b6b8c',
    url: 'https://ia601308.us.archive.org/4/items/pride_prejudice_1102_librivox/prideandprejudice_01_austen_64kb.mp3',
    title: 'Pride and Prejudice — Ch. 1',
    author: 'Jane Austen · LibriVox',
    meta: 'Ch. 1  ·  ~6 min'
  },
  {
    label: 'Sherlock Holmes',
    initial: 'S',
    color: '#4e6e80',
    url: 'https://ia600209.us.archive.org/11/items/adventures_sherlock_holmes_rg_librivox/adventuresholmes_01_doyle_64kb.mp3',
    title: 'Adventures of Sherlock Holmes — Ch. 1',
    author: 'Arthur Conan Doyle · LibriVox',
    meta: 'Ch. 1  ·  ~38 min'
  },
  {
    label: 'Wizard of Oz',
    initial: 'W',
    color: '#7a8c3a',
    url: 'https://ia600403.us.archive.org/1/items/wizardofoz_1712_librivox/wonderfulwizardofoz_01_baum_64kb.mp3',
    title: 'The Wonderful Wizard of Oz — Ch. 1',
    author: 'L. Frank Baum · LibriVox',
    meta: 'Ch. 1  ·  ~8 min'
  },
  {
    label: 'Treasure Island',
    initial: 'T',
    color: '#8a4a3c',
    url: 'https://ia601602.us.archive.org/26/items/treasureisland_librivox/treasure_island_01-02_stevenson_64kb.mp3',
    title: 'Treasure Island — Ch. 1–2',
    author: 'Robert Louis Stevenson · LibriVox',
    meta: 'Ch. 1–2  ·  ~18 min'
  }
];

function loadBook(book) {
  audio.src = book.url;
  audio.load();
  bookTitle.textContent = book.title;
  document.getElementById('bookAuthor').textContent = book.author;
  ambient.classList.add('active');
  APP.setCurrentBook(book.title);
  APP.showToast('Loading audio…');
}

var libraryModalBg = document.getElementById('libraryModalBg');
var libraryGrid    = document.getElementById('libraryGrid');

LIBRARY.forEach(function (book) {
  var card = document.createElement('div');
  card.className = 'book-card';
  card.innerHTML =
    '<div class="book-cover-mini" style="background:' + book.color + '">' + book.initial + '</div>' +
    '<div class="book-card-info">' +
      '<div class="book-card-title">' + book.label + '</div>' +
      '<div class="book-card-author">' + book.author.split('·')[0].trim() + '</div>' +
      '<div class="book-card-meta">' + book.meta + '</div>' +
    '</div>';
  card.addEventListener('click', function () {
    loadBook(book);
    closeLibraryModal();
  });
  libraryGrid.appendChild(card);
});

function openLibraryModal() {
  libraryModalBg.classList.add('open');
  setTimeout(function () { document.getElementById('urlInput').value = ''; }, 0);
}
function closeLibraryModal() { libraryModalBg.classList.remove('open'); }

document.getElementById('libraryBtn').addEventListener('click', openLibraryModal);
libraryModalBg.addEventListener('click', function (e) { if (e.target === libraryModalBg) closeLibraryModal(); });

// URL load inside library
var urlInput = document.getElementById('urlInput');
document.getElementById('urlLoadBtn').addEventListener('click', function () {
  var url = urlInput.value.trim();
  if (!url) return;
  var rawName = decodeURIComponent(url.split('/').pop().replace(/\.\w+$/, '').replace(/[-_]/g, ' '));
  var displayName = rawName || 'Remote Audio';
  audio.src = url;
  audio.load();
  bookTitle.textContent = displayName;
  document.getElementById('bookAuthor').textContent = 'Remote URL';
  ambient.classList.add('active');
  APP.setCurrentBook(displayName);
  closeLibraryModal();
  APP.showToast('Loading audio…');
});
urlInput.addEventListener('keydown', function (e) {
  if (e.key === 'Enter')  document.getElementById('urlLoadBtn').click();
  if (e.key === 'Escape') closeLibraryModal();
});

// ── Theme Toggle ──
var themeToggleBtn = document.getElementById('themeToggleBtn');
var themeIcon      = document.getElementById('themeIcon');
var ICON_SUN  = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
var ICON_MOON = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';

function applyTheme(theme, animate) {
  if (animate) {
    document.documentElement.classList.add('theme-transition');
    setTimeout(function () { document.documentElement.classList.remove('theme-transition'); }, 300);
  }
  document.documentElement.setAttribute('data-theme', theme);
  themeIcon.innerHTML = theme === 'dark' ? ICON_SUN : ICON_MOON;
  themeToggleBtn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
}

var savedTheme = localStorage.getItem('audiobook_theme') || 'dark';
applyTheme(savedTheme, false);

themeToggleBtn.addEventListener('click', function () {
  var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  localStorage.setItem('audiobook_theme', next);
  applyTheme(next, true);
});

})();
