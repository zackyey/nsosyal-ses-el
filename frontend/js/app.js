const THEME_KEY = "ses-el-theme";
const LOCALE_KEY = "ses-el-locale";

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

function formatTemplate(str, vars) {
  return str.replace(/\{(\w+)\}/g, (_, k) => vars[k]);
}

// Steps through `items` one at a time on a hold/gap timer, driving `avatar` and
// calling back into `onStep`/`onDone`/`onEmpty` for scrub-label text. Shared by
// demo.js and results.js, which otherwise play near-identical sign sequences.
function createSequencePlayer(avatar) {
  let timer = null;

  function stop() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function play(items, { holdMs, gapMs, onStep, onDone, onEmpty, loopDelayMs }) {
    stop();
    if (items.length === 0) {
      avatar.idle();
      onEmpty();
      return;
    }
    let idx = 0;

    function step() {
      if (idx >= items.length) {
        avatar.idle();
        onDone();
        if (loopDelayMs != null) {
          timer = setTimeout(() => {
            idx = 0;
            step();
          }, loopDelayMs);
        }
        return;
      }
      const item = items[idx];
      avatar.playGloss(item.gloss, item.text);
      onStep(item, idx);
      idx += 1;
      timer = setTimeout(() => {
        avatar.idle();
        timer = setTimeout(step, gapMs);
      }, holdMs);
    }
    step();
  }

  return { play, stop };
}

function currentLocale() {
  return localStorage.getItem(LOCALE_KEY) || "tr";
}

function applyTheme(theme) {
  if (theme === "dark" || theme === "light") {
    document.documentElement.setAttribute("data-theme", theme);
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

function currentTheme() {
  return localStorage.getItem(THEME_KEY) || "system";
}

function nextTheme(theme) {
  if (theme === "system") return "light";
  if (theme === "light") return "dark";
  return "system";
}

applyTheme(currentTheme());

// "results.title" walks content.results.title. Elements opt into innerHTML
// via data-t-html since most copy is plain text and shouldn't risk breaking markup.
function applyContent(content) {
  document.querySelectorAll("[data-t]").forEach((el) => {
    const value = el.getAttribute("data-t").split(".").reduce((o, k) => o && o[k], content);
    if (value === undefined) return;
    if (el.hasAttribute("data-t-html")) {
      el.innerHTML = value;
    } else {
      el.textContent = value;
    }
  });

  document.querySelectorAll("[data-t-placeholder]").forEach((el) => {
    const value = el.getAttribute("data-t-placeholder").split(".").reduce((o, k) => o && o[k], content);
    if (value !== undefined) el.placeholder = value;
  });

  window.sesElContent = content;
  document.dispatchEvent(new CustomEvent("content-ready", { detail: content }));
}

// Guards against page scripts running before the async loadContent() fetch resolves.
function onContentReady(fn) {
  if (window.sesElContent) fn(window.sesElContent);
  else document.addEventListener("content-ready", (e) => fn(e.detail), { once: true });
}

async function loadContent() {
  try {
    const res = await fetch(`content/${currentLocale()}.json`);
    if (!res.ok) throw new Error(`content fetch failed: ${res.status}`);
    applyContent(await res.json());
  } catch (err) {
    // window.sesElContent stays unset; callers check for it rather than crashing.
  }
}

function themeLabel(theme, content) {
  const t = content.theme;
  const stateLabel = theme === "light" ? t.light : theme === "dark" ? t.dark : t.system;
  return `${t.prefix}: ${stateLabel}`;
}

window.addEventListener("DOMContentLoaded", async () => {
  await loadContent();

  const themeBtn = document.getElementById("theme-toggle");
  if (themeBtn && window.sesElContent) {
    themeBtn.title = themeLabel(currentTheme(), window.sesElContent);
    themeBtn.addEventListener("click", () => {
      const t = nextTheme(currentTheme());
      localStorage.setItem(THEME_KEY, t);
      applyTheme(t);
      themeBtn.title = themeLabel(t, window.sesElContent);
    });
  }

  const localeSelect = document.getElementById("locale-toggle");
  if (localeSelect) {
    localeSelect.value = currentLocale();
    // Reload rather than re-render: page scripts close over content once via
    // onContentReady, so a live-swapped object wouldn't reach bound strings.
    localeSelect.addEventListener("change", () => {
      localStorage.setItem(LOCALE_KEY, localeSelect.value);
      location.reload();
    });
  }

  const path = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a").forEach((a) => {
    if (a.getAttribute("href") === path) a.classList.add("active");
  });
});
