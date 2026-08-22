(function () {
  const input = document.getElementById("video-input");
  const filenameEl = document.getElementById("upload-filename");
  const uploadBtn = document.getElementById("upload-btn");
  const statusEl = document.getElementById("upload-status");
  const panel = document.getElementById("upload-panel");

  if (!input) return;

  let selectedFile = null;

  function setFile(file) {
    selectedFile = file;
    if (window.sesElContent) {
      filenameEl.textContent = file
        ? formatTemplate(window.sesElContent.home.uploadSelectedLabel, {
            name: file.name,
            size: (file.size / 1e6).toFixed(1),
          })
        : window.sesElContent.home.chooseFile;
    }
    uploadBtn.disabled = !file;
  }

  input.addEventListener("change", () => setFile(input.files[0] || null));

  ["dragover", "dragenter"].forEach((evt) =>
    panel.addEventListener(evt, (e) => {
      e.preventDefault();
      panel.classList.add("dragover");
    })
  );
  ["dragleave", "drop"].forEach((evt) =>
    panel.addEventListener(evt, (e) => {
      e.preventDefault();
      panel.classList.remove("dragover");
    })
  );
  panel.addEventListener("drop", (e) => {
    const file = e.dataTransfer.files[0];
    if (file) setFile(file);
  });

  uploadBtn.addEventListener("click", async () => {
    if (!selectedFile) return;
    if (!window.sesElContent) {
      await new Promise((resolve) => onContentReady(resolve));
    }
    const t = window.sesElContent.home;
    uploadBtn.disabled = true;
    statusEl.classList.remove("error");
    statusEl.textContent = t.uploadStatusProcessing;

    const form = new FormData();
    form.append("video", selectedFile);

    try {
      const res = await fetch("/api/process", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `request failed (${res.status})`);
      }
      sessionStorage.setItem("ses-el-result", JSON.stringify(data));
      window.location.href = "results.html";
    } catch (err) {
      statusEl.classList.add("error");
      statusEl.textContent = `${t.uploadStatusErrorPrefix} ${err.message}. ${t.uploadStatusErrorSuffix}`;
      uploadBtn.disabled = false;
    }
  });
})();
