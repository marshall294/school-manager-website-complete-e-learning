// cbt-upload.js

let editKey = "";
let allCBTs = [];

function handleUpload() {
  const fileInput = document.getElementById("excelFile");
  const file = fileInput.files[0];
  if (!file) return alert("Please select an Excel file.");

  const reader = new FileReader();
  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const questions = XLSX.utils.sheet_to_json(sheet);

    const year = document.getElementById("cbtYear").value;
    const term = document.getElementById("cbtTerm").value;
    const className = document.getElementById("cbtClass").value;
    const subject = document.getElementById("cbtSubject").value;
    const type = document.getElementById("cbtType").value;

    const key = `${year}_${term}_${className}_${subject}_${type}`.replace(/\s+/g, "_");

    db.ref("cbts/" + key).set({
      year,
      term,
      className,
      subject,
      type,
      questions,
      timestamp: Date.now(),
    });

    alert("CBT uploaded successfully.");
    fileInput.value = "";
    loadCBTs();
  };
  reader.readAsArrayBuffer(file);
}

function loadCBTs() {
  db.ref("cbts").once("value", (snapshot) => {
    const data = snapshot.val();
    const grid = document.getElementById("cbtHistory");
    grid.innerHTML = "";

    allCBTs = [];

    for (const key in data) {
      const cbt = data[key];
      cbt.key = key;
      allCBTs.push(cbt);
    }

    applyFilters();
  });
}

function applyFilters() {
  const year = document.getElementById("filterYear").value;
  const term = document.getElementById("filterTerm").value;
  const className = document.getElementById("filterClass").value;
  const subject = document.getElementById("filterSubject").value;
  const type = document.getElementById("filterType").value;

  const filtered = allCBTs.filter((cbt) => {
    return (
      (!year || cbt.year === year) &&
      (!term || cbt.term === term) &&
      (!className || cbt.className === className) &&
      (!subject || cbt.subject === subject) &&
      (!type || cbt.type === type)
    );
  });

  const grid = document.getElementById("cbtHistory");
  grid.innerHTML = filtered.length === 0 ? "<p>No CBT found.</p>" : "";

  filtered.sort((a, b) => b.timestamp - a.timestamp);

  filtered.forEach((cbt) => {
    const card = document.createElement("div");
    card.className = "cbt-card";
    card.innerHTML = `
      <h4>${cbt.subject} - ${cbt.type}</h4>
      <div>${cbt.className} | ${cbt.term} | ${cbt.year}</div>
      <div class="published">${cbt.questions.length} Questions</div>
      <div class="actions">
        <button onclick="editCBT('${cbt.key}')">Edit</button>
        <button onclick="deleteCBT('${cbt.key}')">Delete</button>
      </div>
    `;
    grid.appendChild(card);
  });
}

function editCBT(key) {
  editKey = key;
  db.ref("cbts/" + key).once("value", (snapshot) => {
    const cbt = snapshot.val();
    if (!cbt) return;

    document.getElementById("overlay").style.display = "block";
    document.getElementById("editBox").style.display = "block";

    const classSelect = document.getElementById("editClass");
    const subjectSelect = document.getElementById("editSubject");
    const typeSelect = document.getElementById("editType");
    const questionsDiv = document.getElementById("editQuestions");

    classSelect.innerHTML = `<option selected>${cbt.className}</option>`;
    subjectSelect.innerHTML = `<option selected>${cbt.subject}</option>`;
    typeSelect.innerHTML = `<option selected>${cbt.type}</option>`;

    questionsDiv.innerHTML = "";
    cbt.questions.forEach((q, i) => {
      const block = document.createElement("div");
      block.className = "question-block";
      block.innerHTML = `
        <label>Q${i + 1}</label>
        <input value="${q.Question}" id="q${i}" />
        <input value="${q.OptionA}" id="a${i}" placeholder="Option A" />
        <input value="${q.OptionB}" id="b${i}" placeholder="Option B" />
        <input value="${q.OptionC}" id="c${i}" placeholder="Option C" />
        <input value="${q.OptionD}" id="d${i}" placeholder="Option D" />
        <input value="${q.Answer}" id="ans${i}" placeholder="Answer" />
      `;
      questionsDiv.appendChild(block);
    });
  });
}

function closeEditBox() {
  document.getElementById("overlay").style.display = "none";
  document.getElementById("editBox").style.display = "none";
}

function saveEdits() {
  const className = document.getElementById("editClass").value;
  const subject = document.getElementById("editSubject").value;
  const type = document.getElementById("editType").value;
  const questionsDiv = document.getElementById("editQuestions");
  const blocks = questionsDiv.getElementsByClassName("question-block");
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

  db.ref("cbts/" + editKey).update({ className, subject, type, questions });
  closeEditBox();
  loadCBTs();
}

function deleteCBT(key) {
  if (!confirm("Are you sure you want to delete this CBT?")) return;
  db.ref("cbts/" + key).remove();
  loadCBTs();
}
function togglePublish(id, current) {
  db.ref(`cbtBank/${id}`).update({ published: !current });
}

function deleteCBT(id) {
  if (confirm("Are you sure?")) db.ref(`cbtBank/${id}`).remove();
}

function loadCBTs() {
  const container = document.getElementById("cbtHistory");
  const fYear = document.getElementById("filterYear").value;
  const fTerm = document.getElementById("filterTerm").value;
  const fClass = document.getElementById("filterClass").value;
  const fSubject = document.getElementById("filterSubject").value;
  const fType = document.getElementById("filterType").value;

  db.ref("cbtBank").on("value", snap => {
    const data = snap.val(), html = [];
    container.innerHTML = "";
    if (!data) return container.innerHTML = "No CBT uploaded.";

    Object.values(data).sort((a,b)=>b.id-a.id).forEach(item => {
      if ((fYear && item.year !== fYear) ||
          (fTerm && item.term !== fTerm) ||
          (fClass && item.class !== fClass) ||
          (fSubject && item.subject !== fSubject) ||
          (fType && item.type !== fType)) return;

      const div = document.createElement("div");
      div.className="cbt-card";
      div.innerHTML = `
        <h4>${item.subject} - ${item.type}</h4>
        <p><strong>Year:</strong> ${item.year}</p>
        <p><strong>Term:</strong> ${item.term}</p>
        <p><strong>Class:</strong> ${item.class}</p>
        <p><strong>Questions:</strong> ${item.questions.length}</p>
        <p><strong>Status:</strong> <span class="${item.published?'published':''}">${item.published ? "Published" : "Unpublished"}</span></p>
        <div class="actions">
          <button onclick="editCBT(${item.id})">Edit</button>
          <button onclick="togglePublish(${item.id}, ${item.published})">${item.published ? "Unpublish" : "Publish"}</button>
          <button onclick="deleteCBT(${item.id})" style="background:#b30000;">Delete</button>
        </div>`;
      container.appendChild(div);
    });
  });
}

// Initial load
window.onload = loadCBTs;
