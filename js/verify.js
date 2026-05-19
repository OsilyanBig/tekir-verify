import { db, auth } from './firebase-config.js';
import {
  doc, getDoc, updateDoc, setDoc, arrayUnion, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import {
  signInWithEmailAndPassword, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

const PLACES = {
  reji: {
    order: 1,
    name: "1. Mekan",
    riddle: "Sahne arkasındayım ama her şeyi ben yönetirim.",
    answers: ["rejiodası", "rejiodasi", "reji"],
    points: 100
  },
  mudur: {
    order: 2,
    name: "2. Mekan",
    riddle: "Bir geminin kaptanı vardır, bir ordunun komutanı. Benim de biricik sahibim var.",
    answers: ["müdürodası", "muduroldasi", "mudurodasi", "müdür", "mudur"],
    points: 100
  },
  bilgiislem: {
    order: 3,
    name: "3. Mekan",
    riddle: "Kâğıt tükenir, kalem biter, mürekkep kurur. İlk aklına gelen yer benim.",
    answers: ["bilgiişlem", "bilgiislem"],
    points: 100
  },
  nobetci: {
    order: 4,
    name: "4. Mekan",
    riddle: "Ne kapıda dururum ne sınıfta otururum, Bir yerden bir yere mesajım ben.",
    answers: ["nöbetçimasası", "nobetcimasasi", "nöbetçi", "nobetci"],
    points: 100
  },
  cayocagi: {
    order: 5,
    name: "5. Mekan",
    riddle: "Sohbetin en iyi arkadaşıyım. Mutfak sayılmam, salon da değilim.",
    answers: ["çayocağı", "cayocagi", "çay", "cay"],
    points: 150
  }
};

const MIN_WAIT_SECONDS = 120;

// URL'den place al (hem ?place=xxx hem /r/xxx formatını destekler)
const urlParams = new URLSearchParams(window.location.search);
let placeKey = urlParams.get('place');

// Eğer ?place yoksa, URL path'inden al (/r/reji gibi)
if (!placeKey) {
  const pathMatch = window.location.pathname.match(/\/r\/([^/?]+)/);
  if (pathMatch) {
    placeKey = pathMatch[1];
  }
}

let userUid = urlParams.get('uid');
const place = PLACES[placeKey];

let userDocRef = null;

window.addEventListener('DOMContentLoaded', async () => {
  hideAll();

  if (!place) {
    show('not-logged-in');
    document.querySelector('#not-logged-in h2').textContent = "❌ Geçersiz QR";
    document.querySelector('#not-logged-in p').textContent = "Bu QR kodu tanınmıyor.";
    return;
  }

  // UID varsa direkt devam et
  if (userUid) {
    userDocRef = doc(db, "users", userUid);
    await checkProgress();
    return;
  }

  // UID yoksa → Firebase Auth dinle veya login formu göster
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      userUid = user.uid;
      userDocRef = doc(db, "users", user.uid);
      await checkProgress();
    } else {
      showLoginForm();
    }
  });
});

function showLoginForm() {
  show('login-form');
}

window.doLogin = async function() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value.trim();
  const errorEl = document.getElementById('login-error');
  const btn = document.getElementById('login-btn');

  if (!email || !password) {
    errorEl.textContent = 'E-posta ve şifre gerekli';
    errorEl.classList.remove('hidden');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Giriş yapılıyor...';
  errorEl.classList.add('hidden');

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    userUid = cred.user.uid;
    userDocRef = doc(db, "users", cred.user.uid);
    await checkProgress();
  } catch (e) {
    errorEl.textContent = '❌ E-posta veya şifre hatalı';
    errorEl.classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = 'Giriş Yap';
  }
};

async function checkProgress() {
  const snap = await getDoc(userDocRef);

  if (!snap.exists()) {
    show('not-logged-in');
    document.querySelector('#not-logged-in h2').textContent = "❌ Kullanıcı Bulunamadı";
    document.querySelector('#not-logged-in p').textContent = "Hesabın sistemde bulunamadı. Uygulamadan kayıt ol.";
    return;
  }

  const data = snap.data();
  const completed = data.completedSteps_okul || [];
  const lastQRTime = data.lastQRTime_okul;

  if (completed.includes(place.order)) {
    show('already-done');
    return;
  }

  const expectedOrder = completed.length + 1;
  if (place.order !== expectedOrder) {
    show('wrong-order');
    document.getElementById('wrong-order-msg').textContent = 
      `Önce ${expectedOrder}. bulmacayı çözmelisin. Sıralamayı atlayamazsın!`;
    return;
  }

  if (lastQRTime && place.order > 1) {
    const lastTime = lastQRTime.toDate();
    const diffSeconds = (Date.now() - lastTime.getTime()) / 1000;
    
    if (diffSeconds < MIN_WAIT_SECONDS) {
      const remaining = Math.ceil(MIN_WAIT_SECONDS - diffSeconds);
      show('too-fast');
      startCountdown(remaining);
      return;
    }
  }

  showRiddle();
}

function showRiddle() {
  show('riddle-card');
  document.getElementById('place-title').textContent = place.name;
  document.getElementById('riddle-text').textContent = place.riddle;
  
  document.getElementById('answer-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') checkAnswer();
  });
}

window.checkAnswer = async function() {
  const input = document.getElementById('answer-input');
  const errorMsg = document.getElementById('error-msg');
  const btn = document.getElementById('submit-btn');
  
  let answer = input.value.trim().toLowerCase().replace(/\s+/g, '');
  
  if (!answer) {
    showError("Lütfen bir cevap yaz!");
    return;
  }

  btn.disabled = true;
  errorMsg.classList.add('hidden');

  const isCorrect = place.answers.includes(answer);

  if (isCorrect) {
    await saveProgress();
    show('success-card');
    document.getElementById('earned-points').textContent = place.points;
  } else {
    showError("❌ Yanlış cevap, tekrar düşün!");
    btn.disabled = false;
    trackAttempt();
  }
};

async function saveProgress() {
  const snap = await getDoc(userDocRef);
  const data = snap.exists() ? snap.data() : {};
  const currentPoints = data.points || 0;
  
  await setDoc(userDocRef, {
    completedSteps_okul: arrayUnion(place.order),
    lastQRTime_okul: serverTimestamp(),
    points: currentPoints + place.points,
  }, { merge: true });
}

let attemptCount = 0;
function trackAttempt() {
  attemptCount++;
  document.getElementById('attempts').textContent = 
    `${attemptCount}. yanlış deneme`;
}

function showError(msg) {
  const errorMsg = document.getElementById('error-msg');
  errorMsg.textContent = msg;
  errorMsg.classList.remove('hidden');
}

function startCountdown(seconds) {
  const el = document.getElementById('countdown');
  let remaining = seconds;
  
  const update = () => {
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    el.textContent = `${m}:${s.toString().padStart(2, '0')}`;
    
    if (remaining <= 0) {
      location.reload();
    }
    remaining--;
  };
  
  update();
  setInterval(update, 1000);
}

function hideAll() {
  ['loading', 'not-logged-in', 'wrong-order', 'too-fast', 
   'already-done', 'riddle-card', 'success-card', 'login-form'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
}

function show(id) {
  hideAll();
  document.getElementById(id).classList.remove('hidden');
}
