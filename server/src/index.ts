const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
// Initialize Firebase Admin SDK for server-side token verification
const admin = require('firebase-admin');
// Uses application default credentials; set GOOGLE_APPLICATION_CREDENTIALS env var to a service account JSON file
admin.initializeApp({ credential: admin.credential.applicationDefault() });

const app = express();
const port = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Auth middleware: verify Firebase ID token
async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

// Configure Multer for file uploads
const upload = multer({ dest: path.join(__dirname, '../uploads') });

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Resume upload endpoint
// Protect upload with auth
app.post('/upload', verifyToken, upload.single('resume'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }
  // Placeholder: implement resume analysis logic here
  res.json({ filename: req.file.filename, originalName: req.file.originalname });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
