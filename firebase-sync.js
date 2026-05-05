// Firebase sync layer — Google sign-in required + Firestore realtime sync
// API: window.SkinSync.{init, onState, updateChecks, updateRoutine, signInGoogle, signOut}
// State has: ready, signedIn, user, checks, routine, history

(function () {
  const firebaseConfig = {
    apiKey: "AIzaSyCYKqkucCkc0SyBXQ3iSVXdcJ9YxdpVbAM",
    authDomain: "skincare-plan-d3030.firebaseapp.com",
    projectId: "skincare-plan-d3030",
    storageBucket: "skincare-plan-d3030.firebasestorage.app",
    messagingSenderId: "1037277928019",
    appId: "1:1037277928019:web:8a9bfec2b88abd34caf65a"
  };

  let app, auth, db, sdk, unsub, listeners = [];
  let state = { ready: false, signedIn: false, user: null, checks: {}, routine: null, history: {}, error: null };

  function notify() { listeners.forEach(fn => { try { fn(state); } catch(e){} }); }

  async function loadSDK() {
    const a = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js');
    const b = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js');
    const c = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
    return { ...a, ...b, ...c };
  }

  function attachUserDoc(user) {
    if (unsub) { unsub(); unsub = null; }
    const userRef = sdk.doc(db, 'users', user.uid);
    window.__userRef = userRef;
    unsub = sdk.onSnapshot(userRef, async (snap) => {
      let data;
      if (!snap.exists()) {
        data = { checks: {}, routine: null, history: {}, createdAt: Date.now() };
        try { await sdk.setDoc(userRef, data); } catch(e) { console.error(e); }
      } else { data = snap.data(); }
      state = {
        ...state,
        ready: true,
        signedIn: true,
        user: { uid: user.uid, email: user.email, name: user.displayName, photo: user.photoURL },
        checks: data.checks || {},
        routine: data.routine || null,
        history: data.history || {},
        error: null,
      };
      notify();
    }, (err) => console.error('snapshot', err));
  }

  async function init() {
    try {
      sdk = await loadSDK();
      app = sdk.initializeApp(firebaseConfig);
      auth = sdk.getAuth(app);
      db = sdk.getFirestore(app);
      try { await sdk.setPersistence(auth, sdk.browserLocalPersistence); } catch(e) {}
    } catch (e) {
      console.error('Firebase init failed', e);
      state = { ...state, ready: true, signedIn: false, error: 'init: ' + e.message };
      notify();
      return;
    }

    // Handle redirect result (mobile fallback)
    try { await sdk.getRedirectResult(auth); } catch(e) { console.warn('redirect', e); }

    sdk.onAuthStateChanged(auth, (user) => {
      if (user) {
        attachUserDoc(user);
      } else {
        if (unsub) { unsub(); unsub = null; }
        state = { ready: true, signedIn: false, user: null, checks: {}, routine: null, history: {}, error: null };
        notify();
      }
    });
  }

  function onState(cb) { listeners.push(cb); if (state.ready) cb(state); return () => { listeners = listeners.filter(f => f !== cb); }; }

  async function updateChecks(checks, history) {
    if (!window.__userRef) return;
    try { await sdk.updateDoc(window.__userRef, { checks, history: history || state.history, updatedAt: Date.now() }); }
    catch(e) { console.error('updateChecks', e); }
  }

  async function updateRoutine(routine) {
    if (!window.__userRef) return;
    try { await sdk.updateDoc(window.__userRef, { routine, updatedAt: Date.now() }); }
    catch(e) { console.error('updateRoutine', e); }
  }

  async function signInGoogle() {
    if (!auth) return { ok: false, error: 'Firebase не инициализирован' };
    const provider = new sdk.GoogleAuthProvider();
    try {
      await sdk.signInWithPopup(auth, provider);
      return { ok: true };
    } catch (e) {
      console.warn('popup failed, trying redirect', e);
      if (e.code === 'auth/popup-blocked' ||
          e.code === 'auth/popup-closed-by-user' ||
          e.code === 'auth/operation-not-supported-in-this-environment' ||
          e.code === 'auth/cancelled-popup-request') {
        try { await sdk.signInWithRedirect(auth, provider); return { ok: true, redirect: true }; }
        catch(err) { return { ok: false, error: err.message }; }
      }
      return { ok: false, error: e.message };
    }
  }

  async function signOut() {
    if (!auth) return;
    try { await sdk.signOut(auth); } catch(e) { console.error(e); }
  }

  window.SkinSync = { init, onState, updateChecks, updateRoutine, signInGoogle, signOut };
})();
