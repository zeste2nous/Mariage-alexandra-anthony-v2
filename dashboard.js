(() => {
  'use strict';
  const cfg = window.WEDDING_CONFIG || {};
  const client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  let responses = [];
  const loginScreen = document.getElementById('loginScreen');
  const dashboardApp = document.getElementById('dashboardApp');
  const loginForm = document.getElementById('loginForm');
  const loginStatus = document.getElementById('loginStatus');
  const statusEl = document.getElementById('dashboardStatus');
  const body = document.getElementById('responsesBody');
  const searchInput = document.getElementById('searchInput');
  const filterSelect = document.getElementById('filterSelect');
  const showLogin = () => { loginScreen.classList.remove('hidden'); dashboardApp.classList.add('hidden'); };
  const showDashboard = () => { loginScreen.classList.add('hidden'); dashboardApp.classList.remove('hidden'); };
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
  const formatDate = value => value ? new Intl.DateTimeFormat('fr-FR',{dateStyle:'short',timeStyle:'short'}).format(new Date(value)) : '—';
  const labelFor = value => value === 'oui' ? 'Oui' : value === 'non' ? 'Non' : 'Peut-être';
  function render(){const term=searchInput.value.trim().toLowerCase();const filter=filterSelect.value;const rows=responses.filter(r=>String(r.guest_name||'').toLowerCase().includes(term)&&(filter==='all'||r.response===filter));body.innerHTML=rows.length?rows.map(r=>`<tr><td><strong>${escapeHtml(r.guest_name)}</strong></td><td>${Number(r.party_size||0)}</td><td><span class="badge ${escapeHtml(r.response)}">${labelFor(r.response)}</span></td><td>${escapeHtml(r.message||'—')}</td><td>${formatDate(r.created_at)}</td></tr>`).join(''):'<tr><td colspan="5">Aucune réponse pour le moment.</td></tr>';document.getElementById('totalResponses').textContent=responses.length;document.getElementById('yesCount').textContent=responses.filter(r=>r.response==='oui').length;document.getElementById('maybeCount').textContent=responses.filter(r=>r.response==='peut-être').length;document.getElementById('noCount').textContent=responses.filter(r=>r.response==='non').length;}
  async function loadResponses(){statusEl.textContent='Chargement…';const {data,error}=await client.from(cfg.tableName).select('*').order('created_at',{ascending:false});if(error){console.error(error);statusEl.textContent='Impossible de charger les réponses.';return;}responses=data||[];statusEl.textContent='';render();}
  async function checkSession(){const {data,error}=await client.auth.getSession();if(error||!data.session)return showLogin();showDashboard();await loadResponses();}
  loginForm.addEventListener('submit',async e=>{e.preventDefault();loginStatus.textContent='Connexion en cours…';const email=document.getElementById('loginEmail').value.trim();const password=document.getElementById('loginPassword').value;const {error}=await client.auth.signInWithPassword({email,password});if(error){loginStatus.textContent='E-mail ou mot de passe incorrect.';return;}loginStatus.textContent='';showDashboard();await loadResponses();});
  document.getElementById('refreshButton').addEventListener('click',loadResponses);
  document.getElementById('logoutButton').addEventListener('click',async()=>{await client.auth.signOut();responses=[];body.innerHTML='';showLogin();});
  searchInput.addEventListener('input',render);filterSelect.addEventListener('change',render);
  document.getElementById('exportButton').addEventListener('click',()=>{const rows=[['Nom','Présents','Réponse','Message','Date'],...responses.map(r=>[r.guest_name,r.party_size,r.response,r.message,formatDate(r.created_at)])];const csv=rows.map(row=>row.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(';')).join('\n');const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='reponses-mariage.csv';a.click();URL.revokeObjectURL(a.href);});
  checkSession();
})();
