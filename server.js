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

app.post("/api/notes", async (req, res) => {
  const { author = "Anonymous", content, section, customDate, link } = req.body || {};

  if (!content || !content.trim()) {
    return res.status(400).json({ message: "Note content is required." });
  }

  if (!section || !["homemadedelights", "studentselfdefenseadvocates"].includes(section)) {
    return res.status(400).json({ message: "Valid section is required (homemadedelights or studentselfdefenseadvocates)." });
  }

  try {
    const notes = await readNotes();
    const newNote = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      author: author.trim() || "Anonymous",
      content: content.trim(),
      section: section,
      customDate: customDate || null,
      link: link ? link.trim() : null,
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

