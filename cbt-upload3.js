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
    const rawQuestions = XLSX.utils.sheet_to_json(sheet);

    const requiredFields = [
      "Question Number",
      "Question",
      "Option A",
      "Option B",
      "Option C",
      "Option D",
      "Correct Answer"
    ];

    const hasAllFields = requiredFields.every((field) =>
      Object.keys(rawQuestions[0] || {}).includes(field)
    );

    if (!hasAllFields) {
      alert("Excel format is incorrect. Please use the correct template.");
      return;
    }

    const questions = rawQuestions.map((row) => ({
      Question: row["Question"],
      OptionA: row["Option A"],
      OptionB: row["Option B"],
      OptionC: row["Option C"],
      OptionD: row["Option D"],
      Answer: row["Correct Answer"]
    }));

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
      published: false,
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

    if (!data) {
      grid.innerHTML = "<p>No CBT uploaded yet.</p>";
      return;
    }

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
      <div class="published">${Array.isArray(cbt.questions) ? cbt.questions.length : 0} Questions</div>
      <div>Status: <span class="${cbt.published ? "published" : ""}">${cbt.published ? "Published" : "Unpublished"}</span></div>
      <div class="actions">
        <button onclick="editCBT('${cbt.key}')">Edit</button>
        <button onclick="togglePublish('${cbt.key}', ${cbt.published})">
          ${cbt.published ? "Unpublish" : "Publish"}
        </button>
        <button onclick="deleteCBT('${cbt.key}')" style="background:#b30000;">Delete</button>
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

    document.getElementById("editClass").value = cbt.className;
    document.getElementById("editSubject").value = cbt.subject;
    document.getElementById("editType").value = cbt.type;

    const questionsDiv = document.getElementById("editQuestions");
    questionsDiv.innerHTML = "";

    (cbt.questions || []).forEach((q, i) => {
      const block = document.createElement("div");
      block.className = "question-block";
      block.innerHTML = `
        <label>Q${i + 1}</label>
        <input value="${q.Question || ""}" id="q${i}" placeholder="Question" />
        <input value="${q.OptionA || ""}" id="a${i}" placeholder="Option A" />
        <input value="${q.OptionB || ""}" id="b${i}" placeholder="Option B" />
        <input value="${q.OptionC || ""}" id="c${i}" placeholder="Option C" />
        <input value="${q.OptionD || ""}" id="d${i}" placeholder="Option D" />
        <input value="${q.Answer || ""}" id="ans${i}" placeholder="Answer" />
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

function togglePublish(key, currentStatus) {
  db.ref("cbts/" + key).update({ published: !currentStatus }).then(loadCBTs);
}

function deleteCBT(key) {
  if (!confirm("Are you sure you want to delete this CBT?")) return;
  db.ref("cbts/" + key).remove().then(loadCBTs);
}

window.onload = function () {
  loadCBTs(); // No longer loading options
};
