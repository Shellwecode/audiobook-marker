// ── Annotations — recording flow, annotation CRUD, drawer ──
(function () {
var APP = window.APP;
var audio = APP.audio;

// ── DOM refs ──
var addNoteBtn      = document.getElementById('addNoteBtn');
var srHint          = document.getElementById('srHint');
var listenIndicator = document.getElementById('listenIndicator');
var drawer          = document.getElementById('drawer');
var drawerHandle    = document.getElementById('drawerHandle');
var annotationsList = document.getElementById('annotationsList');
var annotationCount = document.getElementById('annotationCount');
var drawerEmpty     = document.getElementById('drawerEmpty');
var copyBtn         = document.getElementById('copyBtn');
var textModalBg     = document.getElementById('textModalBg');
var textNoteInput   = document.getElementById('textNoteInput');
var textModalTime   = document.getElementById('textModalTime');

// ── State ──
var ANNOTATIONS_KEY = 'audiobook_annotations_v2';
var allAnnotations  = JSON.parse(localStorage.getItem(ANNOTATIONS_KEY) || '{}');
var currentBookKey  = null;
var drawerOpen      = false;

// Recording state
var recording          = false;
var recordedTranscript = '';
var pendingInterim     = '';   // latest interim — committed on stop or SR restart
var capturedTs         = 0;
var recordingTimer  = null;
var recordingStart  = 0;
var autoStopTimeout = null;
var MAX_RECORDING   = 60000;

APP.srState = 'idle';

// ── Build recording UI dynamically (index.html is not edited) ──
var btnOriginalHTML = addNoteBtn.innerHTML;
var btnDoneHTML =
  '<svg width="13" height="13" viewBox="0 0 24 24" fill="none">' +
    '<path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' +
  '</svg> Done';

// Wrap button + recording indicator in a flex row
var recWrapper = document.createElement('div');
recWrapper.className = 'rec-wrapper';
addNoteBtn.parentNode.insertBefore(recWrapper, addNoteBtn);
recWrapper.appendChild(addNoteBtn);

var recIndicator = document.createElement('div');
recIndicator.className = 'rec-indicator';
recIndicator.innerHTML = '<div class="rec-dot"></div><span class="rec-timer">0:00</span>';
recWrapper.appendChild(recIndicator);

var recTimerEl = recIndicator.querySelector('.rec-timer');

// ── Per-book helpers ──
function getBookKey(title) {
  return title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'untitled';
}

APP.setCurrentBook = function (title) {
  currentBookKey = getBookKey(title);
  APP.annotations = (allAnnotations[currentBookKey] || []).slice().sort(function (a, b) { return a.ts - b.ts; });
  var el = document.getElementById('drawerBookName');
  if (el) el.textContent = title;
  renderAnnotations();
};

// ── Speech Recognition (wake phrase + recording + stop phrases) ──
var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
var srSupported = !!SR;
var srRunning = false;
var recognition = null;
var srHintOriginal = '';

// Wake-phrase pattern — loose enough for common SR mis-hearings
var WAKE_RE = /hey[,.\s]*note/i;

// Stop-phrase pattern — checked against both interim and final results
var STOP_RE = /^(i'?m\s+)?done$|^end\s+note$|^stop\s+recording$/;

// Commit whatever interim text is buffered into the transcript
function commitPending() {
  if (pendingInterim) {
    recordedTranscript += (recordedTranscript ? ' ' : '') + pendingInterim;
    pendingInterim = '';
  }
}

if (srSupported) {
  recognition = new SR();
  recognition.continuous     = true;
  recognition.interimResults = true;
  recognition.lang           = 'en-US';
  recognition.maxAlternatives = 3;   // check multiple guesses for wake phrase

  recognition.onstart = function () { srRunning = true; };

  recognition.onend = function () {
    srRunning = false;

    // When SR stops mid-recording (Chrome does this periodically),
    // the current interim is about to be lost — commit it now before
    // the new session starts from scratch.
    if (APP.srState === 'recording') commitPending();

    if (APP.srState === 'idle') return;
    // Keep restarting even when audio is paused — the user can still
    // voice-trigger "hey note" and record a note while paused.
    // Restart as fast as possible — every ms is a gap where speech is lost
    var delay = APP.srState === 'recording' ? 50 : 100;
    setTimeout(safeStart, delay);
  };

  recognition.onerror = function (e) {
    if (e.error === 'not-allowed' || e.error === 'audio-capture') {
      APP.srState = 'idle';
      updateListenIndicator();
      APP.showToast('Microphone permission denied', 'error');
    }
    // 'no-speech', 'network', 'aborted' → onend will fire and restart
  };

  recognition.onresult = function (e) {
    // ── Listening mode ──
    // Scan every result × every alternative for the wake phrase.
    // Checking interims reacts as soon as the browser has a rough
    // match; checking multiple alternatives catches cases where the
    // audiobook narration is ranked as alternative-0 and the user's
    // "hey note" is demoted to alternative-1 or -2.
    if (APP.srState === 'listening') {
      for (var i = e.resultIndex; i < e.results.length; i++) {
        for (var a = 0; a < e.results[i].length; a++) {
          if (WAKE_RE.test(e.results[i][a].transcript)) {
            startRecording();
            return;
          }
        }
      }
      return;
    }

    // ── Recording mode ──
    // Accumulate final results into the transcript.
    // Track the latest interim in pendingInterim so it can be
    // committed when the user stops (or when SR restarts).
    if (APP.srState === 'recording') {
      for (var i = e.resultIndex; i < e.results.length; i++) {
        var text = e.results[i][0].transcript.trim();
        if (!text) continue;

        // Stop phrase — check interim + final for speed
        var clean = text.replace(/[.,!?;:]+/g, '').trim().toLowerCase();
        if (STOP_RE.test(clean)) {
          stopRecording();
          return;
        }

        if (e.results[i].isFinal) {
          // A final supersedes whatever interim was building
          pendingInterim = '';
          recordedTranscript += (recordedTranscript ? ' ' : '') + text;
        } else {
          pendingInterim = text;
        }
      }
      updateLivePreview();
    }
  };

  srHint.textContent = 'say \u201Chey note\u201D to annotate';
} else {
  srHint.textContent = 'Web Speech API not available in this browser';
}

function safeStart() {
  if (recognition && !srRunning && APP.srState !== 'idle') {
    try { recognition.start(); } catch (_) {}
  }
}

APP.startListening = function () {
  if (!recognition || APP.srState !== 'idle') return;
  APP.srState = 'listening';
  updateListenIndicator();
  safeStart();
};

APP.stopListening = function () {
  if (!recognition) return;
  if (recording) return; // Don't interrupt mid-recording
  // Keep listening when audio is just paused — user can still voice-trigger a note.
  // Only truly stop when audio has ended (finished playing to the end).
  if (audio.src && !audio.ended) return;
  APP.srState = 'idle';
  updateListenIndicator();
  try { recognition.abort(); } catch (_) {}
  srRunning = false;
};

function updateListenIndicator() {
  listenIndicator.classList.remove('visible', 'listening', 'capturing');
  if (APP.srState === 'listening') {
    listenIndicator.classList.add('visible', 'listening');
  }
}

function updateLivePreview() {
  var full = recordedTranscript;
  if (pendingInterim) full += (full ? ' ' : '') + pendingInterim;
  full = full.trim();
  srHint.textContent = full ? full + (pendingInterim ? '\u2026' : '') : 'listening\u2026';
}

// ── Recording Flow ──
function startRecording() {
  if (recording) return;

  // Set state BEFORE pausing so player.js pause handler won't call stopListening
  APP.srState = 'recording';
  updateListenIndicator();

  if (!audio.paused) audio.pause();
  capturedTs = audio.currentTime;

  recording = true;
  recordedTranscript = '';
  pendingInterim = '';

  // Abort the current SR session — this clears any buffered audiobook
  // narration from the recognition pipeline so the fresh session only
  // hears the user's voice (audio is now paused).
  try { if (recognition && srRunning) recognition.abort(); } catch (_) {}
  srRunning = false;

  // Button → "Done" (amber)
  addNoteBtn.innerHTML = btnDoneHTML;
  addNoteBtn.classList.add('recording');

  // Show pulsing red dot + timer
  recIndicator.classList.add('visible');
  recordingStart = Date.now();
  updateRecTimer();
  recordingTimer = setInterval(updateRecTimer, 1000);

  // Live transcript preview in the hint area
  srHintOriginal = srHint.textContent;
  srHint.textContent = 'listening\u2026';
  srHint.style.opacity = '1';
  srHint.style.textTransform = 'none';
  srHint.style.color = 'var(--text)';

  // Restart SR fresh — short delay lets abort() settle
  setTimeout(safeStart, 120);
  // Safety retry in case the first start fails silently
  setTimeout(function () { if (recording && !srRunning) safeStart(); }, 600);

  // Auto-stop at 60 seconds
  autoStopTimeout = setTimeout(function () {
    if (recording) stopRecording();
  }, MAX_RECORDING);
}

function stopRecording() {
  if (!recording) return;
  recording = false;

  clearTimeout(autoStopTimeout);
  clearInterval(recordingTimer);

  // ── Capture any speech still in the interim buffer ──
  // recognition.abort() discards pending results, so we must
  // commit whatever interim text exists BEFORE aborting.
  commitPending();

  // Hide recording indicator
  recIndicator.classList.remove('visible');

  // Button → "Add note"
  addNoteBtn.innerHTML = btnOriginalHTML;
  addNoteBtn.classList.remove('recording');

  // Restore hint
  srHint.textContent = srHintOriginal || '';
  srHint.style.opacity = '';
  srHint.style.textTransform = '';
  srHint.style.color = '';

  // Stop SR
  APP.srState = 'idle';
  updateListenIndicator();
  try { if (recognition) recognition.abort(); } catch (_) {}
  srRunning = false;

  // Save annotation from accumulated transcript
  var text = recordedTranscript.trim() || '(no speech detected)';
  addAnnotation(capturedTs, text, false);
  APP.showToast('Saved at ' + APP.fmt(capturedTs), 'success');

  // Resume playback — play event in player.js will call APP.startListening
  if (audio.src) audio.play();
}

function updateRecTimer() {
  var elapsed = Math.floor((Date.now() - recordingStart) / 1000);
  var m = Math.floor(elapsed / 60);
  var s = elapsed % 60;
  recTimerEl.textContent = m + ':' + String(s).padStart(2, '0');
}

// ── Add Note button ──
addNoteBtn.addEventListener('click', function () {
  if (recording) {
    stopRecording();
    return;
  }

  if (!audio.src || !audio.duration) {
    APP.showToast('Load a book first', 'error');
    return;
  }

  if (srSupported) {
    startRecording();
  } else {
    openTextModal();
  }
});

// ── Text note modal (fallback when SpeechRecognition unavailable) ──
var textModalTs = 0;

function openTextModal() {
  textModalTs = audio.currentTime;
  textModalTime.textContent = APP.fmt(textModalTs);
  textNoteInput.value = '';
  textModalBg.classList.add('open');
  setTimeout(function () { textNoteInput.focus(); }, 60);
}

function closeTextModal() { textModalBg.classList.remove('open'); }

document.getElementById('textModalSave').addEventListener('click', function () {
  var text = textNoteInput.value.trim();
  if (!text) return;
  addAnnotation(textModalTs, text, false);
  APP.showToast('Saved at ' + APP.fmt(textModalTs), 'success');
  closeTextModal();
});
document.getElementById('textModalCancel').addEventListener('click', closeTextModal);
textModalBg.addEventListener('click', function (e) { if (e.target === textModalBg) closeTextModal(); });
textNoteInput.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') document.getElementById('textModalSave').click();
  if (e.key === 'Escape') closeTextModal();
});

// ── Annotations CRUD ──
function addAnnotation(ts, text, autoOpen) {
  if (autoOpen === undefined) autoOpen = true;
  if (!currentBookKey) { APP.showToast('Load a book first', 'error'); return; }
  APP.annotations.push({ id: Date.now(), ts: ts, text: text });
  APP.annotations.sort(function (a, b) { return a.ts - b.ts; });
  saveAnnotations();
  renderAnnotations();
  if (autoOpen && !drawerOpen) openDrawer();
}

function deleteAnnotation(id) {
  APP.annotations = APP.annotations.filter(function (a) { return a.id !== id; });
  saveAnnotations();
  renderAnnotations();
}

function saveAnnotations() {
  if (!currentBookKey) return;
  allAnnotations[currentBookKey] = APP.annotations;
  try { localStorage.setItem(ANNOTATIONS_KEY, JSON.stringify(allAnnotations)); } catch (_) {}
}

function renderAnnotations() {
  annotationCount.textContent = APP.annotations.length;
  annotationsList.innerHTML   = '';
  if (APP.annotations.length === 0) {
    drawerEmpty.style.display = 'flex';
    if (!currentBookKey) {
      drawerEmpty.innerHTML =
        '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" opacity="0.3">' +
          '<path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
        '</svg>' +
        'Load an audiobook to start annotating';
    } else {
      drawerEmpty.innerHTML =
        '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" opacity="0.3">' +
          '<path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
        '</svg>' +
        'Say <em style="font-style:italic;color:var(--accent)">\u201Chey note\u201D</em> followed by your thought<br>' +
        'while the audio is playing';
    }
  } else {
    drawerEmpty.style.display = 'none';
    for (var i = 0; i < APP.annotations.length; i++) {
      var a = APP.annotations[i];
      var el = document.createElement('div');
      el.className = 'annotation-item';
      el.innerHTML =
        '<span class="ann-time" data-ts="' + a.ts + '">' + APP.fmt(a.ts) + '</span>' +
        '<span class="ann-text">' + APP.escHtml(a.text) + '</span>' +
        '<button class="ann-delete" data-id="' + a.id + '" title="Delete">\u2715</button>';
      annotationsList.appendChild(el);
    }
  }
  if (APP.renderProgressMarkers) APP.renderProgressMarkers();
}
APP.renderAnnotations = renderAnnotations;

annotationsList.addEventListener('click', function (e) {
  var ts = e.target.dataset.ts;
  var id = e.target.dataset.id;
  if (ts !== undefined) { audio.currentTime = parseFloat(ts); if (audio.paused && audio.src) audio.play(); }
  if (id !== undefined) deleteAnnotation(Number(id));
});

// ── Copy Notes ──
copyBtn.addEventListener('click', function (e) {
  e.stopPropagation();
  if (!APP.annotations.length) return;
  var text = APP.annotations.map(function (a) { return '[' + APP.fmtTs(a.ts) + '] ' + a.text; }).join('\n');
  navigator.clipboard.writeText(text).then(function () {
    copyBtn.textContent = 'Copied!';
    setTimeout(function () { copyBtn.textContent = 'Copy Notes'; }, 1800);
  }).catch(function () {
    var ta = Object.assign(document.createElement('textarea'), { value: text, style: 'position:fixed;opacity:0' });
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
    copyBtn.textContent = 'Copied!';
    setTimeout(function () { copyBtn.textContent = 'Copy Notes'; }, 1800);
  });
});

// ── Drawer ──
drawerHandle.addEventListener('click', function () { drawerOpen ? closeDrawer() : openDrawer(); });
function openDrawer()  { drawer.classList.add('open');    drawerOpen = true; }
function closeDrawer() { drawer.classList.remove('open'); drawerOpen = false; }

// ── Init ──
renderAnnotations();

})();
