import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB59dTt-evr9KCjhxEYbqrUlto7Xhen5jg",
  authDomain: "garden-aurelith.firebaseapp.com",
  projectId: "garden-aurelith",
  storageBucket: "garden-aurelith.firebasestorage.app",
  messagingSenderId: "1081430888189",
  appId: "1:1081430888189:web:b77475e6cfbd9b33cb3894",
  measurementId: "G-HR6S5JN122"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const $ = (id)=>document.getElementById(id);
const storageKey = "garden_mvp_state_v1";
let currentUser = null;

const state = {
  map: { nodes:{}, edges:[], rootId:null },
  stage: "login" // login | question | main
};

function saveState(){
  localStorage.setItem(storageKey, JSON.stringify(state));
  if(currentUser){
    const ref = doc(db, "users", currentUser.uid);
    setDoc(ref, { state, updatedAt: new Date().toISOString() }, { merge: true });
  }
}

async function loadState(){
  if(currentUser){
    const ref = doc(db, "users", currentUser.uid);
    const snap = await getDoc(ref);
    if(snap.exists() && snap.data().state){
      Object.assign(state, snap.data().state);
      return;
    }
  }
  const raw = localStorage.getItem(storageKey);
  if(raw){
    Object.assign(state, JSON.parse(raw));
  }
}

function uid(){
  return "n_"+Math.random().toString(36).slice(2,10);
}

function setStage(stage){
  state.stage = stage;
  $("loginPanel").classList.toggle("hidden", stage !== "login");
  $("questionPanel").classList.toggle("hidden", stage !== "question");
  $("mainPanel").classList.toggle("hidden", stage !== "main");
  $("userIcon").classList.toggle("hidden", stage === "login");
}

function setAuthStatus(text){
  $("authStatus").textContent = text;
}

function setUserIcon(email){
  const letter = email ? email[0].toUpperCase() : "U";
  $("userIcon").textContent = letter;
}

function setupVoice(){
  const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!Speech){
    $("voiceBtn").textContent = "🎙️ Voice (unsupported)";
    $("voiceBtn").disabled = true;
    return;
  }
  const recog = new Speech();
  recog.lang = "en-US";
  recog.onresult = (e)=>{
    const text = e.results[0][0].transcript;
    $("questionInput").value = text;
  };
  $("voiceBtn").onclick = ()=>{ recog.start(); };
}

async function runAIPlaceholder(input){
  $("questionStatus").textContent = "Analyzing...";
  await new Promise(r=>setTimeout(r, 1200));
  $("questionStatus").textContent = "";
  return {
    title: input,
    definition: `Definition for ${input} (placeholder).`,
    keyPoints: ["Point 1", "Point 2", "Point 3"],
    example: `Example of ${input} (placeholder).`
  };
}

function renderMainCard(card){
  $("infoCard").textContent = "";
  $("infoCard").innerHTML = `
    <div><b>${card.title}</b></div>
    <div>${card.definition}</div>
    <ul>
      ${card.keyPoints.map(p=>`<li>${p}</li>`).join("")}
    </ul>
    <div>${card.example}</div>
  `;
  $("chatArea").textContent = `You: ${card.title}`;
  $("relatedNodes").innerHTML = `
    <div class="chip">Related A</div>
    <div class="chip">Related B</div>
    <div class="chip">Related C</div>
  `;
}

function init(){
  setupVoice();

  onAuthStateChanged(auth, async (user)=>{
    currentUser = user || null;
    if(user){
      setAuthStatus(`Signed in: ${user.email}`);
      setUserIcon(user.email);
      await loadState();
      setStage(state.stage === "main" ? "main" : "question");
    } else {
      setAuthStatus("Not signed in");
      setUserIcon("U");
      setStage("login");
    }
  });

  $("signUpBtn").onclick = async ()=>{
    const email = $("authEmail").value.trim();
    const pass = $("authPassword").value.trim();
    if(!email || !pass) return alert("Email and password required.");
    await createUserWithEmailAndPassword(auth, email, pass);
  };

  $("signInBtn").onclick = async ()=>{
    const email = $("authEmail").value.trim();
    const pass = $("authPassword").value.trim();
    if(!email || !pass) return alert("Email and password required.");
    await signInWithEmailAndPassword(auth, email, pass);
  };

  document.addEventListener("keydown", async (e)=>{
    if(e.key === "Escape" && currentUser){ await signOut(auth); }
  });

  $("submitQuestionBtn").onclick = async ()=>{
    const input = $("questionInput").value.trim();
    if(!input) return alert("Please enter something you love.");
    const card = await runAIPlaceholder(input);
    state.map.nodes = { [uid()]: card };
    state.map.rootId = Object.keys(state.map.nodes)[0];
    state.stage = "main";
    saveState();
    setStage("main");
    renderMainCard(card);
  };
}

init();
