// Deliberately a placeholder, not real TİD motion capture -- keeps timing
// and matching evaluable without pretending to be a finished animation.
const SIGN_AVATAR_SVG = `
<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="sign-avatar-svg">
  <path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
  <path d="M11 12V4.5a1.5 1.5 0 0 1 3 0V12" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
  <path d="M14 12V5.5a1.5 1.5 0 0 1 3 0V13" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
  <path d="M17 13V8.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-2a6 6 0 0 1-5.2-3l-2.4-4.1a1.4 1.4 0 0 1 2.3-1.6L8 13" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"/>
</svg>`;

function createSignAvatar(root) {
  root.innerHTML = `
    <div class="sign-avatar">${SIGN_AVATAR_SVG}</div>
    <div class="sign-gloss idle">·</div>
    <div class="sign-source-text"></div>
  `;
  const svgWrap = root.querySelector(".sign-avatar");
  const glossEl = root.querySelector(".sign-gloss");
  const sourceEl = root.querySelector(".sign-source-text");

  function playGloss(gloss, sourceText) {
    glossEl.textContent = gloss;
    glossEl.classList.remove("idle");
    sourceEl.textContent = sourceText || "";
    svgWrap.classList.remove("signing");
    // restart animation
    void svgWrap.offsetWidth;
    svgWrap.classList.add("signing");
  }

  function idle() {
    glossEl.textContent = "·";
    glossEl.classList.add("idle");
    sourceEl.textContent = "";
    svgWrap.classList.remove("signing");
  }

  return { playGloss, idle };
}
