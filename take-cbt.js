// Firebase configuration for project: school-6425b
const firebaseConfig = {
  apiKey: "AIzaSyC3Ef_ZnjmU_X2JJDbUlDYv6enGkuuW2n0",
  authDomain: "school-6425b.firebaseapp.com",
  databaseURL: "https://school-6425b-default-rtdb.firebaseio.com",
  projectId: "school-6425b",
  storageBucket: "school-6425b.appspot.com",
  messagingSenderId: "929265479935",
  appId: "1:929265479935:web:af45ea5968ee50258a1cca"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

let currentCBT = null;
let currentQuestions = [];
let answers = [];
let index = 0;
let timer;
let timeLimit = 59 * 60;
let studentName = "";
let studentClass = "";
let allCBTs = [];
let readOnlyMode = false;

// Auth check
auth.onAuthStateChanged(user => {
  if (!user) return window.location.href = 'login.html';
  db.ref(`users/${user.uid}`).once('value').then(snap => {
    const data = snap.val() || {};
    if (data.role !== 'student') return alert('Access denied. Students only.');
    if (!data.name || !data.class) return alert('Incomplete student profile.');

    studentName = data.name;
    studentClass = data.class;
    document.getElementById("studentName").value = studentName;

    const classDropdown = document.getElementById("filterClass");
    classDropdown.innerHTML = `<option>${studentClass}</option>`;
    classDropdown.disabled = true;

    loadCBTData();
  });
});

// Load CBTs
function loadCBTData() {
  db.ref("cbtBank").once("value").then((snap) => {
    allCBTs = [];
    snap.forEach((child) => {
      const d = child.val();
      if (d.published && d.class === studentClass) {
        d.id = child.key;
        allCBTs.push(d);
      }
    });
    updateFilterOptions();
  });
}

// Filter dropdowns
function updateFilterOptions() {
  const yearSet = new Set(allCBTs.map(c => c.year));
  populateDropdown("filterYear", Array.from(yearSet));

  document.getElementById("filterYear").onchange = () => {
    const y = document.getElementById("filterYear").value;
    const filtered = allCBTs.filter(c => c.year === y);
    const termSet = new Set(filtered.map(c => c.term));
    populateDropdown("filterTerm", Array.from(termSet));
    clearDropdowns(["filterSubject", "filterType"]);
  };

  document.getElementById("filterTerm").onchange = () => {
    const y = document.getElementById("filterYear").value;
    const t = document.getElementById("filterTerm").value;
    const filtered = allCBTs.filter(c => c.year === y && c.term === t);
    const subjectSet = new Set(filtered.map(c => c.subject));
    populateDropdown("filterSubject", Array.from(subjectSet));
    clearDropdowns(["filterType"]);
  };

  document.getElementById("filterSubject").onchange = () => {
    const y = document.getElementById("filterYear").value;
    const t = document.getElementById("filterTerm").value;
    const s = document.getElementById("filterSubject").value;
    const filtered = allCBTs.filter(c => c.year === y && c.term === t && c.subject === s);
    const typeSet = new Set(filtered.map(c => c.type));
    populateDropdown("filterType", Array.from(typeSet));
  };
}

function populateDropdown(id, items) {
  const select = document.getElementById(id);
  select.innerHTML = '<option value="">Select</option>';
  items.forEach(item => {
    const opt = document.createElement("option");
    opt.value = opt.textContent = item;
    select.appendChild(opt);
  });
}

function clearDropdowns(ids) {
  ids.forEach(id => {
    document.getElementById(id).innerHTML = '<option value="">Select</option>';
  });
}

// Start CBT
function startCBT() {
  const year = document.getElementById("filterYear").value;
  const term = document.getElementById("filterTerm").value;
  const subj = document.getElementById("filterSubject").value;
  const type = document.getElementById("filterType").value;

  if (!year || !term || !subj || !type) return alert("Please complete all filters.");

  const match = allCBTs.find(c =>
    c.year === year && c.term === term &&
    c.class === studentClass && c.subject === subj && c.type === type
  );

  if (!match) return alert("No matching CBT found.");

  const resultKey = `${match.id}_${studentName.replace(/\s+/g, "_")}`;

  db.ref("results").orderByChild("cbtId").equalTo(match.id).once("value").then(snapshot => {
    let alreadySubmitted = false;
    let storedResult = null;

    snapshot.forEach(child => {
      const val = child.val();
      if (val.student === studentName && val.cbtId === match.id) {
        alreadySubmitted = true;
        storedResult = val;
      }
    });

    if (alreadySubmitted) {
      readOnlyMode = true;
      currentCBT = { id: match.id, student: studentName };
      currentQuestions = match.questions;
      answers = storedResult.answers || new Array(match.questions.length).fill(null);
      document.getElementById("start-section").classList.add("hidden");
      document.getElementById("cbt-section").classList.remove("hidden");
      document.getElementById("submitBtn").style.display = "none";
      alert("You have already taken this CBT. Your answers are shown below.");
      showQuestion();
      return;
    }

    db.ref("cbtProgress/" + resultKey).once("value").then(progressSnap => {
      const progress = progressSnap.val();
      if (progress) {
        if (confirm("Resume your previous attempt?")) {
          answers = progress.answers || new Array(match.questions.length).fill(null);
          index = progress.index || 0;
        } else {
          answers = new Array(match.questions.length).fill(null);
          index = 0;
        }
      } else {
        answers = new Array(match.questions.length).fill(null);
        index = 0;
      }

      currentCBT = { id: match.id, student: studentName };
      currentQuestions = match.questions;
      document.getElementById("start-section").classList.add("hidden");
      document.getElementById("cbt-section").classList.remove("hidden");
      showQuestion();
      startTimer();
    });
  });
}

// Display Question
function showQuestion() {
  const q = currentQuestions[index];
  const container = document.getElementById("questionContainer");
  const selected = answers[index];

  container.innerHTML = `
    <h3>Question ${index + 1} of ${currentQuestions.length}</h3>
    <p>${q.question}</p>
    ${['a', 'b', 'c', 'd'].map(opt => `
      <label>
        <input type="radio" name="option" value="${opt}" ${selected === opt ? 'checked' : ''} ${readOnlyMode ? 'disabled' : ''}>
        ${q[opt]}
      </label>
    `).join('')}
  `;

  if (!readOnlyMode) {
    document.querySelectorAll("input[name='option']").forEach(input => {
      input.addEventListener("change", (e) => {
        answers[index] = e.target.value;
        saveProgress();
      });
    });
  }

  updateNavButtons();
}

// Navigation buttons
function updateNavButtons() {
  document.getElementById("nextBtn").disabled = index >= currentQuestions.length - 1;
  document.getElementById("prevBtn").disabled = index <= 0;
}

function nextQuestion() {
  if (index < currentQuestions.length - 1) {
    index++;
    showQuestion();
  }
}

function prevQuestion() {
  if (index > 0) {
    index--;
    showQuestion();
  }
}

// Timer
function startTimer() {
  timer = setInterval(() => {
    timeLimit--;
    if (timeLimit <= 0) return submitCBT();
    const min = Math.floor(timeLimit / 60);
    const sec = timeLimit % 60;
    document.getElementById("timeLeft").textContent = `${min}:${sec.toString().padStart(2, "0")}`;
    document.getElementById("progressBar").style.width = `${(index / currentQuestions.length) * 100}%`;
  }, 1000);
}

// Save Progress
function saveProgress() {
  if (readOnlyMode) return;
  const key = `${currentCBT.id}_${currentCBT.student.replace(/\s+/g, "_")}`;
  db.ref("cbtProgress/" + key).set({
    student: currentCBT.student,
    cbtId: currentCBT.id,
    answers,
    index,
    timestamp: Date.now()
  });
}

// Submit CBT
function submitCBT() {
  if (readOnlyMode) return;
  if (answers.includes(null)) return alert("You must answer all questions before submitting.");
  clearInterval(timer);

  let score = 0;
  for (let i = 0; i < currentQuestions.length; i++) {
    if (answers[i] === currentQuestions[i].answer) score++;
  }

  const percentage = parseFloat(((score / currentQuestions.length) * 100).toFixed(2));

  db.ref("results").push({
    student: currentCBT.student,
    cbtId: currentCBT.id,
    answers,
    score,
    percentage,
    submitted: true,
    timestamp: Date.now()
  });

  alert("Your work has been submitted successfully. Your class teacher will mark and update your score.");
  window.location.href = "take-cbt.html";
}

// Global exposure
window.startCBT = startCBT;
window.nextQuestion = nextQuestion;
window.prevQuestion = prevQuestion;
window.submitCBT = submitCBT;
