const noteTemplate = document.querySelector("#note-template");
const form = document.querySelector("#note-form");
const statusMessage = document.querySelector("#status");
const submitBtn = document.querySelector("#submit-btn");
const contentField = document.querySelector("#content");
const openFormBtn = document.querySelector("#open-form");
const closeFormBtn = document.querySelector("#close-form");
const modal = document.querySelector("#note-modal");
const modalOverlay = modal?.querySelector("[data-close]");
const body = document.body;
const groupTitle = document.querySelector("#group-title");
const sectionInput = document.querySelector("#section");

const sections = ["homemadedelights", "studentselfdefenseadvocates"];
let activeGroup = "homemadedelights";

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

  // Filter notes for the active group only
  const activeGroupNotes = notes.filter((note) => {
    const section = note.section || "homemadedelights";
    return section === activeGroup;
  });

  // Render notes for the active group
  const list = getSectionList(activeGroup);
  const empty = getSectionEmpty(activeGroup);

  if (activeGroupNotes.length === 0) {
    if (empty) empty.hidden = false;
    return;
  }

  if (empty) empty.hidden = true;

  const fragment = document.createDocumentFragment();
  activeGroupNotes.forEach((note) => {
    fragment.appendChild(createNoteElement(note));
  });
  if (list) list.appendChild(fragment);
}

function createNoteElement(note) {
  const instance = noteTemplate.content.firstElementChild.cloneNode(true);
  instance.dataset.id = note.id;

  const authorEl = instance.querySelector(".note__author");
  const dateEl = instance.querySelector(".note__date");
  const contentEl = instance.querySelector(".note__content");
  const linkEl = instance.querySelector(".note__link");

  authorEl.textContent = note.author || "Anonymous";
  
  if (note.customDate) {
    dateEl.textContent = formatCustomDate(note.customDate);
    dateEl.style.display = "inline";
  } else {
    dateEl.style.display = "none";
  }
  
  contentEl.textContent = note.content;
  
  if (note.link) {
    linkEl.href = note.link;
    linkEl.textContent = note.link;
    linkEl.style.display = "block";
  } else {
    linkEl.style.display = "none";
  }

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

function formatCustomDate(dateString) {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return dateFormatter.format(date);
  } catch (error) {
    return dateString;
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
    section: formData.get("section")?.trim(),
    customDate: formData.get("customDate") || null,
    link: formData.get("link")?.trim() || null
  };

  if (!payload.content) {
    showStatus("Note content cannot be empty.", true);
    return;
  }

  // Automatically set section based on active group
  payload.section = activeGroup;

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
  // Only prepend if the note belongs to the active group
  const section = note.section || "homemadedelights";
  if (section !== activeGroup) return;
  
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

function switchGroup(group) {
  if (!sections.includes(group)) return;
  
  activeGroup = group;
  body.setAttribute("data-active-group", group);
  
  // Update navigation buttons
  document.querySelectorAll(".group-nav__button").forEach((btn) => {
    if (btn.dataset.group === group) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
  
  // Update title
  if (groupTitle) {
    groupTitle.textContent = group === "homemadedelights" 
      ? "Homemade Delights" 
      : "Student Self Defense Advocates";
  }
  
  // Show/hide screens
  document.querySelectorAll(".screen").forEach((screen) => {
    if (screen.dataset.screen === group) {
      screen.hidden = false;
    } else {
      screen.hidden = true;
    }
  });
  
  // Update form section input
  if (sectionInput) {
    sectionInput.value = group;
  }
  
  // Re-render notes for the active group
  fetchNotes();
}

// Initialize form section
if (sectionInput) {
  sectionInput.value = activeGroup;
}

// Navigation button handlers
document.querySelectorAll(".group-nav__button").forEach((btn) => {
  btn.addEventListener("click", () => {
    const group = btn.dataset.group;
    if (group) {
      switchGroup(group);
    }
  });
});

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
      } else if (target.classList.contains("note__author")) {
        // Toggle note content visibility when author/title is clicked
        const noteElement = target.closest(".note");
        const bodyEl = noteElement?.querySelector(".note__body");
        if (bodyEl) {
          bodyEl.classList.toggle("show");
        }
      }
    });
  }
});

// Initialize
switchGroup(activeGroup);
fetchNotes();

