// 1) Deploy Code.gs as a Google Apps Script Web App.
// 2) Paste the /exec URL below.
const API_URL = "https://script.google.com/macros/s/AKfycbxtyUjf2TKjD7JVCqhwhsQ1eFJUbAnMWRoxFryfedL56q50Zh0E0yzq3bH_bAzC8Yn1/exec";

const QUESTIONS = [
  {
    id: "name",
    title: "What should we call you?",
    short: "Name",
    hint: "Your name, nickname, initials, or even a tiny self-portrait.",
    placeholder: "Type your name or nickname…",
    maxLength: 120,
  },
  {
    id: "origin",
    title: "Where are you from?",
    short: "From",
    hint: "A city, country, neighborhood, family story, or a place you carry with you.",
    placeholder: "Tell us where you’re from…",
    maxLength: 500,
  },
  {
    id: "recipe",
    title: "What’s your dumpling recipe?",
    short: "Recipe",
    hint: "Ingredients, technique, a family secret, or a completely improvised version.",
    placeholder: "Write your dumpling recipe…",
    maxLength: 1600,
  },
  {
    id: "inspiration",
    title: "What are you taking away from this?",
    short: "Thoughts",
    hint: "A thought, memory, feeling, question, sketch, or new idea.",
    placeholder: "Leave a thought or inspiration…",
    maxLength: 1200,
  },
];

const surveyEl = document.querySelector("#survey");
const template = document.querySelector("#questionTemplate");
const submitBtn = document.querySelector("#submitBtn");
const statusEl = document.querySelector("#status");
const wallSection = document.querySelector("#wallSection");
const wallEl = document.querySelector("#wall");
const wallFiltersEl = document.querySelector("#wallFilters");
const refreshBtn = document.querySelector("#refreshBtn");

const questionState = new Map();
let publicResponses = [];
let activeFilter = "all";

function buildSurvey() {
  QUESTIONS.forEach((question, index) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.dataset.questionId = question.id;

    node.querySelector(".question-number").textContent = String(index + 1).padStart(2, "0");
    node.querySelector(".question-title").textContent = question.title;
    node.querySelector(".question-hint").textContent = question.hint;

    const textarea = node.querySelector(".answer-text");
    textarea.placeholder = question.placeholder;
    textarea.maxLength = question.maxLength;

    const canvas = node.querySelector(".draw-canvas");
    const placeholder = node.querySelector(".canvas-placeholder");
    const penSize = node.querySelector(".pen-size");
    const clearBtn = node.querySelector(".clear-btn");
    const modeButtons = [...node.querySelectorAll(".mode-btn")];

    const state = {
      id: question.id,
      mode: "text",
      textarea,
      canvas,
      ctx: null,
      drawing: false,
      hasDrawing: false,
      penSize: Number(penSize.value),
      placeholder,
      resizeObserver: null,
    };

    questionState.set(question.id, state);

    modeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const mode = button.dataset.mode;
        state.mode = mode;

        modeButtons.forEach((btn) => {
          const selected = btn === button;
          btn.classList.toggle("is-active", selected);
          btn.setAttribute("aria-selected", String(selected));
        });

        node.querySelector(".text-panel").hidden = mode !== "text";
        node.querySelector(".draw-panel").hidden = mode !== "draw";

        if (mode === "draw") {
          requestAnimationFrame(() => resizeCanvas(state));
        }
      });
    });

    penSize.addEventListener("input", () => {
      state.penSize = Number(penSize.value);
    });

    clearBtn.addEventListener("click", () => clearCanvas(state));

    surveyEl.appendChild(node);
    setupCanvas(state);
  });
}

function setupCanvas(state) {
  const canvas = state.canvas;
  const ctx = canvas.getContext("2d");
  state.ctx = ctx;

  const start = (event) => {
    // event.preventDefault();
    state.drawing = true;
    state.hasDrawing = true;
    state.placeholder.hidden = true;

    const point = getCanvasPoint(canvas, event);
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    canvas.setPointerCapture?.(event.pointerId);
  };

  const move = (event) => {
    if (!state.drawing) return;
    // event.preventDefault();

    const point = getCanvasPoint(canvas, event);
    ctx.lineTo(point.x, point.y);
    ctx.strokeStyle = "#22201d";
    ctx.lineWidth = state.penSize * (window.devicePixelRatio || 1);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  };

  const stop = (event) => {
    if (!state.drawing) return;
    state.drawing = false;
    ctx.closePath();
    canvas.releasePointerCapture?.(event.pointerId);
  };

  canvas.addEventListener("pointerdown", start);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", stop);
  canvas.addEventListener("pointercancel", stop);
  canvas.addEventListener("pointerleave", stop);

  state.resizeObserver = new ResizeObserver(() => resizeCanvas(state));
  state.resizeObserver.observe(canvas.parentElement);
}

function resizeCanvas(state) {
  const canvas = state.canvas;
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  const dpr = window.devicePixelRatio || 1;
  const old = document.createElement("canvas");
  old.width = canvas.width;
  old.height = canvas.height;
  if (canvas.width && canvas.height) {
    old.getContext("2d").drawImage(canvas, 0, 0);
  }

  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  state.ctx = canvas.getContext("2d");

  if (old.width && old.height && state.hasDrawing) {
    state.ctx.drawImage(old, 0, 0, old.width, old.height, 0, 0, canvas.width, canvas.height);
  }
}

function getCanvasPoint(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function clearCanvas(state) {
  state.ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
  state.hasDrawing = false;
  state.placeholder.hidden = false;
}

function collectAnswers() {
  const answers = {};

  for (const question of QUESTIONS) {
    const state = questionState.get(question.id);

    if (state.mode === "text") {
      answers[question.id] = {
        type: "text",
        value: state.textarea.value.trim(),
      };
    } else {
      answers[question.id] = {
        type: "draw",
        value: state.hasDrawing ? state.canvas.toDataURL("image/png") : "",
      };
    }
  }

  return answers;
}

function validateAnswers(answers) {
  const missing = QUESTIONS.filter((q) => !answers[q.id]?.value);
  if (!missing.length) return true;

  const firstMissing = missing[0];
  statusEl.textContent = `Please answer “${firstMissing.title}” before pinning your notes.`;
  document.querySelector(`[data-question-id="${firstMissing.id}"]`)?.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
  return false;
}

async function submitResponses() {
  if (!isConfigured()) return;

  const answers = collectAnswers();
  if (!validateAnswers(answers)) return;

  submitBtn.disabled = true;
  statusEl.textContent = "Pinning your notes…";

  try {
    const payload = {
      action: "submit",
      createdAtClient: new Date().toISOString(),
      answers,
    };

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error(`Server returned ${response.status}`);
    const result = await response.json();
    if (!result.ok) throw new Error(result.error || "Submission failed");

    localStorage.setItem("dumplingWallSubmitted", "true");
    statusEl.textContent = "Pinned! Your notes are now part of the wall.";
    wallSection.hidden = false;

    wallSection.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

    // 不阻塞用户
    loadWall();
  } catch (error) {
    console.error(error);
    statusEl.textContent = "Something went wrong while saving. Check your Apps Script URL and deployment settings.";
  } finally {
    submitBtn.disabled = false;
  }
}

function isConfigured() {
  if (!API_URL || API_URL.includes("PASTE_YOUR")) {
    statusEl.textContent = "Add your Google Apps Script Web App URL in app.js first.";
    return false;
  }
  return true;
}

async function loadWall() {
  if (!isConfigured()) return;

  wallEl.innerHTML = '<p class="empty-wall">Loading notes…</p>';

  try {
    const response = await fetch(`${API_URL}?action=list&t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Server returned ${response.status}`);

    const result = await response.json();
    if (!result.ok) throw new Error(result.error || "Could not load responses");

    publicResponses = Array.isArray(result.responses) ? result.responses : [];
    renderWallFilters();
    renderWall();
  } catch (error) {
    console.error(error);
    wallEl.innerHTML = '<p class="empty-wall">Couldn’t load the community wall yet.</p>';
  }
}

function renderWallFilters() {
  const filters = [{ id: "all", label: "All" }, ...QUESTIONS.map((q) => ({ id: q.id, label: q.short }))];
  wallFiltersEl.innerHTML = "";

  filters.forEach((filter) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "filter-btn";
    button.classList.toggle("is-active", activeFilter === filter.id);
    button.textContent = filter.label;
    button.addEventListener("click", () => {
      activeFilter = filter.id;
      renderWallFilters();
      renderWall();
    });
    wallFiltersEl.appendChild(button);
  });
}

function renderWall() {
  const notes = [];

  publicResponses.forEach((response) => {
    QUESTIONS.forEach((question) => {
      if (activeFilter !== "all" && activeFilter !== question.id) return;

      const answer = response.answers?.[question.id];
      if (!answer?.value) return;

      notes.push({
        question,
        answer,
        author: response.displayName || "Anonymous",
        createdAt: response.createdAt || "",
      });
    });
  });

  if (!notes.length) {
    wallEl.innerHTML = '<p class="empty-wall">No notes here yet. Yours can be the first.</p>';
    return;
  }

  wallEl.innerHTML = "";

  notes.forEach((item, index) => {
    const note = document.createElement("article");
    note.className = "wall-note sticky-note";
    const tilt = ((index * 7) % 9) - 4;
    note.style.setProperty("--note-tilt", `${tilt * 0.35}deg`);

    const questionLabel = document.createElement("div");
    questionLabel.className = "note-question";
    questionLabel.textContent = item.question.short;
    note.appendChild(questionLabel);

    if (item.answer.type === "draw") {
      const img = document.createElement("img");
      img.src = item.answer.value;
      img.alt = `${item.question.short} drawing by ${item.author}`;
      img.loading = "lazy";
      note.appendChild(img);
    } else {
      const text = document.createElement("div");
      text.className = "note-text";
      text.textContent = item.answer.value;
      note.appendChild(text);
    }

    const author = document.createElement("div");
    author.className = "note-author";
    author.textContent = `— ${item.author}`;
    note.appendChild(author);

    wallEl.appendChild(note);
  });
}

submitBtn.addEventListener("click", submitResponses);
refreshBtn.addEventListener("click", loadWall);

buildSurvey();

if (localStorage.getItem("dumplingWallSubmitted") === "true") {
  wallSection.hidden = false;
  loadWall();
}
