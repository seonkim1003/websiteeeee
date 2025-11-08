const express = require("express");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs/promises");

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, "data");
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
  await fs.writeFile(NOTES_FILE, JSON.stringify(notes, null, 2), "utf8");
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
  const { author = "Anonymous", content } = req.body || {};

  if (!content || !content.trim()) {
    return res.status(400).json({ message: "Note content is required." });
  }

  try {
    const notes = await readNotes();
    const newNote = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      author: author.trim() || "Anonymous",
      content: content.trim(),
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

app.listen(PORT, () => {
  console.log(`Notes app listening on http://localhost:${PORT}`);
});

