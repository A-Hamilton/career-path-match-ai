const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();
const port = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Configure Multer for file uploads
const upload = multer({ dest: path.join(__dirname, '../uploads') });

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Resume upload endpoint
app.post('/upload', upload.single('resume'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }
  // Placeholder: implement resume analysis logic here
  res.json({ filename: req.file.filename, originalName: req.file.originalname });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
