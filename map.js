// ── Map — progress bar markers + tooltips ──
(function () {
var APP = window.APP;
var audio = APP.audio;

// ── DOM refs ──
var progressMarkers = document.getElementById('progressMarkers');
var progressTooltip = document.getElementById('progressTooltip');
var progressWrap    = document.getElementById('progressWrap');

// ── Progress Markers (dots on progress bar) ──
APP.renderProgressMarkers = function () {
  progressMarkers.innerHTML = '';
  var dur = audio.duration;
  if (!dur || !isFinite(dur)) return;

  for (var j = 0; j < APP.annotations.length; j++) {
    var a = APP.annotations[j];
    var pctA = (a.ts / dur) * 100;
    var elA = document.createElement('div');
    elA.className = 'marker marker-ann';
    elA.style.left = pctA + '%';
    elA.dataset.text = a.text;
    progressMarkers.appendChild(elA);
  }
};

// ── Tooltip hover ──
progressMarkers.addEventListener('mouseover', function (e) {
  var marker = e.target.closest('.marker');
  if (!marker) return;
  var text = marker.dataset.text;
  if (!text) return;
  progressTooltip.textContent = text;
  progressTooltip.style.left = marker.style.left;
  progressTooltip.style.transform = 'translateX(-50%)';
  progressTooltip.classList.add('visible');
  requestAnimationFrame(function () {
    var wrapRect = progressWrap.getBoundingClientRect();
    var tipRect = progressTooltip.getBoundingClientRect();
    if (tipRect.left < wrapRect.left) {
      progressTooltip.style.transform = 'translateX(0)';
    } else if (tipRect.right > wrapRect.right) {
      progressTooltip.style.transform = 'translateX(-100%)';
    }
  });
});

progressMarkers.addEventListener('mouseout', function (e) {
  var marker = e.target.closest('.marker');
  if (!marker) return;
  progressTooltip.classList.remove('visible');
});

})();
