// REPLACE WHOLE FILE: /assets/js/mxd-link-auto.js
// MXD-LINK-AUTO v0 — client phía repo MXD210

// ĐÃ GẮN SẴN WORKER CỦA CẬU Ở ĐÂY:
const MXD_LINK_AUTO_ENDPOINT = 'https://botbuyauto.mxd6686.workers.dev/auto/wrap';

(function () {
  'use strict';

  function $(id) {
    return document.getElementById(id);
  }

  const form = $('mxd-link-auto-form');
  const inputUrl = $('mxd-input-url');
  const inputSub1 = $('mxd-input-sub1');
  const btnSubmit = $('mxd-link-auto-submit');
  const btnSubmitText = $('mxd-link-auto-submit-text');
  const btnReset = $('mxd-link-auto-reset');
  const outputLink = $('mxd-link-auto-output');
  const outputJson = $('mxd-link-auto-json');
  const statusEl = $('mxd-link-auto-status');

  if (!form) return;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    clearStatus();

    const rawUrl = (inputUrl.value || '').trim();
    const sub1 = (inputSub1.value || '').trim();

    if (!rawUrl) {
      setStatus('Hãy dán link sản phẩm trước đã.', 'error');
      return;
    }

    setLoading(true);

    try {
      const params = new URLSearchParams();
      params.set('url', rawUrl);
      if (sub1) params.set('sub1', sub1);

      const endpoint = MXD_LINK_AUTO_ENDPOINT + '?' + params.toString();

      const resp = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      const data = await resp.json().catch(() => ({}));

      outputJson.textContent = JSON.stringify(data, null, 2);

      if (!resp.ok || !data || data.state !== 'ok') {
        const msg = data && data.message
          ? data.message
          : 'Không tạo được deeplink. Kiểm tra lại URL hoặc domain sản phẩm.';
        setStatus(msg, 'error');
        outputLink.value = '';
        return;
      }

      outputLink.value = data.deeplink || '';
      setStatus(
        'Đã tạo link affiliate cho ' + (data.merchant || 'sàn') + '. Copy link ở trên để dùng.',
        'ok'
      );
    } catch (err) {
      setStatus('Lỗi kết nối tới MXD-LINK-AUTO. Kiểm tra lại URL Worker.', 'error');
      outputJson.textContent = String(err);
      outputLink.value = '';
    } finally {
      setLoading(false);
    }
  });

  btnReset.addEventListener('click', function () {
    inputUrl.value = '';
    inputSub1.value = '';
    outputLink.value = '';
    outputJson.textContent = '';
    clearStatus();
    inputUrl.focus();
  });

  function setLoading(isLoading) {
    if (!btnSubmit) return;
    btnSubmit.disabled = isLoading;
    if (btnSubmitText) {
      btnSubmitText.textContent = isLoading ? 'Đang tạo link…' : 'Tạo link affiliate';
    }
  }

  function setStatus(text, type) {
    if (!statusEl) return;
    statusEl.textContent = text || '';
    statusEl.classList.remove('mxd-status--error', 'mxd-status--ok');
    if (type === 'error') statusEl.classList.add('mxd-status--error');
    if (type === 'ok') statusEl.classList.add('mxd-status--ok');
  }

  function clearStatus() {
    if (!statusEl) return;
    statusEl.textContent = '';
    statusEl.classList.remove('mxd-status--error', 'mxd-status--ok');
  }
})();
