onContentReady(function (content) {
  const t = content.demo;
  const input = document.getElementById("demo-input");
  const runBtn = document.getElementById("demo-run");
  const breakdownBody = document.getElementById("demo-breakdown");
  const avatar = createSignAvatar(document.getElementById("demo-sign-stage"));
  const scrubEl = document.getElementById("demo-scrub");

  input.value = t.inputDefault;

  let vocabulary = [];
  const player = createSequencePlayer(avatar);

  fetch("data/vocabulary.json")
    .then((r) => r.json())
    .then((v) => {
      vocabulary = v;
      run();
    })
    .catch(() => {
      scrubEl.textContent = t.loadError;
    });

  function playTokens(tokens) {
    const matches = tokens.filter((tok) => tok.kind === "match");
    player.play(matches, {
      holdMs: 1000,
      gapMs: 300,
      onStep: (m, idx) => {
        scrubEl.textContent = formatTemplate(t.scrubStep, { index: idx + 1, total: matches.length, text: m.text });
      },
      onDone: () => {
        scrubEl.textContent = formatTemplate(t.scrubDone, { count: matches.length });
      },
      onEmpty: () => {
        scrubEl.textContent = t.noMatches;
      },
    });
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
