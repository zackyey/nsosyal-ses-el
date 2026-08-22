onContentReady(function (content) {
  const t = content.results;
  const raw = sessionStorage.getItem("ses-el-result");

  if (!raw) {
    document.getElementById("no-result").style.display = "block";
    return;
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    document.getElementById("no-result").style.display = "block";
    return;
  }

  document.getElementById("result-view").style.display = "block";

  const timeline = data.timeline || [];
  const matched = data.matched_words || 0;
  const total = data.total_words || 0;
  const pct = total > 0 ? Math.round((matched / total) * 100) : 0;

  document.getElementById("stat-matched").textContent = matched;
  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-pct").textContent = pct + "%";

  const modeSignsBtn = document.getElementById("mode-signs");
  const modePipBtn = document.getElementById("mode-pip");
  const signsOnlyMode = document.getElementById("signs-only-mode");
  const pipMode = document.getElementById("pip-mode");

  modeSignsBtn.addEventListener("click", () => {
    modeSignsBtn.classList.add("active");
    modePipBtn.classList.remove("active");
    signsOnlyMode.style.display = "block";
    pipMode.style.display = "none";
    playStandaloneSequence();
  });

  modePipBtn.addEventListener("click", () => {
    modePipBtn.classList.add("active");
    modeSignsBtn.classList.remove("active");
    pipMode.style.display = "block";
    signsOnlyMode.style.display = "none";
    stopStandaloneSequence();
  });

  const standaloneAvatar = createSignAvatar(document.getElementById("sign-stage-standalone"));
  const scrubEl = document.getElementById("scrub-standalone");
  let standaloneTimer = null;

  function stopStandaloneSequence() {
    if (standaloneTimer) {
      clearTimeout(standaloneTimer);
      standaloneTimer = null;
    }
  }

  function playStandaloneSequence() {
    stopStandaloneSequence();
    if (timeline.length === 0) {
      standaloneAvatar.idle();
      scrubEl.textContent = t.scrubNoMatches;
      return;
    }
    let idx = 0;
    const HOLD_MS = 1100;
    const GAP_MS = 350;

    function step() {
      if (idx >= timeline.length) {
        standaloneAvatar.idle();
        scrubEl.textContent = formatTemplate(t.scrubDone, { count: timeline.length });
        standaloneTimer = setTimeout(() => {
          idx = 0;
          step();
        }, 1800);
        return;
      }
      const entry = timeline[idx];
      standaloneAvatar.playGloss(entry.gloss, entry.text);
      scrubEl.textContent = formatTemplate(t.scrubStep, {
        index: idx + 1,
        total: timeline.length,
        text: entry.text,
        start: entry.start.toFixed(1),
        end: entry.end.toFixed(1),
      });
      idx += 1;
      standaloneTimer = setTimeout(() => {
        standaloneAvatar.idle();
        standaloneTimer = setTimeout(step, GAP_MS);
      }, HOLD_MS);
    }
    step();
  }

  playStandaloneSequence();

  const pipAvatar = createSignAvatar(document.getElementById("sign-stage-pip"));
  const video = document.getElementById("result-video");
  if (data.video_url) {
    video.src = data.video_url;
  }

  let activeIndex = -1;
  video.addEventListener("timeupdate", () => {
    const now = video.currentTime;
    const idx = timeline.findIndex((e) => now >= e.start && now <= e.end);
    if (idx !== activeIndex) {
      activeIndex = idx;
      if (idx === -1) {
        pipAvatar.idle();
      } else {
        pipAvatar.playGloss(timeline[idx].gloss, timeline[idx].text);
      }
    }
  });
  video.addEventListener("seeking", () => {
    activeIndex = -1;
    pipAvatar.idle();
  });

  let ratingValue = null;
  document.querySelectorAll("#rating-buttons button").forEach((btn) => {
    btn.addEventListener("click", () => {
      ratingValue = btn.dataset.value;
      document.querySelectorAll("#rating-buttons button").forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
    });
  });

  document.getElementById("feedback-submit").addEventListener("click", () => {
    const statusEl = document.getElementById("feedback-status");
    if (!ratingValue) {
      statusEl.classList.add("error");
      statusEl.textContent = t.feedbackNeedsRating;
      return;
    }
    const entry = {
      rating: Number(ratingValue),
      comment: document.getElementById("feedback-text").value.trim(),
      matched_words: matched,
      total_words: total,
      submitted_at: new Date().toISOString(),
    };
    const existing = JSON.parse(localStorage.getItem("ses-el-feedback") || "[]");
    existing.push(entry);
    localStorage.setItem("ses-el-feedback", JSON.stringify(existing));

    statusEl.classList.remove("error");
    statusEl.textContent = t.feedbackThanks;
    document.getElementById("feedback-submit").disabled = true;
  });
});
