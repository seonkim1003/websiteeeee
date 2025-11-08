const notesList = document.querySelector("#notes-list");
const emptyState = document.querySelector("#empty-state");
const noteTemplate = document.querySelector("#note-template");
const form = document.querySelector("#note-form");
const statusMessage = document.querySelector("#status");
const submitBtn = document.querySelector("#submit-btn");
const contentField = document.querySelector("#content");
const openFormBtn = document.querySelector("#open-form");
const closeFormBtn = document.querySelector("#close-form");
const modal = document.querySelector("#note-modal");
const modalOverlay = modal?.querySelector("[data-close]");

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short"
});

async function fetchNotes() {
  try {
    const response = await fetch("/api/notes");
    if (!response.ok) {
      throw new Error("Failed to fetch notes");
    }
    const notes = await response.json();
    renderNotes(notes);
  } catch (error) {
    console.error(error);
    showStatus("Unable to load notes right now. Please refresh.", true);
  }
}

function renderNotes(notes) {
  notesList.innerHTML = "";

  if (!notes.length) {
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;

  const fragment = document.createDocumentFragment();
  notes.forEach((note) => {
    fragment.appendChild(createNoteElement(note));
  });
  notesList.appendChild(fragment);
}

function createNoteElement(note) {
  const instance = noteTemplate.content.firstElementChild.cloneNode(true);
  instance.dataset.id = note.id;

  const authorEl = instance.querySelector(".note__author");
  const timeEl = instance.querySelector(".note__time");
  const contentEl = instance.querySelector(".note__content");

  authorEl.textContent = note.author || "Anonymous";
  timeEl.textContent = formatDate(note.createdAt);
  timeEl.dateTime = note.createdAt;
  contentEl.textContent = note.content;

  return instance;
}

function formatDate(input) {
  if (!input) return "";
  try {
    return dateFormatter.format(new Date(input));
  } catch (error) {
    return input;
  }
}

function showStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle("form__status--error", Boolean(isError));
}

function openModal() {
  modal.hidden = false;
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  form.reset();
  showStatus("");
  requestAnimationFrame(() => {
    contentField?.focus();
  });
}

function closeModal() {
  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

async function handleSubmit(event) {
  event.preventDefault();

  const formData = new FormData(form);
  const payload = {
    author: formData.get("author")?.trim(),
    content: formData.get("content")?.trim()
  };

  if (!payload.content) {
    showStatus("Note content cannot be empty.", true);
    return;
  }

  submitBtn.disabled = true;
  showStatus("Saving...");

  try {
    const response = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const { message } = await response.json().catch(() => ({}));
      throw new Error(message || "Failed to save note.");
    }

    const note = await response.json();
    prependNote(note);
    form.reset();
    showStatus("Note saved!");
    contentField?.focus();
  } catch (error) {
    console.error(error);
    showStatus(error.message || "Something went wrong. Try again.", true);
  } finally {
    submitBtn.disabled = false;
  }
}

function prependNote(note) {
  emptyState.hidden = true;
  const element = createNoteElement(note);
  notesList.insertAdjacentElement("afterbegin", element);
}

form.addEventListener("submit", handleSubmit);
openFormBtn?.addEventListener("click", openModal);
closeFormBtn?.addEventListener("click", closeModal);
modalOverlay?.addEventListener("click", closeModal);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modal && !modal.hidden) {
    closeModal();
  }
});

fetchNotes();

