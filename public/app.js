const noteTemplate = document.querySelector("#note-template");
const form = document.querySelector("#note-form");
const statusMessage = document.querySelector("#status");
const submitBtn = document.querySelector("#submit-btn");
const contentField = document.querySelector("#content");
const openFormBtn = document.querySelector("#open-form");
const closeFormBtn = document.querySelector("#close-form");
const modal = document.querySelector("#note-modal");
const modalOverlay = modal?.querySelector("[data-close]");

const sections = ["video", "research", "fun"];

function getSectionList(section) {
  return document.querySelector(`[data-section-list="${section}"]`);
}

function getSectionEmpty(section) {
  return document.querySelector(`[data-section-empty="${section}"]`);
}

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
  // Clear all section lists
  sections.forEach((section) => {
    const list = getSectionList(section);
    const empty = getSectionEmpty(section);
    if (list) list.innerHTML = "";
    if (empty) empty.hidden = true;
  });

  if (!notes.length) {
    sections.forEach((section) => {
      const empty = getSectionEmpty(section);
      if (empty) empty.hidden = false;
    });
    return;
  }

  // Group notes by section
  const notesBySection = {
    video: [],
    research: [],
    fun: []
  };

  notes.forEach((note) => {
    const section = note.section || "video"; // Default to video for old notes without section
    if (notesBySection[section]) {
      notesBySection[section].push(note);
    }
  });

  // Render notes in their respective sections
  sections.forEach((section) => {
    const list = getSectionList(section);
    const empty = getSectionEmpty(section);
    const sectionNotes = notesBySection[section] || [];

    if (sectionNotes.length === 0) {
      if (empty) empty.hidden = false;
      return;
    }

    if (empty) empty.hidden = true;

    const fragment = document.createDocumentFragment();
    sectionNotes.forEach((note) => {
      fragment.appendChild(createNoteElement(note));
    });
    if (list) list.appendChild(fragment);
  });
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
    content: formData.get("content")?.trim(),
    section: formData.get("section")?.trim()
  };

  if (!payload.content) {
    showStatus("Note content cannot be empty.", true);
    return;
  }

  if (!payload.section || !["video", "research", "fun"].includes(payload.section)) {
    showStatus("Please select a section.", true);
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
    closeModal();
  } catch (error) {
    console.error(error);
    showStatus(error.message || "Something went wrong. Try again.", true);
  } finally {
    submitBtn.disabled = false;
  }
}

function prependNote(note) {
  const section = note.section || "video";
  const list = getSectionList(section);
  const empty = getSectionEmpty(section);
  
  if (empty) empty.hidden = true;
  if (list) {
    const element = createNoteElement(note);
    list.insertAdjacentElement("afterbegin", element);
  }
}

async function handleDelete(id, noteElement) {
  noteElement?.classList.add("note--pending");
  try {
    const response = await fetch(`/api/notes/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      const { message } = await response.json().catch(() => ({}));
      throw new Error(message || "Failed to delete note.");
    }

    const section = noteElement.closest("[data-section]")?.dataset.section;
    const list = section ? getSectionList(section) : null;
    const empty = section ? getSectionEmpty(section) : null;

    noteElement.remove();
    
    if (list && list.children.length === 0 && empty) {
      empty.hidden = false;
    }
  } catch (error) {
    console.error(error);
    noteElement?.classList.remove("note--pending");
    alert(error.message || "Could not delete the note. Try again.");
  }
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

// Add click listeners to all section lists
sections.forEach((section) => {
  const list = getSectionList(section);
  if (list) {
    list.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      if (target.dataset.action === "delete") {
        const noteElement = target.closest(".note");
        const noteId = noteElement?.dataset.id;
        if (noteId) {
          handleDelete(noteId, noteElement);
        }
      }
    });
  }
});

fetchNotes();

