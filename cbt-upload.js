// Initialize Firebase only once
if (!firebase.apps.length) {    const firebaseConfig = {
      apiKey: "AIzaSyB-yDq_hasmJ-feBHqNv7d8TxiIRORw9nE",
      authDomain: "year5f-ff94c.firebaseapp.com",
      databaseURL: "https://year5f-ff94c-default-rtdb.firebaseio.com",
      projectId: "year5f-ff94c",
      storageBucket: "year5f-ff94c.appspot.com",
      messagingSenderId: "725619624649",
      appId: "1:725619624649:web:8752cd00889bb07d41db18"
    };
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

document.getElementById("excelFile").addEventListener("change", handleUpload);

function handleUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    const year = document.getElementById("cbtYear").value;
    const term = document.getElementById("cbtTerm").value;
    const className = document.getElementById("cbtClass").value;
    const subject = document.getElementById("cbtSubject").value;
    const type = document.getElementById("cbtType").value;

    if (!year || !term || !className || !subject || !type || rows.length === 0) {
      alert("Please complete all fields and ensure the file has valid questions.");
      return;
    }

    const cbt = { year, term, className, subject, type, questions: rows };
    db.ref("cbts").push(cbt, () => {
      alert("CBT uploaded successfully");
      loadCBTs();
    });
  };
  reader.readAsArrayBuffer(file);
}

function loadCBTs() {
  const list = document.getElementById("cbtHistory");
  list.innerHTML = "";

  db.ref("cbts").once("value", (snapshot) => {
    snapshot.forEach((child) => {
      const cbt = child.val();

      const fy = document.getElementById("filterYear").value;
      const ft = document.getElementById("filterTerm").value;
      const fc = document.getElementById("filterClass").value;
      const fs = document.getElementById("filterSubject").value;
      const ftype = document.getElementById("filterType").value;

      const match =
        (!fy || fy === cbt.year) &&
        (!ft || ft === cbt.term) &&
        (!fc || fc === cbt.className) &&
        (!fs || fs === cbt.subject) &&
        (!ftype || ftype === cbt.type);

      if (!match) return;

      const div = document.createElement("div");
      div.className = "cbt-item";
      div.textContent = `${cbt.year} ${cbt.term} - ${cbt.className} ${cbt.subject} (${cbt.type})`;

      const editBtn = document.createElement("button");
      editBtn.textContent = "Edit";
      editBtn.onclick = () => editCBT(child.key, cbt);

      const publishBtn = document.createElement("button");
      publishBtn.textContent = "Publish";
      publishBtn.onclick = () => publishCBT(child.key, cbt);

      div.appendChild(editBtn);
      div.appendChild(publishBtn);
      list.appendChild(div);
    });
  });
}

let editKey = "";

function editCBT(key, cbt) {
  editKey = key;
  document.getElementById("editYear").value = cbt.year;
  document.getElementById("editTerm").value = cbt.term;
  document.getElementById("editClass").value = cbt.className;
  document.getElementById("editSubject").value = cbt.subject;
  document.getElementById("editType").value = cbt.type;

  const questionsDiv = document.getElementById("editQuestions");
  questionsDiv.innerHTML = "";
  cbt.questions.forEach((q, i) => {
    const div = document.createElement("div");
    div.className = "question-block";
    div.innerHTML = `
      <input id="q${i}" value="${q.Question}" placeholder="Question" />
      <input id="a${i}" value="${q.OptionA}" placeholder="A" />
      <input id="b${i}" value="${q.OptionB}" placeholder="B" />
      <input id="c${i}" value="${q.OptionC}" placeholder="C" />
      <input id="d${i}" value="${q.OptionD}" placeholder="D" />
      <input id="ans${i}" value="${q.Answer}" placeholder="Answer" />
    `;
    questionsDiv.appendChild(div);
  });

  document.getElementById("overlay").style.display = "flex";
  document.getElementById("editBox").style.display = "flex";
}

function saveEdits() {
  const year = document.getElementById("editYear").value;
  const term = document.getElementById("editTerm").value;
  const className = document.getElementById("editClass").value;
  const subject = document.getElementById("editSubject").value;
  const type = document.getElementById("editType").value;

  const blocks = document.getElementsByClassName("question-block");

  const questions = [];
  for (let i = 0; i < blocks.length; i++) {
    const q = document.getElementById("q" + i).value;
    const a = document.getElementById("a" + i).value;
    const b = document.getElementById("b" + i).value;
    const c = document.getElementById("c" + i).value;
    const d = document.getElementById("d" + i).value;
    const ans = document.getElementById("ans" + i).value;
    questions.push({ Question: q, OptionA: a, OptionB: b, OptionC: c, OptionD: d, Answer: ans });
  }

  if (!year || !term || !className || !subject || !type || questions.length === 0) {
    alert("Please fill all fields before saving.");
    return;
  }

  db.ref("cbts/" + editKey).update({ year, term, className, subject, type, questions }, () => {
    closeEditBox();
    loadCBTs();
    alert("CBT updated successfully.");
  });
}

function closeEditBox() {
  document.getElementById("overlay").style.display = "none";
  document.getElementById("editBox").style.display = "none";
}

function publishCBT(key, cbt) {
  const publishPath = `${cbt.year}/${cbt.term}/${cbt.className}/${cbt.subject}/${cbt.type}`;
  db.ref("published/" + publishPath).set(cbt, () => {
    alert("CBT Published");
  });
}

window.onload = loadCBTs;
