(function () {
  var iosStoreUrl = 'https://apps.apple.com/app/id6779874001';
  var androidStoreUrl = 'https://play.google.com/store/apps/details?id=tech.farnood.staytoned';
  var params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  var token = params.get('token');
  var tokenPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  var openLink = document.getElementById('open-app-link');
  var storeLink = document.getElementById('store-link');
  var title = document.getElementById('offer-title');
  var copy = document.getElementById('offer-copy');
  var actions = document.getElementById('offer-actions');
  var rescanNote = document.getElementById('rescan-note');
  var userAgent = navigator.userAgent || '';
  var isIos = /iPhone|iPad|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && navigator.maxTouchPoints > 1);
  var isAndroid = /Android/i.test(userAgent);
  var storeUrl = isAndroid ? androidStoreUrl : iosStoreUrl;
  var leftPage = false;
  var fallbackTimer = null;

  if (!token || !tokenPattern.test(token)) {
    title.textContent = 'This offer link is incomplete';
    copy.textContent = 'Scan the original StayToned offer QR code and try again.';
    actions.hidden = true;
    rescanNote.hidden = true;
    return;
  }

  var appUrl = 'staytoned://offer/redeem#token=' + encodeURIComponent(token);
  openLink.setAttribute('href', appUrl);
  storeLink.setAttribute('href', storeUrl);
  storeLink.textContent = isAndroid ? 'Get it on Google Play' : 'Download on the App Store';

  function markPageLeft() {
    leftPage = true;
    if (fallbackTimer !== null) window.clearTimeout(fallbackTimer);
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) markPageLeft();
  });
  window.addEventListener('pagehide', markPageLeft);

  function openAppThenStore(event) {
    if (event) event.preventDefault();
    leftPage = false;
    window.location.href = appUrl;

    if (!isIos && !isAndroid) return;
    fallbackTimer = window.setTimeout(function () {
      if (!leftPage && !document.hidden) {
        window.location.href = storeUrl;
      }
    }, 1400);
  }

  openLink.addEventListener('click', openAppThenStore);
  if (isIos || isAndroid) {
    window.setTimeout(openAppThenStore, 120);
  } else {
    title.textContent = 'Open this offer on your phone';
    copy.textContent = 'Scan the QR code with the phone where you use StayToned.';
  }
})();
