// Firebase sync layer — anonymous auth + Firestore realtime sync
// Exposes window.SkinSync with: init(), onState(cb), updateChecks(checks), updateRoutine(routine),
// getLinkCode(), useLinkCode(code), unlink()

(function () {
  const firebaseConfig = {
    apiKey: "AIzaSyCYKqkucCkc0SyBXQ3iSVXdcJ9YxdpVbAM",
    authDomain: "skincare-plan-d3030.firebaseapp.com",
    projectId: "skincare-plan-d3030",
    storageBucket: "skincare-plan-d3030.firebasestorage.app",
    messagingSenderId: "1037277928019",
    appId: "1:1037277928019:web:8a9bfec2b88abd34caf65a"
  };

  let app, auth, db, uid, unsub, listeners = [];
  let state = { checks: {}, routine: null, history: {}, linkedAccountId: null, ready: false };

  function notify() { listeners.forEach(fn => { try { fn(state); } catch(e){} }); }

  async function loadSDK() {
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js');
    const authMod = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js');
    const fsMod = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
    return { initializeApp, ...authMod, ...fsMod };
  }

  async function init() {
    let sdk;
    try {
      sdk = await loadSDK();
      app = sdk.initializeApp(firebaseConfig);
      auth = sdk.getAuth(app);
      db = sdk.getFirestore(app);
    } catch (e) {
      console.warn('Firebase init failed — running in local-only mode', e);
      return startLocalMode();
    }

    // Sign in anonymously and persist — but bail to local mode on failure
    let signedIn = false;
    try {
      await new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('auth timeout')), 8000);
        sdk.onAuthStateChanged(auth, async (user) => {
          if (user) { uid = user.uid; signedIn = true; clearTimeout(t); resolve(); }
          else {
            try { await sdk.signInAnonymously(auth); }
            catch (e) { clearTimeout(t); reject(e); }
          }
        });
      });
    } catch (e) {
      console.warn('Firebase auth failed — running in local-only mode', e);
      return startLocalMode();
    }

    // Resolve linked account: if a linkedAccountId is set in localStorage, use it instead of uid
    const linkedId = localStorage.getItem('skp_linked_account_id');
    const accountId = linkedId || uid;

    const userRef = sdk.doc(db, 'users', accountId);
    unsub = sdk.onSnapshot(userRef, (snap) => {
      const data = snap.data() || {};
      state = {
        checks: data.checks || {},
        routine: data.routine || null,
        history: data.history || {},
        linkedAccountId: linkedId,
        accountId,
        uid,
        ready: true,
        mode: 'cloud',
      };
      notify();
    }, (err) => { console.error('snapshot', err); });

    // Initial doc
    try {
      const snap = await sdk.getDoc(userRef);
      if (!snap.exists()) {
        await sdk.setDoc(userRef, { checks: {}, routine: null, history: {}, createdAt: Date.now() });
      }
    } catch(e) { console.error('init doc', e); }

    window.__sdk = sdk;
    window.__userRef = userRef;
  }

  function startLocalMode() {
    state = {
      checks: JSON.parse(localStorage.getItem('skp_local_checks') || '{}'),
      routine: JSON.parse(localStorage.getItem('skp_local_routine') || 'null'),
      history: JSON.parse(localStorage.getItem('skp_local_history') || '{}'),
      ready: true, mode: 'local', error: 'cloud-unavailable',
    };
    notify();
  }

  function onState(cb) { listeners.push(cb); if (state.ready) cb(state); return () => { listeners = listeners.filter(f => f !== cb); }; }

  async function updateChecks(checks, history) {
    if (state.mode === 'local') {
      state.checks = checks; state.history = history || state.history;
      localStorage.setItem('skp_local_checks', JSON.stringify(checks));
      localStorage.setItem('skp_local_history', JSON.stringify(history || state.history));
      return;
    }
    if (!window.__sdk) return;
    const { updateDoc } = window.__sdk;
    try { await updateDoc(window.__userRef, { checks, history: history || state.history, updatedAt: Date.now() }); }
    catch(e) { console.error('updateChecks', e); }
  }

  async function updateRoutine(routine) {
    if (state.mode === 'local') {
      state.routine = routine;
      localStorage.setItem('skp_local_routine', JSON.stringify(routine));
      return;
    }
    if (!window.__sdk) return;
    const { updateDoc } = window.__sdk;
    try { await updateDoc(window.__userRef, { routine, updatedAt: Date.now() }); }
    catch(e) { console.error('updateRoutine', e); }
  }

  // Link code: generate 6-char code that maps to accountId
  async function getLinkCode() {
    if (!window.__sdk) return null;
    const { setDoc, doc } = window.__sdk;
    const accountId = state.accountId;
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    try {
      await setDoc(doc(db, 'links', code), { accountId, expires: Date.now() + 1000*60*60*24 });
      return code;
    } catch(e) { console.error('getLinkCode', e); return null; }
  }

  async function useLinkCode(code) {
    if (!window.__sdk) return { ok: false, error: 'not ready' };
    const { getDoc, doc } = window.__sdk;
    try {
      const linkSnap = await getDoc(doc(db, 'links', code.toUpperCase()));
      if (!linkSnap.exists()) return { ok: false, error: 'Код не найден' };
      const { accountId } = linkSnap.data();
      if (!accountId) return { ok: false, error: 'Код повреждён' };
      localStorage.setItem('skp_linked_account_id', accountId);
      // Re-init with new account
      if (unsub) unsub();
      const userRef = doc(db, 'users', accountId);
      window.__userRef = userRef;
      const { onSnapshot } = window.__sdk;
      unsub = onSnapshot(userRef, (snap) => {
        const data = snap.data() || {};
        state = { ...state, checks: data.checks || {}, routine: data.routine || null, history: data.history || {}, linkedAccountId: accountId, accountId, ready: true };
        notify();
      });
      return { ok: true };
    } catch(e) { console.error('useLinkCode', e); return { ok: false, error: 'Ошибка: ' + e.message }; }
  }

  function unlink() {
    localStorage.removeItem('skp_linked_account_id');
    location.reload();
  }

  window.SkinSync = { init, onState, updateChecks, updateRoutine, getLinkCode, useLinkCode, unlink };
})();
