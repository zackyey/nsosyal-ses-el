onContentReady(function (content) {
  const t = content.demo;
  const input = document.getElementById("demo-input");
  const runBtn = document.getElementById("demo-run");
  const breakdownBody = document.getElementById("demo-breakdown");
  const avatar = createSignAvatar(document.getElementById("demo-sign-stage"));
  const scrubEl = document.getElementById("demo-scrub");

  input.value = t.inputDefault;

  let vocabulary = [];
  let playTimer = null;

  fetch("data/vocabulary.json")
    .then((r) => r.json())
    .then((v) => {
      vocabulary = v;
      run();
    })
    .catch(() => {
      scrubEl.textContent = t.loadError;
    });

  function stopPlayback() {
    if (playTimer) {
      clearTimeout(playTimer);
      playTimer = null;
    }
  }

  function playTokens(tokens) {
    stopPlayback();
    const matches = tokens.filter((tok) => tok.kind === "match");
    if (matches.length === 0) {
      avatar.idle();
      scrubEl.textContent = t.noMatches;
      return;
    }
    let idx = 0;
    const HOLD_MS = 1000;
    const GAP_MS = 300;

    function step() {
      if (idx >= matches.length) {
        avatar.idle();
        scrubEl.textContent = formatTemplate(t.scrubDone, { count: matches.length });
        return;
      }
      const m = matches[idx];
      avatar.playGloss(m.gloss, m.text);
      scrubEl.textContent = formatTemplate(t.scrubStep, { index: idx + 1, total: matches.length, text: m.text });
      idx += 1;
      playTimer = setTimeout(() => {
        avatar.idle();
        playTimer = setTimeout(step, GAP_MS);
      }, HOLD_MS);
    }
    step();
  }

  function run() {
    const text = input.value.trim();
    breakdownBody.innerHTML = "";
    if (!text) {
      avatar.idle();
      scrubEl.textContent = t.idle;
      return;
    }
    const { tokens, matchedWordCount, totalWordCount } = matchText(text, vocabulary);

    tokens.forEach((tok) => {
      const tr = document.createElement("tr");
      if (tok.kind === "match") {
        tr.innerHTML = `<td>${escapeHtml(tok.text)}</td><td><span class="gloss">${escapeHtml(tok.gloss)}</span></td>`;
      } else {
        tr.innerHTML = `<td>${escapeHtml(tok.text)}</td><td class="faint">${t.skipLabel}</td>`;
      }
      breakdownBody.appendChild(tr);
    });

    const summary = document.createElement("tr");
    summary.innerHTML = `<td class="faint">${t.totalLabel}</td><td class="faint">${matchedWordCount} / ${totalWordCount}</td>`;
    breakdownBody.appendChild(summary);

    playTokens(tokens);
  }

  runBtn.addEventListener("click", run);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) run();
  });
});
