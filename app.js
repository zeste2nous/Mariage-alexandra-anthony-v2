(() => {
  'use strict';

  /* =========================================================
     CONFIGURATION
  ========================================================= */

  const cfg = window.WEDDING_CONFIG || {};

  const params = new URLSearchParams(window.location.search);
  const inviteToken = params.get('token');

  let currentInvitation = null;


  /* =========================================================
     ÉLÉMENTS HTML
  ========================================================= */

  const scenes = Array.from(document.querySelectorAll('.scene'));

  const envelopeButton = document.getElementById('envelopeButton');
  const showInvitationButton = document.getElementById('showInvitation');
  const editResponseButton = document.getElementById('editResponse');

  const form = document.getElementById('rsvpForm');
  const statusEl = document.getElementById('formStatus');

  const firstNameInput = document.getElementById('firstName');
  const lastNameInput = document.getElementById('lastName');

  const personalInvitation = document.getElementById('personalInvitation');
  const attendanceSelector = document.getElementById('attendanceSelector');


  /* =========================================================
     NAVIGATION
  ========================================================= */

  function showScene(sceneId) {
    scenes.forEach(scene => {
      const isActive = scene.id === sceneId;
      scene.classList.toggle('active', isActive);
    });

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }


  function wireNavigation() {

    if (envelopeButton) {
      envelopeButton.addEventListener('click', () => {

        envelopeButton.disabled = true;

        setTimeout(() => {
          showScene('galleryScene');
          envelopeButton.disabled = false;
        }, 450);

      });
    }


    if (showInvitationButton) {
      showInvitationButton.addEventListener('click', () => {
        showScene('invitationScene');
      });
    }


    if (editResponseButton) {
      editResponseButton.addEventListener('click', () => {
        showScene('invitationScene');
      });
    }
  }


  /* =========================================================
     SÉCURITÉ TEXTE
  ========================================================= */

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => {

      const entities = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      };

      return entities[character];
    });
  }


  /* =========================================================
     STATUT FORMULAIRE
  ========================================================= */

  function setStatus(message = '') {
    if (statusEl) {
      statusEl.textContent = message;
    }
  }


  /* =========================================================
     MODE SANS LIEN PERSONNALISÉ
  ========================================================= */

  function configureManualMode() {

    currentInvitation = null;

    if (firstNameInput) {
      firstNameInput.readOnly = false;
      firstNameInput.required = true;
      firstNameInput.value = '';
    }

    if (lastNameInput) {
      lastNameInput.readOnly = false;
      lastNameInput.required = true;
      lastNameInput.value = '';
    }

    if (personalInvitation) {
      personalInvitation.hidden = true;
      personalInvitation.innerHTML = '';
    }

    if (attendanceSelector) {
      attendanceSelector.hidden = true;
      attendanceSelector.innerHTML = '';
    }
  }


  /* =========================================================
     MODE INVITATION PERSONNALISÉE
  ========================================================= */

  function configurePersonalizedMode() {

    if (!currentInvitation) return;


    /* ----- Nom de l'invitation ----- */

    if (firstNameInput) {
      firstNameInput.value =
        currentInvitation.invitation_name || '';

      firstNameInput.readOnly = true;
      firstNameInput.required = false;
    }

    if (lastNameInput) {
      lastNameInput.value = '';
      lastNameInput.readOnly = true;
      lastNameInput.required = false;
    }


    /* ----- Personnes invitées ----- */

    const people = Array.isArray(currentInvitation.invited_people)
      ? currentInvitation.invited_people
      : [];


    if (personalInvitation) {

      const peopleHtml = people.length
        ? `
          <p>Cette invitation comprend :</p>

          <p style="font-weight:600;">
            ${people.map(escapeHtml).join('<br>')}
          </p>
        `
        : '';


      personalInvitation.innerHTML = `

        <p style="margin:0;">
          Cette invitation est personnellement destinée à
        </p>

        <h3>
          ${escapeHtml(currentInvitation.invitation_name || '')}
        </h3>

        ${peopleHtml}

        <p style="font-size:12px;opacity:.7;margin-bottom:0;">
          L’invitation est réservée aux personnes mentionnées 🤍
        </p>
      `;

      personalInvitation.hidden = false;
    }


    /* ----- Nombre maximum de présents ----- */

    const maxGuests = Math.max(
      1,
      Number(currentInvitation.max_guests || people.length || 1)
    );


    if (attendanceSelector) {

      attendanceSelector.innerHTML = `

        <label for="attendanceCount">

          Combien d’entre vous seront présents ?

          <select
            id="attendanceCount"
            name="attendance_count"
          >

            ${Array.from(
              { length: maxGuests },
              (_, index) => {
                const value = index + 1;

                return `
                  <option value="${value}">
                    ${value}
                  </option>
                `;
              }
            ).join('')}

          </select>

        </label>

        <p style="font-size:12px;opacity:.7;margin:8px 0 0;">
          Maximum prévu pour cette invitation : ${maxGuests}
        </p>
      `;

      attendanceSelector.hidden = true;
    }

    updateAttendanceVisibility();
  }


  /* =========================================================
     CHARGEMENT INVITATION SUPABASE
  ========================================================= */

  async function loadInvitation() {

    if (
      !inviteToken ||
      !cfg.supabaseUrl ||
      !cfg.supabaseAnonKey
    ) {
      configureManualMode();
      return;
    }


    try {

      const response = await fetch(
        `${cfg.supabaseUrl}/rest/v1/rpc/get_invitation_by_token`,
        {
          method: 'POST',

          headers: {
            apikey: cfg.supabaseAnonKey,

            Authorization:
              `Bearer ${cfg.supabaseAnonKey}`,

            'Content-Type':
              'application/json'
          },

          body: JSON.stringify({
            p_token: inviteToken
          })
        }
      );


      if (!response.ok) {
        throw new Error(await response.text());
      }


      const invitations = await response.json();


      if (
        !Array.isArray(invitations) ||
        invitations.length === 0
      ) {
        console.warn('Invitation introuvable');
        configureManualMode();
        return;
      }


      currentInvitation = invitations[0];

      configurePersonalizedMode();

    } catch (error) {

      console.error(
        'Erreur chargement invitation :',
        error
      );

      configureManualMode();
    }
  }


  /* =========================================================
     NOMBRE DE PARTICIPANTS
  ========================================================= */

  function updateAttendanceVisibility() {

    if (!attendanceSelector) return;


    if (!currentInvitation) {
      attendanceSelector.hidden = true;
      return;
    }


    const selectedResponse =
      form?.querySelector(
        'input[name="response"]:checked'
      )?.value;


    if (
      selectedResponse === 'oui' ||
      selectedResponse === 'peut-être'
    ) {
      attendanceSelector.hidden = false;
    } else {
      attendanceSelector.hidden = true;
    }
  }


  /* =========================================================
     ENREGISTREMENT SUPABASE
  ========================================================= */

  async function saveResponse(payload) {

    if (
      cfg.supabaseUrl &&
      cfg.supabaseAnonKey &&
      cfg.tableName
    ) {

      const response = await fetch(
        `${cfg.supabaseUrl}/rest/v1/${cfg.tableName}`,
        {
          method: 'POST',

          headers: {
            apikey: cfg.supabaseAnonKey,

            Authorization:
              `Bearer ${cfg.supabaseAnonKey}`,

            'Content-Type':
              'application/json',

            Prefer:
              'return=minimal'
          },

          body: JSON.stringify(payload)
        }
      );


      if (!response.ok) {
        throw new Error(await response.text());
      }

      return;
    }


    /* Mode local uniquement si Supabase n'est pas configuré */

    const existingResponses = JSON.parse(
      localStorage.getItem('wedding_rsvps') || '[]'
    );


    const index = existingResponses.findIndex(
      response =>
        inviteToken &&
        response.invite_token === inviteToken
    );


    if (index >= 0) {
      existingResponses[index] = payload;
    } else {
      existingResponses.push(payload);
    }


    localStorage.setItem(
      'wedding_rsvps',
      JSON.stringify(existingResponses)
    );
  }


  /* =========================================================
     FORMULAIRE RSVP
  ========================================================= */

  function wireForm() {

    if (!form) return;


    form
      .querySelectorAll('input[name="response"]')
      .forEach(input => {

        input.addEventListener(
          'change',
          updateAttendanceVisibility
        );

      });


    form.addEventListener(
      'submit',
      async event => {

        event.preventDefault();

        setStatus('Enregistrement en cours…');


        const data = new FormData(form);

        const responseValue =
          data.get('response');


        if (!responseValue) {
          setStatus(
            'Merci de sélectionner une réponse.'
          );
          return;
        }


        const firstName = String(
          data.get('first_name') || ''
        ).trim();


        const lastName = String(
          data.get('last_name') || ''
        ).trim();


        let guestName = '';


        if (currentInvitation) {

          guestName =
            currentInvitation.invitation_name || '';

        } else {

          guestName =
            `${firstName} ${lastName}`.trim();
        }


        if (!guestName) {
          setStatus(
            'Merci de renseigner votre nom.'
          );
          return;
        }


        let partySize = 0;


        if (responseValue !== 'non') {

          if (currentInvitation) {

            partySize = Number(
              document.getElementById(
                'attendanceCount'
              )?.value || 1
            );

          } else {

            partySize = 1;
          }
        }


        const payload = {

          guest_name: guestName,

          party_size: partySize,

          response: responseValue,

          message: String(
            data.get('message') || ''
          ).trim(),

          invite_token:
            inviteToken || '',

          opened_at:
            new Date().toISOString(),

          created_at:
            new Date().toISOString()
        };


        try {

          await saveResponse(payload);

          setStatus('');

          showScene('thanksScene');

        } catch (error) {

          console.error(
            'Erreur RSVP :',
            error
          );

          setStatus(
            'Une erreur est survenue. Merci de réessayer.'
          );
        }
      }
    );
  }


  /* =========================================================
     INITIALISATION
  ========================================================= */

  function init() {

    /*
      Toujours une seule scène visible au démarrage.
    */

    showScene('envelopeScene');


    /*
      Activation des boutons.
    */

    wireNavigation();


    /*
      Activation du formulaire.
    */

    wireForm();


    /*
      Recherche éventuelle de l'invitation personnalisée.
    */

    loadInvitation();
  }


  if (document.readyState === 'loading') {

    document.addEventListener(
      'DOMContentLoaded',
      init,
      { once: true }
    );

  } else {

    init();
  }

})();
