(function () {
  var CONTACT_ENDPOINT = 'https://formsubmit.co/ajax/me@farnood.tech';
  var form = document.getElementById('contact-form');
  var statusEl = document.getElementById('contact-status');
  var submitBtn = document.getElementById('contact-submit');

  if (!form || !statusEl || !submitBtn) {
    return;
  }

  function setStatus(kind, message) {
    statusEl.hidden = false;
    statusEl.className = 'contact-status contact-status-' + kind;
    statusEl.textContent = message;
  }

  function clearStatus() {
    statusEl.hidden = true;
    statusEl.className = 'contact-status';
    statusEl.textContent = '';
  }

  function isSuccessPayload(data) {
    if (!data) {
      return false;
    }
    return data.success === true || data.success === 'true';
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    clearStatus();

    if (!form.reportValidity()) {
      return;
    }

    var honey = form.elements.namedItem('_honey');
    if (honey && typeof honey.value === 'string' && honey.value.trim() !== '') {
      setStatus('success', 'Thanks — your message was sent.');
      form.reset();
      return;
    }

    var name = String(form.elements.namedItem('name').value || '').trim();
    var email = String(form.elements.namedItem('email').value || '').trim();
    var subject = String(form.elements.namedItem('subject').value || '').trim();
    var message = String(form.elements.namedItem('message').value || '').trim();

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';

    fetch(CONTACT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        name: name,
        email: email,
        subject: subject,
        message: message,
        _subject: 'StayToned contact: ' + subject,
        _template: 'table',
        _captcha: 'false',
        _replyto: email,
      }),
    })
      .then(function (response) {
        return response
          .json()
          .catch(function () {
            return null;
          })
          .then(function (data) {
            return { ok: response.ok, data: data };
          });
      })
      .then(function (result) {
        if (!result.ok || !isSuccessPayload(result.data)) {
          throw new Error((result.data && result.data.message) || 'Send failed');
        }
        var providerMessage = result.data && result.data.message ? String(result.data.message) : '';
        if (/confirm|activat/i.test(providerMessage)) {
          setStatus(
            'success',
            'Almost done — check me@farnood.tech for a FormSubmit confirmation email, then submit again.',
          );
        } else {
          setStatus('success', 'Thanks — your message was sent. I will reply by email.');
        }
        form.reset();
      })
      .catch(function () {
        setStatus(
          'error',
          'Could not send the form. Email me@farnood.tech directly, or try again in a moment.',
        );
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send message';
      });
  });
})();
