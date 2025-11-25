const noteTemplate = document.querySelector("#note-template");
const form = document.querySelector("#note-form");
const statusMessage = document.querySelector("#status");
const submitBtn = document.querySelector("#submit-btn");
const contentField = document.querySelector("#content");
const openFormBtn = document.querySelector("#open-form");
const closeFormBtn = document.querySelector("#close-form");
const cancelBtn = document.querySelector("#cancel-btn");
const modal = document.querySelector("#note-modal");
const modalOverlay = modal?.querySelector("[data-close]");
const feedbackModal = document.querySelector("#feedback-modal");
const feedbackModalOverlay = feedbackModal?.querySelector("[data-close-feedback]");
const closeFeedbackBtn = document.querySelector("#close-feedback");
const body = document.body;
const groupTitle = document.querySelector("#group-title");
const sectionInput = document.querySelector("#section");
const noteIdInput = document.querySelector("#note-id");

const sections = ["homemadedelights", "studentselfdefenseadvocates"];
const statuses = ["student_feedback", "helen_feedback", "final_approved"];
const postTypes = ["fun", "informational", "research", "video_fun", "video_informational", "video_research"];

const postTypeLabels = {
  fun: "Fun",
  informational: "Informational",
  research: "Research",
  video_fun: "Video Fun",
  video_informational: "Video Informational",
  video_research: "Video Research"
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short"
});

let activeGroup = "homemadedelights";
let editingNoteId = null;

// Helper functions for read/unread feedback tracking
function getReadFeedbackIds(noteId) {
  try {
    const stored = localStorage.getItem(`readFeedback_${noteId}`);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function markFeedbackAsRead(noteId, feedbackId) {
  const readIds = getReadFeedbackIds(noteId);
  if (!readIds.includes(feedbackId)) {
    readIds.push(feedbackId);
    localStorage.setItem(`readFeedback_${noteId}`, JSON.stringify(readIds));
  }
}

function getUnreadCount(noteId, feedbackArray) {
  if (!feedbackArray || feedbackArray.length === 0) return 0;
  const readIds = getReadFeedbackIds(noteId);
  return feedbackArray.filter(fb => !readIds.includes(fb.id)).length;
}

function formatDate(input) {
  if (!input) return "";
  try {
    return dateFormatter.format(new Date(input));
  } catch (error) {
    return input;
  }
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function getBoard(section) {
  return document.querySelector(`[data-board="${section}"]`);
}

function getColumn(section, status) {
  const board = getBoard(section);
  return board?.querySelector(`[data-column="${status}"]`);
}

function getSectionEmpty(section) {
  return document.querySelector(`[data-section-empty="${section}"]`);
}

function getPostTypeSection(column, postType) {
  let section = column.querySelector(`[data-post-type="${postType}"]`);
  if (!section) {
    section = document.createElement("div");
    section.className = "board__post-type-section";
    section.dataset.postType = postType;
    const header = document.createElement("h4");
    header.className = "board__post-type-header";
    header.textContent = postTypeLabels[postType];
    section.appendChild(header);
    const list = document.createElement("div");
    list.className = "board__post-list";
    section.appendChild(list);
    
    // Insert in correct order
    const existingSections = Array.from(column.querySelectorAll(".board__post-type-section"));
    let inserted = false;
    for (let i = 0; i < postTypes.length; i++) {
      if (postTypes[i] === postType) {
        // Find where to insert based on order
        const insertBefore = existingSections.find(s => {
          const sType = s.dataset.postType;
          return postTypes.indexOf(sType) > i;
        });
        if (insertBefore) {
          column.insertBefore(section, insertBefore);
        } else {
          column.appendChild(section);
        }
        inserted = true;
        break;
      }
    }
    if (!inserted) {
      column.appendChild(section);
    }
  }
  return section.querySelector(".board__post-list");
}

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
    showStatus("Unable to load posts right now. Please refresh.", true);
  }
}

function renderNotes(notes) {
  // Clear all columns
  sections.forEach((section) => {
    statuses.forEach((status) => {
      const column = getColumn(section, status);
      if (column) {
        const postTypeSections = column.querySelectorAll(".board__post-type-section");
        postTypeSections.forEach(s => s.remove());
      }
    });
  });

  // Filter notes for the active group only
  const activeGroupNotes = notes.filter((note) => {
    const section = note.section || "homemadedelights";
    return section === activeGroup;
  });

  const empty = getSectionEmpty(activeGroup);
  const board = getBoard(activeGroup);
  
  if (activeGroupNotes.length === 0) {
    if (empty) empty.hidden = false;
    if (board) board.style.display = "none";
    return;
  }

  if (empty) empty.hidden = true;
  if (board) board.style.display = "grid";

  // Group notes by status and post type
  activeGroupNotes.forEach((note) => {
    const status = note.status || "student_feedback";
    const postType = note.postType || "fun";
    const column = getColumn(activeGroup, status);
    if (column) {
      const postList = getPostTypeSection(column, postType);
      const element = createNoteElement(note);
      postList.appendChild(element);
    }
  });
}

function createNoteElement(note) {
  const instance = noteTemplate.content.firstElementChild.cloneNode(true);
  instance.dataset.id = note.id;
  instance.dataset.status = note.status || "student_feedback";
  instance.dataset.postType = note.postType || "fun";

  const authorEl = instance.querySelector(".post-card__author");
  const typeEl = instance.querySelector(".post-card__type");
  const contentEl = instance.querySelector(".post-card__content");
  const linkEl = instance.querySelector(".post-card__link");
  const revisionEl = instance.querySelector(".post-card__revision strong");
  const dateEl = instance.querySelector(".post-card__date");
  const feedbackBadge = instance.querySelector("[data-feedback-badge]");
  const feedbackBadgeCount = instance.querySelector(".post-card__feedback-badge-count");
  const toggleBtn = instance.querySelector(".post-card__toggle");
  const feedbackBtn = instance.querySelector(".post-card__feedback-btn");
  const feedbackBtnText = instance.querySelector(".post-card__feedback-btn-text");

  authorEl.textContent = note.author || "Anonymous";
  typeEl.textContent = postTypeLabels[note.postType] || "Fun";
  
  if (note.content) {
    contentEl.textContent = note.content;
  }
  
  if (note.link) {
    linkEl.href = note.link;
    linkEl.textContent = note.link;
    linkEl.style.display = "block";
  }

  revisionEl.textContent = note.revision || 1;
  
  // Display date
  if (note.customDate) {
    dateEl.textContent = formatDate(note.customDate);
  } else if (note.createdAt) {
    dateEl.textContent = formatDate(note.createdAt);
  } else {
    dateEl.textContent = "";
  }
  
  const feedback = note.feedback || [];
  const unreadCount = getUnreadCount(note.id, feedback);
  
  // Update feedback badge to show unread count
  if (unreadCount > 0) {
    feedbackBadgeCount.textContent = unreadCount;
    feedbackBadge.style.display = "flex";
    feedbackBadge.classList.add("post-card__feedback-badge--unread");
  } else {
    feedbackBadge.style.display = "none";
    feedbackBadge.classList.remove("post-card__feedback-badge--unread");
  }

  // Update button text to show unread count
  if (unreadCount > 0) {
    feedbackBtnText.textContent = `💬 Feedback (${unreadCount} unread)`;
  } else if (feedback.length > 0) {
    feedbackBtnText.textContent = `💬 Feedback (${feedback.length})`;
  } else {
    feedbackBtnText.textContent = "💬 Feedback";
  }

  // Open fullscreen feedback modal
  function openFeedbackModal() {
    const feedbackModalList = document.querySelector("#feedback-list");
    const feedbackPostInfo = document.querySelector("#feedback-post-info");
    const feedbackModalName = document.querySelector("#feedback-name");
    const feedbackModalText = document.querySelector("#feedback-text");
    const feedbackModalSubmit = document.querySelector("#feedback-submit");
    
    // Store note ID in modal for later use
    feedbackModal.dataset.noteId = note.id;
    
    // Set post info
    feedbackPostInfo.innerHTML = `
      <div class="feedback-modal__post-author">${escapeHtml(note.author || "Anonymous")}</div>
      <div class="feedback-modal__post-type">${escapeHtml(postTypeLabels[note.postType] || "Fun")}</div>
      <div class="feedback-modal__post-revision">Revision ${note.revision || 1}</div>
    `;
    
    // Render feedback list in modal with checkmarks
    function renderModalFeedbackList(feedbackArray) {
      feedbackModalList.innerHTML = "";
      if (!feedbackArray || feedbackArray.length === 0) {
        feedbackModalList.innerHTML = "<p class='feedback-modal__empty'>No feedback yet.</p>";
        return;
      }
      
      const readIds = getReadFeedbackIds(note.id);
      
      // Sort by date (newest first)
      const sortedFeedback = [...feedbackArray].sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA;
      });
      
      sortedFeedback.forEach((fb) => {
        const isRead = readIds.includes(fb.id);
        const fbItem = document.createElement("div");
        fbItem.className = `feedback-modal__item ${isRead ? 'feedback-modal__item--read' : 'feedback-modal__item--unread'}`;
        fbItem.dataset.feedbackId = fb.id;
        fbItem.style.cursor = "pointer";
        
        const fbHeader = document.createElement("div");
        fbHeader.className = "feedback-modal__item-header";
        
        const fbLeft = document.createElement("div");
        fbLeft.className = "feedback-modal__item-left";
        
        const checkmark = document.createElement("span");
        checkmark.className = `feedback-modal__checkmark ${isRead ? 'feedback-modal__checkmark--checked' : ''}`;
        checkmark.innerHTML = isRead ? "✓" : "";
        checkmark.setAttribute("aria-label", isRead ? "Mark as unread" : "Mark as read");
        
        const fbAuthor = document.createElement("span");
        fbAuthor.className = "feedback-modal__item-author";
        fbAuthor.textContent = fb.feedbacker || "Anonymous";
        
        fbLeft.appendChild(checkmark);
        fbLeft.appendChild(fbAuthor);
        fbHeader.appendChild(fbLeft);
        
        const fbDate = document.createElement("span");
        fbDate.className = "feedback-modal__item-date";
        fbDate.textContent = formatDate(fb.createdAt);
        
        fbHeader.appendChild(fbDate);
        fbItem.appendChild(fbHeader);
        
        const fbText = document.createElement("div");
        fbText.className = "feedback-modal__item-text";
        if (fb.text && fb.text.trim()) {
          fbText.textContent = fb.text;
        } else {
          fbText.textContent = "(No comment provided)";
          fbText.style.fontStyle = "italic";
          fbText.style.color = "var(--text-secondary)";
        }
        fbItem.appendChild(fbText);
        
        // Click handler to mark as read/unread
        fbItem.addEventListener("click", () => {
          const currentReadIds = getReadFeedbackIds(note.id);
          const currentlyRead = currentReadIds.includes(fb.id);
          
          if (currentlyRead) {
            // Mark as unread
            const newReadIds = currentReadIds.filter(id => id !== fb.id);
            localStorage.setItem(`readFeedback_${note.id}`, JSON.stringify(newReadIds));
            fbItem.classList.remove("feedback-modal__item--read");
            fbItem.classList.add("feedback-modal__item--unread");
            checkmark.classList.remove("feedback-modal__checkmark--checked");
            checkmark.innerHTML = "";
          } else {
            // Mark as read
            markFeedbackAsRead(note.id, fb.id);
            fbItem.classList.remove("feedback-modal__item--unread");
            fbItem.classList.add("feedback-modal__item--read");
            checkmark.classList.add("feedback-modal__checkmark--checked");
            checkmark.innerHTML = "✓";
          }
          
          // Update unread count and badge
          const newUnreadCount = getUnreadCount(note.id, feedback);
          if (newUnreadCount > 0) {
            feedbackBadgeCount.textContent = newUnreadCount;
            feedbackBadge.style.display = "flex";
            feedbackBadge.classList.add("post-card__feedback-badge--unread");
            feedbackBtnText.textContent = `💬 Feedback (${newUnreadCount} unread)`;
          } else {
            feedbackBadge.style.display = "none";
            feedbackBadge.classList.remove("post-card__feedback-badge--unread");
            if (feedback.length > 0) {
              feedbackBtnText.textContent = `💬 Feedback (${feedback.length})`;
            } else {
              feedbackBtnText.textContent = "💬 Feedback";
            }
          }
        });
        
        feedbackModalList.appendChild(fbItem);
      });
    }
    
    renderModalFeedbackList(feedback);
    
    // Clear form
    feedbackModalName.value = "";
    feedbackModalText.value = "";
    
    // Store references for updating card after submit
    feedbackModal.dataset.cardElementId = instance.dataset.id;
    
    // Show modal
    feedbackModal.hidden = false;
    feedbackModal.setAttribute("aria-hidden", "false");
    body.classList.add("modal-open");
    
    // Focus on textarea
    setTimeout(() => {
      feedbackModalText.focus();
    }, 100);
  }
  
  feedbackBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();
    openFeedbackModal();
  });
  

  // Update toggle button text based on visibility
  const body = instance.querySelector(".post-card__body");
  let isExpanded = false;
  
  toggleBtn.addEventListener("click", () => {
    isExpanded = !isExpanded;
    if (isExpanded) {
      contentEl.style.display = note.content ? "block" : "none";
      linkEl.style.display = note.link ? "block" : "none";
      toggleBtn.textContent = "📋 Hide Details";
    } else {
      contentEl.style.display = "none";
      linkEl.style.display = "none";
      toggleBtn.textContent = "📋 Details";
    }
  });

  // Drag and drop handlers
  instance.addEventListener("dragstart", (e) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", note.id);
    instance.classList.add("dragging");
  });

  instance.addEventListener("dragend", () => {
    instance.classList.remove("dragging");
  });

  return instance;
}

function showStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle("form__status--error", Boolean(isError));
}

function openModal(note = null) {
  editingNoteId = note?.id || null;
  modal.hidden = false;
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  form.reset();
  showStatus("");

  if (note) {
    // Editing existing note - status is not editable, posts move via drag & drop
    noteIdInput.value = note.id;
    document.querySelector("#author").value = note.author || "";
    document.querySelector("#postType").value = note.postType || "";
    document.querySelector("#revision").value = note.revision || 1;
    document.querySelector("#customDate").value = note.customDate || "";
    document.querySelector("#link").value = note.link || "";
    document.querySelector("#content").value = note.content || "";
    submitBtn.textContent = "Update post";
    cancelBtn.style.display = "inline-block";
  } else {
    // New note - defaults to student_feedback status
    noteIdInput.value = "";
    document.querySelector("#revision").value = 1;
    document.querySelector("#postType").value = "";
    submitBtn.textContent = "Save post";
    cancelBtn.style.display = "none";
  }

  requestAnimationFrame(() => {
    document.querySelector("#author")?.focus();
  });
}

function closeModal() {
  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  editingNoteId = null;
}

async function handleSubmit(event) {
  event.preventDefault();

  const formData = new FormData(form);
  const payload = {
    author: formData.get("author")?.trim(),
    content: formData.get("content")?.trim() || null,
    section: formData.get("section")?.trim(),
    customDate: formData.get("customDate") || null,
    link: formData.get("link")?.trim() || null,
    postType: formData.get("postType")?.trim(),
    revision: parseInt(formData.get("revision") || "1", 10)
  };

  if (!payload.author) {
    showStatus("Author name is required.", true);
    return;
  }

  if (!payload.postType) {
    showStatus("Post type is required.", true);
    return;
  }

  // Automatically set section based on active group
  payload.section = activeGroup;
  
  // New posts default to student_feedback status, editing maintains current status
  if (!editingNoteId) {
    payload.status = "student_feedback";
  }

  submitBtn.disabled = true;
  showStatus(editingNoteId ? "Updating..." : "Saving...");

  try {
    const url = editingNoteId 
      ? `/api/notes/${encodeURIComponent(editingNoteId)}`
      : "/api/notes";
    const method = editingNoteId ? "PATCH" : "POST";

    const response = await fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const { message } = await response.json().catch(() => ({}));
      throw new Error(message || `Failed to ${editingNoteId ? "update" : "save"} post.`);
    }

    const note = await response.json();
    form.reset();
    showStatus(`Post ${editingNoteId ? "updated" : "saved"}!`);
    closeModal();
    fetchNotes();
  } catch (error) {
    console.error(error);
    showStatus(error.message || "Something went wrong. Try again.", true);
  } finally {
    submitBtn.disabled = false;
  }
}

async function handleDelete(id, noteElement) {
  if (!confirm("Are you sure you want to delete this post?")) {
    return;
  }

  noteElement?.classList.add("post-card--pending");
  try {
    const response = await fetch(`/api/notes/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      const { message } = await response.json().catch(() => ({}));
      throw new Error(message || "Failed to delete post.");
    }

    noteElement.remove();
    fetchNotes();
  } catch (error) {
    console.error(error);
    noteElement?.classList.remove("post-card--pending");
    alert(error.message || "Could not delete the post. Try again.");
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

// Drag and drop handlers for columns
function setupDragAndDrop() {
  sections.forEach((section) => {
    statuses.forEach((status) => {
      const column = getColumn(section, status);
      if (column) {
        column.addEventListener("dragover", (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          column.classList.add("drag-over");
        });

        column.addEventListener("dragleave", () => {
          column.classList.remove("drag-over");
        });

        column.addEventListener("drop", async (e) => {
          e.preventDefault();
          column.classList.remove("drag-over");
          
          const noteId = e.dataTransfer.getData("text/html");
          if (!noteId) return;

          const noteElement = document.querySelector(`[data-id="${noteId}"]`);
          if (!noteElement) return;

          // Update status
          try {
            const response = await fetch(`/api/notes/${encodeURIComponent(noteId)}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status })
            });

            if (!response.ok) {
              throw new Error("Failed to update status");
            }

            fetchNotes();
          } catch (error) {
            console.error(error);
            alert("Failed to move post. Try again.");
          }
        });
      }
    });
  });
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

function closeFeedbackModal() {
  feedbackModal.hidden = true;
  feedbackModal.setAttribute("aria-hidden", "true");
  body.classList.remove("modal-open");
}

form.addEventListener("submit", handleSubmit);
openFormBtn?.addEventListener("click", () => openModal());
closeFormBtn?.addEventListener("click", closeModal);
cancelBtn?.addEventListener("click", closeModal);
modalOverlay?.addEventListener("click", closeModal);
closeFeedbackBtn?.addEventListener("click", closeFeedbackModal);
feedbackModalOverlay?.addEventListener("click", closeFeedbackModal);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (modal && !modal.hidden) {
      closeModal();
    } else if (feedbackModal && !feedbackModal.hidden) {
      closeFeedbackModal();
    }
  }
});

// Global handler for feedback modal submit
document.addEventListener("click", async (event) => {
  if (event.target && event.target.id === "feedback-submit") {
    event.preventDefault();
    event.stopPropagation();
    
    const feedbackModal = document.querySelector("#feedback-modal");
    if (feedbackModal.hidden) return;
    
    const noteId = feedbackModal.dataset.noteId;
    const cardElementId = feedbackModal.dataset.cardElementId;
    const feedbackModalName = document.querySelector("#feedback-name");
    const feedbackModalText = document.querySelector("#feedback-text");
    const feedbackModalSubmit = document.querySelector("#feedback-submit");
    const feedbackModalList = document.querySelector("#feedback-list");
    
    const feedbackerName = feedbackModalName.value.trim() || "Anonymous";
    const feedbackText = feedbackModalText.value.trim();

    if (!feedbackText) {
      alert("Please enter feedback text.");
      return;
    }

    feedbackModalSubmit.disabled = true;
    feedbackModalSubmit.textContent = "Posting...";

    try {
      const response = await fetch(`/api/notes/${encodeURIComponent(noteId)}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          feedbacker: feedbackerName,
          feedbackText: feedbackText
        })
      });

      if (!response.ok) {
        const { message } = await response.json().catch(() => ({}));
        throw new Error(message || "Failed to post feedback.");
      }

      const updatedNote = await response.json();
      const newFeedback = updatedNote.feedback || [];
      
      // Refresh notes to update all displays (this will re-render with new unread counts)
      fetchNotes();
      
      // Re-open modal to show new feedback (new feedback is unread by default)
      const cardElement = document.querySelector(`[data-id="${cardElementId}"]`);
      if (cardElement) {
        const cardNote = { id: noteId, feedback: newFeedback };
        // Re-render the modal with updated feedback
        setTimeout(() => {
          const modalList = document.querySelector("#feedback-list");
          if (modalList && !feedbackModal.hidden) {
            const readIds = getReadFeedbackIds(noteId);
            const sortedFeedback = [...newFeedback].sort((a, b) => {
              const dateA = new Date(a.createdAt || 0);
              const dateB = new Date(b.createdAt || 0);
              return dateB - dateA;
            });
            
            modalList.innerHTML = "";
            sortedFeedback.forEach((fb) => {
              const isRead = readIds.includes(fb.id);
              const fbItem = document.createElement("div");
              fbItem.className = `feedback-modal__item ${isRead ? 'feedback-modal__item--read' : 'feedback-modal__item--unread'}`;
              fbItem.dataset.feedbackId = fb.id;
              fbItem.style.cursor = "pointer";
              
              const fbHeader = document.createElement("div");
              fbHeader.className = "feedback-modal__item-header";
              
              const fbLeft = document.createElement("div");
              fbLeft.className = "feedback-modal__item-left";
              
              const checkmark = document.createElement("span");
              checkmark.className = `feedback-modal__checkmark ${isRead ? 'feedback-modal__checkmark--checked' : ''}`;
              checkmark.innerHTML = isRead ? "✓" : "";
              
              const fbAuthor = document.createElement("span");
              fbAuthor.className = "feedback-modal__item-author";
              fbAuthor.textContent = fb.feedbacker || "Anonymous";
              
              fbLeft.appendChild(checkmark);
              fbLeft.appendChild(fbAuthor);
              fbHeader.appendChild(fbLeft);
              
              const fbDate = document.createElement("span");
              fbDate.className = "feedback-modal__item-date";
              fbDate.textContent = formatDate(fb.createdAt);
              
              fbHeader.appendChild(fbDate);
              fbItem.appendChild(fbHeader);
              
              const fbText = document.createElement("div");
              fbText.className = "feedback-modal__item-text";
              if (fb.text && fb.text.trim()) {
                fbText.textContent = fb.text;
              } else {
                fbText.textContent = "(No comment provided)";
                fbText.style.fontStyle = "italic";
                fbText.style.color = "var(--text-secondary)";
              }
              fbItem.appendChild(fbText);
              
              fbItem.addEventListener("click", () => {
                const currentReadIds = getReadFeedbackIds(noteId);
                const currentlyRead = currentReadIds.includes(fb.id);
                
                if (currentlyRead) {
                  const newReadIds = currentReadIds.filter(id => id !== fb.id);
                  localStorage.setItem(`readFeedback_${noteId}`, JSON.stringify(newReadIds));
                  fbItem.classList.remove("feedback-modal__item--read");
                  fbItem.classList.add("feedback-modal__item--unread");
                  checkmark.classList.remove("feedback-modal__checkmark--checked");
                  checkmark.innerHTML = "";
                } else {
                  markFeedbackAsRead(noteId, fb.id);
                  fbItem.classList.remove("feedback-modal__item--unread");
                  fbItem.classList.add("feedback-modal__item--read");
                  checkmark.classList.add("feedback-modal__checkmark--checked");
                  checkmark.innerHTML = "✓";
                }
                
                fetchNotes();
              });
              
              modalList.appendChild(fbItem);
            });
          }
        }, 100);
      }
      
      feedbackModalName.value = "";
      feedbackModalText.value = "";
    } catch (error) {
      console.error(error);
      alert(error.message || "Could not post feedback. Try again.");
    } finally {
      feedbackModalSubmit.disabled = false;
      feedbackModalSubmit.textContent = "Post Feedback";
    }
  }
});

// Add click listeners for post actions
document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  const card = target.closest(".post-card");
  if (!card) return;

  const noteId = card.dataset.id;
  if (!noteId) return;

  if (target.dataset.action === "delete") {
    event.stopPropagation();
    handleDelete(noteId, card);
    return;
  }

  if (target.dataset.action === "edit") {
    event.stopPropagation();
    // Fetch the note and open modal for editing
    fetch(`/api/notes/${encodeURIComponent(noteId)}`)
      .then(res => res.json())
      .then(note => openModal(note))
      .catch(err => {
        console.error(err);
        alert("Failed to load post for editing.");
      });
    return;
  }
});

// Initialize
switchGroup(activeGroup);
setupDragAndDrop();
fetchNotes();
