(() => {
  'use strict';

  const cfg = window.WEDDING_CONFIG || {};
  const sceneIds = ['envelopeScene','galleryScene','invitationScene','thanksScene'];
  const form = document.getElementById('rsvpForm');
  const statusEl = document.getElementById('formStatus');
  const personalInvitation = document.getElementById('personalInvitation');
  const identityFields = document.getElementById('identityFields');
  const firstNameInput = document.getElementById('firstName');
  const lastNameInput = document.getElementById('lastName');
  const attendanceBlock = document.getElementById('attendanceBlock');
  const attendanceCount = document.getElementById('attendanceCount');
  const attendanceHint = document.getElementById('attendanceHint');
  const params = new URLSearchParams(window.location.search);
  const inviteToken = params.get('token');
  let currentInvitation = null;

  function showScene(id) {
    sceneIds.forEach(sceneId => {
      const el = document.getElementById(sceneId);
      if (el) el.classList.toggle('scene--active', sceneId === id);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
  }

  function setStatus(message) { if (statusEl) statusEl.textContent = message; }

  function wireNavigation() {
    const envelopeButton = document.getElementById('envelopeButton');
    const envelope = document.querySelector('.envelope');
    envelopeButton?.addEventListener('click', () => {
      envelope?.classList.add('open');
      setTimeout(() => showScene('galleryScene'), 1250);
    });
    document.getElementById('showInvitationFromGallery')?.addEventListener('click', () => showScene('invitationScene'));
    document.getElementById('editResponse')?.addEventListener('click', () => showScene('invitationScene'));
  }

  async function loadInvitation() {
    if (!inviteToken || !cfg.supabaseUrl || !cfg.supabaseAnonKey) {
      configureManualIdentityMode();
      return;
    }
    try {
      const response = await fetch(`${cfg.supabaseUrl}/rest/v1/rpc/get_invitation_by_token`, {
        method: 'POST',
        headers: { apikey: cfg.supabaseAnonKey, Authorization: `Bearer ${cfg.supabaseAnonKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_token: inviteToken })
      });
      if (!response.ok) throw new Error(await response.text());
      const rows = await response.json();
      if (!Array.isArray(rows) || rows.length === 0) return configureManualIdentityMode();
      currentInvitation = rows[0];
      configurePersonalizedMode();
    } catch (error) {
      console.error('Erreur invitation:', error);
      configureManualIdentityMode();
    }
  }

  function configureManualIdentityMode() {
    identityFields?.removeAttribute('hidden');
    if (firstNameInput) firstNameInput.required = true;
    if (lastNameInput) lastNameInput.required = true;
    personalInvitation?.setAttribute('hidden', '');
    attendanceBlock?.setAttribute('hidden', '');
  }

  function configurePersonalizedMode() {
    identityFields?.setAttribute('hidden', '');
    if (firstNameInput) { firstNameInput.value = currentInvitation.invitation_name || ''; firstNameInput.required = false; }
    if (lastNameInput) { lastNameInput.value = ''; lastNameInput.required = false; }
    const invitedPeople = Array.isArray(currentInvitation.invited_people) ? currentInvitation.invited_people : [];
    if (personalInvitation) {
      personalInvitation.innerHTML = `<p class="eyebrow" style="margin-top:0">Cette invitation est personnellement destinée à</p><h3 style="font-family:'Cormorant Garamond',serif;font-size:32px;margin:8px 0 14px">${escapeHtml(currentInvitation.invitation_name || '')}</h3>${invitedPeople.length ? `<p style="margin:0 0 8px">Sont conviés :</p><p style="font-weight:600;line-height:1.7;margin:0 0 12px">${invitedPeople.map(escapeHtml).join('<br>')}</p>` : ''}<p class="small-note" style="text-align:center">Cette invitation est réservée aux personnes mentionnées ci-dessus 🤍</p>`;
      personalInvitation.removeAttribute('hidden');
    }
    const maxGuests = Math.max(1, Number(currentInvitation.max_guests || 1));
    if (attendanceCount) attendanceCount.innerHTML = Array.from({length:maxGuests},(_,i)=>`<option value="${i+1}">${i+1}</option>`).join('');
    if (attendanceHint) attendanceHint.textContent = `Maximum prévu pour cette invitation : ${maxGuests}`;
    updateAttendanceVisibility();
  }

  function updateAttendanceVisibility() {
    if (!attendanceBlock || !currentInvitation) return;
    const selected = form?.querySelector('input[name="response"]:checked')?.value;
    if (selected === 'oui' || selected === 'peut-être') attendanceBlock.removeAttribute('hidden');
    else attendanceBlock.setAttribute('hidden', '');
  }

  async function saveResponse(payload) {
    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey || !cfg.tableName) throw new Error('Configuration Supabase incomplète.');
    const response = await fetch(`${cfg.supabaseUrl}/rest/v1/${cfg.tableName}`, {
      method: 'POST',
      headers: { apikey: cfg.supabaseAnonKey, Authorization: `Bearer ${cfg.supabaseAnonKey}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(await response.text());
  }

  function wireForm() {
    if (!form) return;
    form.querySelectorAll('input[name="response"]').forEach(input => input.addEventListener('change', updateAttendanceVisibility));
    form.addEventListener('submit', async event => {
      event.preventDefault();
      setStatus('Enregistrement en cours…');
      const data = new FormData(form);
      const responseValue = data.get('response');
      if (!responseValue) return setStatus('Merci de sélectionner une réponse.');
      const manualName = `${String(data.get('first_name') || '').trim()} ${String(data.get('last_name') || '').trim()}`.trim();
      const guestName = currentInvitation?.invitation_name || manualName;
      if (!guestName) return setStatus('Merci de renseigner votre nom.');
      const partySize = responseValue === 'non' ? 0 : Number(attendanceCount?.value || 1);
      const payload = { guest_name: guestName, party_size: partySize, response: responseValue, message: String(data.get('message') || '').trim(), invite_token: inviteToken || '', opened_at: new Date().toISOString(), created_at: new Date().toISOString() };
      try { await saveResponse(payload); setStatus(''); showScene('thanksScene'); }
      catch (error) { console.error('Erreur RSVP:', error); setStatus('Une erreur est survenue. Merci de réessayer.'); }
    });
  }

  function init() { showScene('envelopeScene'); wireNavigation(); wireForm(); loadInvitation(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
