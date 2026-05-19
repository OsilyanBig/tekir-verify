import { db } from './firebase-config.js';
import {
  doc, getDoc, updateDoc, setDoc, arrayUnion, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// 🎯 OKUL ROTASI MEKANLARI
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

// URL'den parametreleri al
const urlParams = new URLSearchParams(window.location.search);
const placeKey = urlParams.get('place');
const userUid = urlParams.get('uid');  // ← YENİ: UID URL'den geliyor
const place = PLACES[placeKey];

let userDocRef = null;

// Sayfa yüklendiğinde başlat
window.addEventListener('DOMContentLoaded', async () => {
  hideAll();

  // Geçersiz QR
  if (!place) {
    show('not-logged-in');
    document.querySelector('#not-logged-in h2').textContent = "❌ Geçersiz QR";
    document.querySelector('#not-logged-in p').textContent = "Bu QR kodu tanınmıyor.";
    return;
  }

  // UID yok = uygulamadan açılmadı
  if (!userUid) {
    show('not-logged-in');
    document.querySelector('#not-logged-in h2').textContent = "📱 Uygulamadan Okut!";
    document.querySelector('#not-logged-in p').textContent = "Bu QR'ı tarayıcıdan değil, Tekir uygulamasından okutmalısın.";
    return;
  }

  userDocRef = doc(db, "users", userUid);
  await checkProgress();
});

async function checkProgress() {
  const snap = await getDoc(userDocRef);

  // Kullanıcı Firestore'da yoksa
  if (!snap.exists()) {
    show('not-logged-in');
    document.querySelector('#not-logged-in h2').textContent = "❌ Kullanıcı Bulunamadı";
    document.querySelector('#not-logged-in p').textContent = "Hesabın sistemde bulunamadı. Uygulamaya tekrar giriş yap.";
    return;
  }

  const data = snap.data();
  const completed = data.completedSteps_okul || [];
  const lastQRTime = data.lastQRTime_okul;

  // 1️⃣ Zaten tamamlanmış mı?
  if (completed.includes(place.order)) {
    show('already-done');
    return;
  }

  // 2️⃣ Sıra kontrolü
  const expectedOrder = completed.length + 1;
  if (place.order !== expectedOrder) {
    show('wrong-order');
    document.getElementById('wrong-order-msg').textContent = 
      `Önce ${expectedOrder}. bulmacayı çözmelisin. Sıralamayı atlayamazsın!`;
    return;
  }

  // 3️⃣ Zaman kontrolü (ilk adım hariç)
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

  // ✅ Bulmacayı göster
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
   'already-done', 'riddle-card', 'success-card'].forEach(id => {
    document.getElementById(id).classList.add('hidden');
  });
}

function show(id) {
  hideAll();
  document.getElementById(id).classList.remove('hidden');
}
