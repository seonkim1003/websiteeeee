const express = require("express");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs/promises");

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = (() => {
  const provided = process.env.DATA_DIR;
  if (!provided) {
    return path.join(__dirname, "data");
  }
  return path.isAbsolute(provided)
    ? provided
    : path.join(__dirname, provided);
})();
const NOTES_FILE = path.join(DATA_DIR, "notes.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

async function ensureStorage() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.access(NOTES_FILE);
  } catch (error) {
    if (error.code === "ENOENT") {
      await fs.writeFile(NOTES_FILE, JSON.stringify([], null, 2), "utf8");
    } else {
      throw error;
    }
  }
}

async function readNotes() {
  await ensureStorage();
  const data = await fs.readFile(NOTES_FILE, "utf8");
  return JSON.parse(data);
}

async function writeNotes(notes) {
  await ensureStorage();
  await fs.writeFile(NOTES_FILE, JSON.stringify(notes, null, 2), "utf8");
}

async function findNoteIndex(id) {
  const notes = await readNotes();
  const index = notes.findIndex((note) => note.id === id);
  return { notes, index };
}

app.get("/api/notes", async (req, res) => {
  try {
    const notes = await readNotes();
    res.json(notes);
  } catch (error) {
    console.error("Failed to read notes:", error);
    res.status(500).json({ message: "Failed to load notes." });
  }
});

app.get("/api/notes/:id", async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: "Note id is required." });
  }

  try {
    const { notes, index } = await findNoteIndex(id);

    if (index === -1) {
      return res.status(404).json({ message: "Note not found." });
    }

    res.json(notes[index]);
  } catch (error) {
    console.error("Failed to read note:", error);
    res.status(500).json({ message: "Failed to load note." });
  }
});

app.post("/api/notes", async (req, res) => {
  const { author = "Anonymous", content, section, customDate, link, status, postType, revision } = req.body || {};

  if (!section || !["homemadedelights", "studentselfdefenseadvocates"].includes(section)) {
    return res.status(400).json({ message: "Valid section is required (homemadedelights or studentselfdefenseadvocates)." });
  }

  if (!status || !["student_feedback", "helen_feedback", "final_approved"].includes(status)) {
    return res.status(400).json({ message: "Valid status is required (student_feedback, helen_feedback, or final_approved)." });
  }

  if (!postType || !["fun", "informational", "research", "video_fun", "video_informational", "video_research"].includes(postType)) {
    return res.status(400).json({ message: "Valid post type is required." });
  }

  try {
    const notes = await readNotes();
    const newNote = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      author: author.trim() || "Anonymous",
      content: content ? content.trim() : null,
      section: section,
      customDate: customDate || null,
      link: link ? link.trim() : null,
      status: status,
      postType: postType,
      revision: revision || 1,
      feedback: [],
      createdAt: new Date().toISOString()
    };
    notes.unshift(newNote);
    await writeNotes(notes);
    res.status(201).json(newNote);
  } catch (error) {
    console.error("Failed to save note:", error);
    res.status(500).json({ message: "Failed to save note." });
  }
});

app.patch("/api/notes/:id", async (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};

  if (!id) {
    return res.status(400).json({ message: "Note id is required." });
  }

  try {
    const { notes, index } = await findNoteIndex(id);

    if (index === -1) {
      return res.status(404).json({ message: "Note not found." });
    }

    const note = notes[index];
    
    // Handle revision update - reset feedback when revision changes
    if (updates.revision !== undefined && updates.revision !== note.revision) {
      updates.feedback = [];
    }

    // Handle status updates
    if (updates.status && !["student_feedback", "helen_feedback", "final_approved"].includes(updates.status)) {
      return res.status(400).json({ message: "Invalid status." });
    }

    // Handle post type updates
    if (updates.postType && !["fun", "informational", "research", "video_fun", "video_informational", "video_research"].includes(updates.postType)) {
      return res.status(400).json({ message: "Invalid post type." });
    }

    // Merge updates
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        note[key] = updates[key];
      }
    });

    await writeNotes(notes);
    res.json(note);
  } catch (error) {
    console.error("Failed to update note:", error);
    res.status(500).json({ message: "Failed to update note." });
  }
});

app.post("/api/notes/:id/feedback", async (req, res) => {
  const { id } = req.params;
  const { feedbacker, feedbackText } = req.body || {};

  if (!id) {
    return res.status(400).json({ message: "Note id is required." });
  }

  try {
    const { notes, index } = await findNoteIndex(id);

    if (index === -1) {
      return res.status(404).json({ message: "Note not found." });
    }

    const note = notes[index];
    const feedbackerName = feedbacker?.trim() || "Anonymous";
    const text = feedbackText?.trim() || "";
    
    // Initialize feedback array if it doesn't exist
    if (!note.feedback) {
      note.feedback = [];
    }
    
    // Add feedback with timestamp
    const feedbackEntry = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      feedbacker: feedbackerName,
      text: text,
      createdAt: new Date().toISOString()
    };
    
    note.feedback.push(feedbackEntry);

    await writeNotes(notes);
    res.json(note);
  } catch (error) {
    console.error("Failed to add feedback:", error);
    res.status(500).json({ message: "Failed to add feedback." });
  }
});

app.delete("/api/notes/:id", async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: "Note id is required." });
  }

  try {
    const { notes, index } = await findNoteIndex(id);

    if (index === -1) {
      return res.status(404).json({ message: "Note not found." });
    }

    const [removed] = notes.splice(index, 1);
    await writeNotes(notes);
    res.json(removed);
  } catch (error) {
    console.error("Failed to delete note:", error);
    res.status(500).json({ message: "Failed to delete note." });
  }
});

app.listen(PORT, () => {
  console.log(`Notes app listening on http://localhost:${PORT}`);
});

