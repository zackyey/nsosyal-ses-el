const body = document.getElementById("vocab-body");
const countEl = document.getElementById("vocab-count");
const filterInput = document.getElementById("vocab-filter");
let vocabulary = [];

function render(list) {
  body.innerHTML = "";
  list.forEach((entry) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${escapeHtml(entry.text)}</td><td><span class="gloss">${escapeHtml(entry.gloss)}</span></td><td class="faint">${escapeHtml(entry.sign_id)}</td>`;
    body.appendChild(tr);
  });
}

fetch("data/vocabulary.json")
  .then((r) => r.json())
  .then((v) => {
    vocabulary = v;
    countEl.textContent = vocabulary.length;
    render(vocabulary);
  })
  .catch(() => {
    countEl.textContent = window.sesElContent ? window.sesElContent.demo.loadError : "0";
  });

filterInput.addEventListener("input", () => {
  const q = filterInput.value.trim().toLocaleLowerCase("tr");
  render(q ? vocabulary.filter((e) => e.text.toLocaleLowerCase("tr").includes(q) || e.gloss.toLocaleLowerCase("tr").includes(q)) : vocabulary);
});
