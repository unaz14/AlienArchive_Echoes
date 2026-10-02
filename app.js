// --------------------------------------------------
// CONFIG
// --------------------------------------------------

const API_URL =
  "https://script.google.com/macros/s/AKfycbxtyUjf2TKjD7JVCqhwhsQ1eFJUbAnMWRoxFryfedL56q50Zh0E0yzq3bH_bAzC8Yn1/exec";

const WALL_CACHE_KEY = "dumplingWallCache";

const QUESTIONS = [
  {
    id: "name",
    title: "What should we call you?",
    short: "Name",
    hint: "Your name, nickname, or initials.",
    placeholder: "Type your name or nickname…",
    maxLength: 120,
  },
  {
    id: "origin",
    title: "Where are you from?",
    short: "From",
    hint:
      "A city, country, neighborhood, family story, or a place you carry with you.",
    placeholder: "Tell us where you’re from…",
    maxLength: 500,
  },
  {
    id: "recipe",
    title: "What’s your dumpling recipe?",
    short: "Recipe",
    hint:
      "Ingredients, technique, a family secret, or a completely improvised version.",
    placeholder: "Write your dumpling recipe…",
    maxLength: 1600,
  },
  {
    id: "inspiration",
    title: "What are you taking away from this?",
    short: "Thoughts",
    hint: "A thought, memory, feeling, question, or new idea.",
    placeholder: "Leave a thought or inspiration…",
    maxLength: 1200,
  },
];


// --------------------------------------------------
// DOM
// --------------------------------------------------

const surveyEl = document.querySelector("#survey");
const template = document.querySelector("#questionTemplate");

const submitBtn = document.querySelector("#submitBtn");
const statusEl = document.querySelector("#status");

const wallSection = document.querySelector("#wallSection");
const wallEl = document.querySelector("#wall");
const wallFiltersEl = document.querySelector("#wallFilters");
const refreshBtn = document.querySelector("#refreshBtn");


// --------------------------------------------------
// STATE
// --------------------------------------------------

const questionState = new Map();

let publicResponses = [];
let activeFilter = "all";


// --------------------------------------------------
// BUILD SURVEY
// --------------------------------------------------

function buildSurvey() {
  surveyEl.innerHTML = "";

  QUESTIONS.forEach((question, index) => {
    const node =
      template.content.firstElementChild.cloneNode(true);

    node.dataset.questionId = question.id;

    const numberEl =
      node.querySelector(".question-number");

    const titleEl =
      node.querySelector(".question-title");

    const hintEl =
      node.querySelector(".question-hint");

    const textarea =
      node.querySelector(".answer-text");

    if (numberEl) {
      numberEl.textContent =
        String(index + 1).padStart(2, "0");
    }

    if (titleEl) {
      titleEl.textContent = question.title;
    }

    if (hintEl) {
      hintEl.textContent = question.hint;
    }

    if (!textarea) {
      console.error(
        `No .answer-text found for ${question.id}`
      );

      return;
    }

    textarea.placeholder =
      question.placeholder;

    textarea.maxLength =
      question.maxLength;

    questionState.set(question.id, {
      textarea,
    });

    // Hide old drawing UI if it still exists in index.html
    const modeSwitcher =
      node.querySelector(".mode-switcher") ||
      node.querySelector(".mode-toggle") ||
      node.querySelector(".answer-mode");

    if (modeSwitcher) {
      modeSwitcher.hidden = true;
    }

    const drawPanel =
      node.querySelector(".draw-panel");

    if (drawPanel) {
      drawPanel.hidden = true;
      drawPanel.remove();
    }

    const textPanel =
      node.querySelector(".text-panel");

    if (textPanel) {
      textPanel.hidden = false;
    }

    surveyEl.appendChild(node);
  });
}


// --------------------------------------------------
// ANSWERS
// --------------------------------------------------

function collectAnswers() {
  const answers = {};

  QUESTIONS.forEach((question) => {
    const state =
      questionState.get(question.id);

    const value =
      state?.textarea?.value.trim() || "";

    answers[question.id] = {
      type: "text",
      value,
    };
  });

  return answers;
}


function validateAnswers(answers) {
  const missing =
    QUESTIONS.find(
      (question) =>
        !answers[question.id]?.value
    );

  if (!missing) {
    return true;
  }

  statusEl.textContent =
    `Please answer “${missing.title}” before pinning your notes.`;

  const card =
    document.querySelector(
      `[data-question-id="${missing.id}"]`
    );

  card?.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });

  const textarea =
    questionState.get(
      missing.id
    )?.textarea;

  setTimeout(() => {
    textarea?.focus();
  }, 500);

  return false;
}


// --------------------------------------------------
// SUBMIT
// --------------------------------------------------

async function submitResponses() {
  if (!isConfigured()) {
    return;
  }

  const answers =
    collectAnswers();

  if (!validateAnswers(answers)) {
    return;
  }

  submitBtn.disabled = true;
  statusEl.textContent =
    "Pinning your notes…";

  const payload = {
    action: "submit",
    createdAtClient:
      new Date().toISOString(),
    answers,
  };

  try {
    const response =
      await fetch(API_URL, {
        method: "POST",

        headers: {
          "Content-Type":
            "text/plain;charset=utf-8",
        },

        body:
          JSON.stringify(payload),
      });

    if (!response.ok) {
      throw new Error(
        `Server returned ${response.status}`
      );
    }

    const result =
      await response.json();

    if (!result.ok) {
      throw new Error(
        result.error ||
          "Submission failed"
      );
    }

    localStorage.setItem(
      "dumplingWallSubmitted",
      "true"
    );

    statusEl.textContent =
      "Pinned! Your notes are now part of the wall.";

    wallSection.hidden = false;

    // Show the user's new notes immediately
    addOptimisticResponse(
      answers,
      result
    );

    wallSection.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    // Refresh the real wall in the background.
    // We intentionally do NOT await this.
    loadWall({
      showLoading: false,
    });

  } catch (error) {
    console.error(error);

    statusEl.textContent =
      "Something went wrong while saving. Please try again.";

  } finally {
    submitBtn.disabled = false;
  }
}


// --------------------------------------------------
// OPTIMISTIC RESPONSE
// --------------------------------------------------

function addOptimisticResponse(
  answers,
  result
) {
  const temporaryResponse = {
    id:
      result?.id ||
      `local-${Date.now()}`,

    createdAt:
      result?.createdAt ||
      new Date().toISOString(),

    displayName:
      answers.name.value ||
      "Anonymous",

    answers,
  };

  publicResponses =
    [
      temporaryResponse,
      ...publicResponses,
    ];

  saveWallCache();

  renderWallFilters();
  renderWall();
}


// --------------------------------------------------
// API CONFIG CHECK
// --------------------------------------------------

function isConfigured() {
  if (
    !API_URL ||
    API_URL.includes(
      "PASTE_YOUR"
    )
  ) {
    statusEl.textContent =
      "Add your Google Apps Script Web App URL in app.js first.";

    return false;
  }

  return true;
}


// --------------------------------------------------
// WALL CACHE
// --------------------------------------------------

function getWallCache() {
  try {
    const cached =
      localStorage.getItem(
        WALL_CACHE_KEY
      );

    if (!cached) {
      return [];
    }

    const data =
      JSON.parse(cached);

    return Array.isArray(data)
      ? data
      : [];

  } catch (error) {
    console.warn(
      "Could not read wall cache",
      error
    );

    return [];
  }
}


function saveWallCache() {
  try {
    localStorage.setItem(
      WALL_CACHE_KEY,
      JSON.stringify(
        publicResponses
      )
    );

  } catch (error) {
    console.warn(
      "Could not save wall cache",
      error
    );
  }
}


// --------------------------------------------------
// LOAD WALL
// --------------------------------------------------

async function loadWall({
  showLoading = true,
} = {}) {

  if (!isConfigured()) {
    return;
  }

  if (
    showLoading &&
    !publicResponses.length
  ) {
    wallEl.innerHTML =
      '<p class="empty-wall">Loading notes…</p>';
  }

  try {
    const response =
      await fetch(
        `${API_URL}?action=list&t=${Date.now()}`,
        {
          cache: "no-store",
        }
      );

    if (!response.ok) {
      throw new Error(
        `Server returned ${response.status}`
      );
    }

    const result =
      await response.json();

    if (!result.ok) {
      throw new Error(
        result.error ||
          "Could not load responses"
      );
    }

    publicResponses =
      Array.isArray(
        result.responses
      )
        ? result.responses
        : [];

    saveWallCache();

    renderWallFilters();
    renderWall();

  } catch (error) {
    console.error(error);

    // If cached responses are already visible,
    // keep them instead of replacing them
    if (!publicResponses.length) {
      wallEl.innerHTML =
        '<p class="empty-wall">Couldn’t load the community wall yet.</p>';
    }
  }
}


// --------------------------------------------------
// FILTERS
// --------------------------------------------------

function renderWallFilters() {
  if (!wallFiltersEl) {
    return;
  }

  const filters = [
    {
      id: "all",
      label: "All",
    },

    ...QUESTIONS.map(
      (question) => ({
        id: question.id,
        label: question.short,
      })
    ),
  ];

  wallFiltersEl.innerHTML = "";

  filters.forEach((filter) => {
    const button =
      document.createElement(
        "button"
      );

    button.type = "button";

    button.className =
      "filter-btn";

    button.classList.toggle(
      "is-active",
      activeFilter === filter.id
    );

    button.textContent =
      filter.label;

    button.addEventListener(
      "click",
      () => {
        activeFilter =
          filter.id;

        renderWallFilters();
        renderWall();
      }
    );

    wallFiltersEl.appendChild(
      button
    );
  });
}


// --------------------------------------------------
// RENDER WALL
// --------------------------------------------------

function renderWall() {
  const notes = [];

  publicResponses.forEach(
    (response) => {

      QUESTIONS.forEach(
        (question) => {

          if (
            activeFilter !== "all" &&
            activeFilter !==
              question.id
          ) {
            return;
          }

          const answer =
            response.answers?.[
              question.id
            ];

          if (!answer?.value) {
            return;
          }

          notes.push({
            question,
            answer,

            author:
              response.displayName ||
              "Anonymous",

            createdAt:
              response.createdAt ||
              "",
          });
        }
      );
    }
  );


  if (!notes.length) {
    wallEl.innerHTML =
      '<p class="empty-wall">No notes here yet. Yours can be the first.</p>';

    return;
  }


  wallEl.innerHTML = "";


  notes.forEach(
    (item, index) => {

      const note =
        document.createElement(
          "article"
        );

      note.className =
        "wall-note sticky-note";


      // Slight rotation to keep the
      // handmade sticky-note feeling
      const tilt =
        ((index * 7) % 9) - 4;

      note.style.setProperty(
        "--note-tilt",
        `${tilt * 0.35}deg`
      );


      const questionLabel =
        document.createElement(
          "div"
        );

      questionLabel.className =
        "note-question";

      questionLabel.textContent =
        item.question.short;

      note.appendChild(
        questionLabel
      );


      // Text only
      const text =
        document.createElement(
          "div"
        );

      text.className =
        "note-text";

      text.textContent =
        item.answer.value;

      note.appendChild(text);


      const author =
        document.createElement(
          "div"
        );

      author.className =
        "note-author";

      author.textContent =
        `— ${item.author}`;

      note.appendChild(author);


      wallEl.appendChild(note);
    }
  );
}


// --------------------------------------------------
// INITIALIZE
// --------------------------------------------------

submitBtn.addEventListener(
  "click",
  submitResponses
);


refreshBtn?.addEventListener(
  "click",
  () => {
    loadWall({
      showLoading: false,
    });
  }
);


buildSurvey();


// If they have visited/submitted before,
// show cached notes immediately
if (
  localStorage.getItem(
    "dumplingWallSubmitted"
  ) === "true"
) {
  wallSection.hidden = false;

  const cached =
    getWallCache();

  if (cached.length) {
    publicResponses = cached;

    renderWallFilters();
    renderWall();

    // quietly refresh in background
    loadWall({
      showLoading: false,
    });

  } else {
    loadWall();
  }
}