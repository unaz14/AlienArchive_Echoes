// --------------------------------------------------
// CONFIG
// --------------------------------------------------

const API_URL =
  "https://script.google.com/macros/s/AKfycbxtyUjf2TKjD7JVCqhwhsQ1eFJUbAnMWRoxFryfedL56q50Zh0E0yzq3bH_bAzC8Yn1/exec";

const RESPONSE_CACHE_KEY = "alienArchiveResponses";

// Carousel movement speed in pixels per second.
// Change these independently whenever you want to tune each year.
const CAROUSEL_SPEED = {
  2026: 30,
  2025: 30,
};

// Add your archive image files here. The page will keep working if a file
// is missing and will show a placeholder instead.
const ARCHIVE_2026_IMAGES = [
  // "assets/2026/dumpling-01.svg",
  // "assets/2026/dumpling-02.svg",
  // "assets/2026/dumpling-03.svg",
  // "assets/2026/dumpling-04.svg",
];

const ARCHIVE_2025_IMAGES = [
  "assets/2025/dumpling25-01.svg",
  "assets/2025/dumpling25-02.svg",
  "assets/2025/dumpling25-03.svg",
  "assets/2025/dumpling25-04.svg",
  "assets/2025/dumpling25-05.svg",
  "assets/2025/dumpling25-06.svg",
  "assets/2025/dumpling25-07.svg",
  "assets/2025/dumpling25-08.svg",
];

// --------------------------------------------------
// DOM
// --------------------------------------------------

const introPage = document.querySelector("#introPage");
const homePage = document.querySelector("#homePage");
const addPage = document.querySelector("#addPage");
const openArchiveBtn = document.querySelector("#openArchiveBtn");
const addDumplingBtn = document.querySelector("#addDumplingBtn");
const backHomeBtn = document.querySelector("#backHomeBtn");
const transitionLayer = document.querySelector("#transitionLayer");
const origamiTransition = document.querySelector("#origamiTransition");
const origamiTransitionFrame = document.querySelector("#origamiTransitionFrame");
const carousel2026 = document.querySelector("#carousel2026");
const carousel2025 = document.querySelector("#carousel2025");
const dumplingForm = document.querySelector("#dumplingForm");
const dumplingText = document.querySelector("#dumplingText");
const emailInput = document.querySelector("#emailInput");
const postBtn = document.querySelector("#postBtn");
const formStatus = document.querySelector("#formStatus");
const archiveModal = document.querySelector("#archiveModal");
const archiveModalContent = document.querySelector("#archiveModalContent");
const archiveModalClose = document.querySelector("#archiveModalClose");

let currentPage = introPage;
let publicResponses = readCache();
let isTransitioning = false;

function prepareVisiblePage(page) {
  if (page !== homePage) return;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => refreshCarouselPixelSpeeds());
  });
}

// --------------------------------------------------
// PAGE TRANSITIONS
// --------------------------------------------------

function showPage(nextPage) {
  [introPage, homePage, addPage].forEach((page) => {
    const active = page === nextPage;
    page.hidden = !active;
    page.classList.toggle("is-active", active);
  });
  currentPage = nextPage;
  window.scrollTo(0, 0);
  prepareVisiblePage(nextPage);
}

function fadeToPage(nextPage, duration = 680) {
  if (isTransitioning) return;
  isTransitioning = true;

  const previousPage = currentPage;
  previousPage.classList.add("is-leaving");

  window.setTimeout(() => {
    previousPage.classList.remove("is-active", "is-leaving");
    previousPage.hidden = true;

    nextPage.hidden = false;
    nextPage.classList.remove("is-active", "is-leaving");
    void nextPage.offsetWidth;
    currentPage = nextPage;
    window.scrollTo(0, 0);
    prepareVisiblePage(nextPage);

    requestAnimationFrame(() => nextPage.classList.add("is-active"));
  }, Math.round(duration * 0.42));

  window.setTimeout(() => {
    isTransitioning = false;
  }, duration + 120);
}

function coverTransition(sourceEl, nextPage, { color = "#f3efe6", fullRadius } = {}) {
  if (isTransitioning) return;
  isTransitioning = true;
  document.body.classList.add("is-transitioning");

  const previousPage = currentPage;
  const rect = sourceEl.getBoundingClientRect();
  const radius = getComputedStyle(sourceEl).borderRadius;
  const destinationRadius =
    fullRadius ?? (sourceEl === addDumplingBtn ? "64px" : "10px");

  Object.assign(transitionLayer.style, {
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    borderRadius: radius,
    background: color,
    opacity: "1",
  });
  transitionLayer.style.setProperty("--full-radius", destinationRadius);

  transitionLayer.classList.add("is-running");
  previousPage.classList.add("is-leaving");

  requestAnimationFrame(() => {
    requestAnimationFrame(() => transitionLayer.classList.add("is-full"));
  });

  // Swap pages only after the expanding cover has fully hidden the old page.
  window.setTimeout(() => {
    previousPage.classList.remove("is-active", "is-leaving");
    previousPage.hidden = true;

    nextPage.hidden = false;
    nextPage.classList.remove("is-active", "is-leaving");
    void nextPage.offsetWidth;
    currentPage = nextPage;
    window.scrollTo(0, 0);
    prepareVisiblePage(nextPage);
  }, 700);

  // Fade the cover and destination together for a softer reveal.
  window.setTimeout(() => {
    nextPage.classList.add("is-active");
    transitionLayer.style.opacity = "0";
  }, 790);

  window.setTimeout(() => {
    transitionLayer.className = "transition-layer";
    transitionLayer.removeAttribute("style");
    document.body.classList.remove("is-transitioning");
    isTransitioning = false;
  }, 1320);
}


function runOrigamiIntroTransition() {
  if (isTransitioning || !origamiTransition || !origamiTransitionFrame) return;
  isTransitioning = true;
  document.body.classList.add("is-transitioning");

  const previousPage = currentPage;
  const rect = openArchiveBtn.getBoundingClientRect();

  origamiTransition.hidden = false;
  origamiTransition.className = "origami-transition";
  Object.assign(origamiTransition.style, {
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  });

  // Load an IDENTICAL preview frame first. Only after it is sitting exactly on
  // top of the clicked origami do we hide the original and tell this same frame
  // to start unfolding. This avoids the tiny camera/framing jump between iframes.
  const startTransition = () => {
    origamiTransitionFrame.removeEventListener("load", startTransition);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        origamiTransition.classList.add("is-active");

        requestAnimationFrame(() => {
          // At this moment both folded papers have the same rect + same preview camera.
          openArchiveBtn.classList.add("is-opening");
          previousPage.classList.add("is-leaving");
          origamiTransitionFrame.contentWindow?.postMessage({
            type: "alien-archive-origami-start",
            startH: rect.height,
          }, "*");

          requestAnimationFrame(() => origamiTransition.classList.add("is-full"));
        });
      });
    });
  };

  origamiTransitionFrame.addEventListener("load", startTransition, { once: true });
  origamiTransitionFrame.src = `origami-player.html?mode=preview&t=${Date.now()}`;

  // Timings below are measured from the click. The iframe normally loads almost
  // immediately because it is local; the generous offsets keep the existing feel.
  window.setTimeout(() => {
    previousPage.classList.remove("is-active", "is-leaving");
    previousPage.hidden = true;

    homePage.hidden = false;
    homePage.classList.remove("is-active", "is-leaving");
    void homePage.offsetWidth;
    currentPage = homePage;
    window.scrollTo(0, 0);
    prepareVisiblePage(homePage);
  }, 2050);

  // Start fading during the latter half of the unfold instead of waiting
  // for the paper to be completely open.
  window.setTimeout(() => {
    origamiTransition.classList.add("is-fading");
  }, 2350);

  // Let the paper become almost fully transparent before Home begins to appear.
  // This keeps the transition from feeling like the Home page is arriving too early.
  window.setTimeout(() => {
    homePage.classList.add("is-active");
  }, 3950);

  window.setTimeout(() => {
    origamiTransition.hidden = true;
    origamiTransition.className = "origami-transition";
    origamiTransition.removeAttribute("style");
    origamiTransitionFrame.src = "about:blank";
    openArchiveBtn.classList.remove("is-opening");
    document.body.classList.remove("is-transitioning");
    isTransitioning = false;
  }, 4800);
}

// --------------------------------------------------
// CAROUSELS
// --------------------------------------------------

function createImageCard(src, index, year) {
  const card = document.createElement("article");
  card.className = "carousel-card image-card image-note-card";
  card.style.setProperty("--tilt", `${((index % 5) - 2) * 0.18}deg`);
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.setAttribute("aria-label", `Open ${year} archive image ${index + 1}`);
  card.dataset.cardType = "image";
  card.dataset.src = src;
  card.dataset.year = String(year);
  card.dataset.index = String(index + 1);

  const imageCanvas = document.createElement("div");
  imageCanvas.className = "image-note-canvas";

  const img = document.createElement("img");
  img.src = src;
  img.alt = `Alien Archive dumpling from ${year}`;
  img.loading = "eager";

  const fallback = () => {
    img.remove();
    imageCanvas.classList.add("is-placeholder");
    imageCanvas.textContent = `${year} image ${String(index + 1).padStart(2, "0")}`;
  };

  img.addEventListener("error", fallback, { once: true });
  imageCanvas.appendChild(img);
  card.appendChild(imageCanvas);
  return card;
}

function normalizeResponseText(value) {
  if (value == null) return "";

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }

  if (Array.isArray(value)) {
    return value
      .map(normalizeResponseText)
      .filter(Boolean)
      .join(", ")
      .trim();
  }

  if (typeof value === "object") {
    if ("value" in value) return normalizeResponseText(value.value);
    if ("text" in value) return normalizeResponseText(value.text);
    if ("answer" in value) return normalizeResponseText(value.answer);
  }

  return "";
}

function getResponseText(response) {
  const candidates = [
    response?.dumpling,
    response?.answers?.dumpling,
    response?.answers?.dumpling?.value,
    response?.answers?.recipe,
    response?.answers?.recipe?.value,
  ];

  for (const candidate of candidates) {
    const text = normalizeResponseText(candidate);
    if (text) return text;
  }

  return "";
}

function createTextCard(response, index) {
  const card = document.createElement("article");
  card.className = "carousel-card text-card";
  card.style.setProperty("--tilt", `${((index % 5) - 2) * 0.24}deg`);
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.setAttribute("aria-label", "Open dumpling note");
  card.dataset.cardType = "text";
  card.dataset.text = getResponseText(response);
  if (response.createdAt) card.dataset.createdAt = response.createdAt;

  const text = document.createElement("p");
  text.textContent = card.dataset.text;
  card.appendChild(text);

  if (response.createdAt) {
    const time = document.createElement("time");
    const date = new Date(response.createdAt);
    if (!Number.isNaN(date.getTime())) {
      time.dateTime = date.toISOString();
      time.textContent = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      card.appendChild(time);
    }
  }

  return card;
}

function fillTrack(track, sourceNodes) {
  track.innerHTML = "";
  const usableNodes = sourceNodes.length ? sourceNodes : [createFallbackCard()];

  // Make one group long enough to comfortably cross the viewport, then clone it.
  const group = document.createDocumentFragment();
  for (let repeat = 0; repeat < Math.max(2, Math.ceil(8 / usableNodes.length)); repeat += 1) {
    usableNodes.forEach((node) => group.appendChild(node.cloneNode(true)));
  }

  const wrapperA = document.createElement("div");
  const wrapperB = document.createElement("div");
  wrapperA.className = "carousel-group";
  wrapperB.className = "carousel-group";
  wrapperA.appendChild(group);

  Array.from(wrapperA.children).forEach((node) => wrapperB.appendChild(node.cloneNode(true)));
  track.append(wrapperA, wrapperB);
}

function createFallbackCard() {
  const card = document.createElement("article");
  card.className = "carousel-card image-card";
  const placeholder = document.createElement("div");
  placeholder.className = "image-placeholder";
  placeholder.textContent = "Archive image";
  card.appendChild(placeholder);
  return card;
}

function renderCarousels() {
  const responseCards = publicResponses
    .filter((response) => getResponseText(response))
    .map(createTextCard);

  const cards2026 = [
    ...responseCards,
    ...ARCHIVE_2026_IMAGES.map((src, index) => createImageCard(src, index, 2026)),
  ];

  const cards2025 = ARCHIVE_2025_IMAGES.map((src, index) => createImageCard(src, index, 2025));

  fillTrack(carousel2026, cards2026);
  fillTrack(carousel2025, cards2025);

  requestAnimationFrame(() => {
    setCarouselPixelSpeed(carousel2026, CAROUSEL_SPEED[2026]);
    setCarouselPixelSpeed(carousel2025, CAROUSEL_SPEED[2025]);
  });
}

function setCarouselPixelSpeed(track, pixelsPerSecond) {
  const group = track.querySelector(".carousel-group");
  if (!group || !pixelsPerSecond) return;

  const groupWidth = group.getBoundingClientRect().width;
  if (!groupWidth) {
    track.classList.remove("is-ready");
    return;
  }

  const trackGap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 0;
  const distance = groupWidth + trackGap / 2;
  const duration = distance / pixelsPerSecond;
  track.style.animationDuration = `${duration}s`;
  track.classList.add("is-ready");
}

function refreshCarouselPixelSpeeds() {
  setCarouselPixelSpeed(carousel2026, CAROUSEL_SPEED[2026]);
  setCarouselPixelSpeed(carousel2025, CAROUSEL_SPEED[2025]);
}


function tweenCarouselSpeed(track, targetRate, duration = 420) {
  const animation = track.getAnimations().find((item) => item.animationName === "marquee") || track.getAnimations()[0];
  if (!animation) return;

  const startRate = animation.playbackRate || 1;
  const startTime = performance.now();

  function step(now) {
    const progress = Math.min(1, (now - startTime) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    animation.playbackRate = startRate + (targetRate - startRate) * eased;
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

function setupCarouselHoverSpeed() {
  document.querySelectorAll(".carousel-track").forEach((track) => {
    track.addEventListener("pointerenter", () => tweenCarouselSpeed(track, 0.38));
    track.addEventListener("pointerleave", () => tweenCarouselSpeed(track, 1));
  });
}

let carouselResizeTimer;
window.addEventListener("resize", () => {
  window.clearTimeout(carouselResizeTimer);
  carouselResizeTimer = window.setTimeout(refreshCarouselPixelSpeeds, 120);
});

// --------------------------------------------------
// ARCHIVE VIEWER — shared-element card transition
// --------------------------------------------------

let activeArchiveSource = null;
let activeArchiveClone = null;
let activeArchiveSourceRect = null;
let activeArchiveAnimation = null;

function setCarouselAnimationPaused(paused) {
  document.querySelectorAll(".carousel-track").forEach((track) => {
    track.getAnimations().forEach((animation) => {
      if (paused) animation.pause();
      else animation.play();
    });
  });
}

function getExpandedCardRect(sourceRect) {
  const ratio = sourceRect.width / sourceRect.height;
  const maxWidth = Math.min(window.innerWidth * 0.72, 620);
  const maxHeight = Math.min(window.innerHeight * 0.76, 760);

  let width = maxWidth;
  let height = width / ratio;
  if (height > maxHeight) {
    height = maxHeight;
    width = height * ratio;
  }

  return {
    left: (window.innerWidth - width) / 2,
    top: (window.innerHeight - height) / 2,
    width,
    height,
  };
}

function applyFixedCardRect(element, rect) {
  Object.assign(element.style, {
    position: "fixed",
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    margin: "0",
  });
}

function openArchiveCard(card) {
  if (!archiveModal || !archiveModalContent || !card || activeArchiveClone) return;

  setCarouselAnimationPaused(true);

  activeArchiveSource = card;
  activeArchiveSourceRect = card.getBoundingClientRect();
  const targetRect = getExpandedCardRect(activeArchiveSourceRect);

  const clone = card.cloneNode(true);
  clone.classList.add("archive-shared-card");
  clone.removeAttribute("tabindex");
  clone.removeAttribute("role");
  clone.removeAttribute("aria-label");
  clone.style.setProperty("--tilt", getComputedStyle(card).getPropertyValue("--tilt") || "0deg");
  applyFixedCardRect(clone, activeArchiveSourceRect);

  activeArchiveClone = clone;
  archiveModalContent.innerHTML = "";
  archiveModalContent.appendChild(clone);
  archiveModal.hidden = false;
  document.body.classList.add("modal-open");
  card.classList.add("is-shared-source");

  requestAnimationFrame(() => {
    archiveModal.classList.add("is-open");
    clone.classList.add("is-expanding");

    activeArchiveAnimation = clone.animate(
      [
        {
          left: `${activeArchiveSourceRect.left}px`,
          top: `${activeArchiveSourceRect.top}px`,
          width: `${activeArchiveSourceRect.width}px`,
          height: `${activeArchiveSourceRect.height}px`,
        },
        {
          left: `${targetRect.left}px`,
          top: `${targetRect.top}px`,
          width: `${targetRect.width}px`,
          height: `${targetRect.height}px`,
        },
      ],
      {
        duration: 520,
        easing: "cubic-bezier(.22,.72,.22,1)",
        fill: "forwards",
      }
    );

    activeArchiveAnimation.addEventListener("finish", () => {
      applyFixedCardRect(clone, targetRect);
      clone.classList.add("is-expanded");
      activeArchiveAnimation = null;
      archiveModalClose?.focus({ preventScroll: true });
    }, { once: true });
  });
}

function closeArchiveModal() {
  if (!archiveModal || archiveModal.hidden || !activeArchiveClone) return;
  if (activeArchiveAnimation) activeArchiveAnimation.cancel();

  const clone = activeArchiveClone;
  const currentRect = clone.getBoundingClientRect();
  const returnRect = activeArchiveSource?.isConnected
    ? activeArchiveSource.getBoundingClientRect()
    : activeArchiveSourceRect;

  clone.classList.remove("is-expanded");
  archiveModal.classList.remove("is-open");

  activeArchiveAnimation = clone.animate(
    [
      {
        left: `${currentRect.left}px`,
        top: `${currentRect.top}px`,
        width: `${currentRect.width}px`,
        height: `${currentRect.height}px`,
      },
      {
        left: `${returnRect.left}px`,
        top: `${returnRect.top}px`,
        width: `${returnRect.width}px`,
        height: `${returnRect.height}px`,
      },
    ],
    {
      duration: 460,
      easing: "cubic-bezier(.4,0,.2,1)",
      fill: "forwards",
    }
  );

  activeArchiveAnimation.addEventListener("finish", () => {
    activeArchiveSource?.classList.remove("is-shared-source");
    archiveModal.hidden = true;
    archiveModalContent.innerHTML = "";
    document.body.classList.remove("modal-open");
    activeArchiveSource = null;
    activeArchiveClone = null;
    activeArchiveSourceRect = null;
    activeArchiveAnimation = null;
    setCarouselAnimationPaused(false);
  }, { once: true });
}

function handleCarouselActivation(event) {
  const card = event.target.closest(".carousel-card");
  if (!card) return;
  openArchiveCard(card);
}

function handleCarouselKeydown(event) {
  if (event.key !== "Enter" && event.key !== " ") return;
  const card = event.target.closest(".carousel-card");
  if (!card) return;
  event.preventDefault();
  openArchiveCard(card);
}

// --------------------------------------------------
// DATA
// --------------------------------------------------

function isConfigured() {
  return Boolean(API_URL && !API_URL.includes("PASTE_YOUR"));
}

function readCache() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RESPONSE_CACHE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCache() {
  try {
    localStorage.setItem(RESPONSE_CACHE_KEY, JSON.stringify(publicResponses.slice(0, 120)));
  } catch (error) {
    console.warn("Could not cache archive responses", error);
  }
}

async function loadResponses() {
  if (!isConfigured()) return;

  try {
    const response = await fetch(`${API_URL}?action=list&t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Server returned ${response.status}`);
    const result = await response.json();
    if (!result.ok) throw new Error(result.error || "Could not load responses");

    publicResponses = Array.isArray(result.responses) ? result.responses : [];
    saveCache();
    renderCarousels();
  } catch (error) {
    console.warn("Using cached archive responses", error);
  }
}

async function submitDumpling(event) {
  event.preventDefault();
  if (postBtn.disabled) return;

  const dumpling = dumplingText.value.trim();
  const email = emailInput.value.trim();

  if (!dumpling) {
    formStatus.textContent = "Write something about your dumpling first.";
    dumplingText.focus();
    return;
  }

  if (email && !emailInput.checkValidity()) {
    formStatus.textContent = "That email address doesn’t look quite right.";
    emailInput.focus();
    return;
  }

  postBtn.disabled = true;
  formStatus.textContent = "Posting…";

  const optimistic = {
    id: `local-${Date.now()}`,
    createdAt: new Date().toISOString(),
    dumpling,
    email,
  };

  try {
    if (isConfigured()) {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "submit",
          createdAtClient: optimistic.createdAt,
          dumpling,
          email,
          // Backward compatibility with the earlier backend until Code.gs is redeployed.
          answers: {
            recipe: { type: "text", value: dumpling },
            inspiration: { type: "text", value: email },
          },
        }),
      });

      if (!response.ok) throw new Error(`Server returned ${response.status}`);
      const result = await response.json();
      if (!result.ok) throw new Error(result.error || "Submission failed");

      optimistic.id = result.id || optimistic.id;
      optimistic.createdAt = result.createdAt || optimistic.createdAt;
    }

    publicResponses = [optimistic, ...publicResponses.filter((item) => item.id !== optimistic.id)];
    saveCache();
    renderCarousels();

    formStatus.textContent = "";
    dumplingForm.classList.add("is-sending");

    window.setTimeout(() => {
      // Keep the note in its sent/off-screen state while the Add page fades out.
      // Removing is-sending here would make it snap back into view for one frame.
      dumplingForm.reset();
      fadeToPage(homePage, 760);
      postBtn.disabled = false;
      loadResponses();

      window.setTimeout(() => {
        dumplingForm.classList.remove("is-sending");
      }, 420);
    }, 800);
  } catch (error) {
    console.error(error);
    postBtn.disabled = false;
    formStatus.textContent = "Something went wrong while saving. Please try again.";
  }
}

// --------------------------------------------------
// EVENTS + INIT
// --------------------------------------------------

openArchiveBtn.addEventListener("click", runOrigamiIntroTransition);
addDumplingBtn.addEventListener("click", () => coverTransition(addDumplingBtn, addPage));
backHomeBtn.addEventListener("click", () => showPage(homePage));
dumplingForm.addEventListener("submit", submitDumpling);
carousel2026.addEventListener("click", handleCarouselActivation);
carousel2025.addEventListener("click", handleCarouselActivation);
carousel2026.addEventListener("keydown", handleCarouselKeydown);
carousel2025.addEventListener("keydown", handleCarouselKeydown);
archiveModalClose?.addEventListener("click", closeArchiveModal);
archiveModal?.addEventListener("click", (event) => {
  if (event.target === archiveModal) closeArchiveModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && archiveModal && !archiveModal.hidden) closeArchiveModal();
});

renderCarousels();
setupCarouselHoverSpeed();
loadResponses();
