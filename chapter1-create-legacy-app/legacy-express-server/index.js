const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cron = require('node-cron');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());

require('dotenv').config();

// PostgreSQL connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

// File upload configuration
const upload = multer({ dest: 'uploads/' });

const JWT_SECRET = process.env.JWT_SECRET;

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(403).send({ message: 'No token provided.' });
  
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).send({ message: 'Unauthorized!' });
    req.userId = decoded.id;
    next();
  });
};

// User Registration
app.post('/auth/register', async (req, res) => {
  const { username, password, email } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const result = await pool.query(
      'INSERT INTO users(username, password, email) VALUES($1, $2, $3) RETURNING id',
      [username, hashedPassword, email]
    );
    res.status(201).send({ message: 'User registered successfully', userId: result.rows[0].id });
  } catch (error) {
    res.status(500).send({ message: 'Error registering user' });
  }
});

// User Login
app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      if (await bcrypt.compare(password, user.password)) {
        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: 86400 }); // 24 hours
        res.status(200).send({ message: 'Login successful', token });
      } else {
        res.status(401).send({ message: 'Invalid credentials' });
      }
    } else {
      res.status(404).send({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).send({ message: 'Error during login' });
  }
});

// Get Player Profile
app.get('/players/:id', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM players WHERE user_id = $1', [req.params.id]);
    if (result.rows.length > 0) {
      res.status(200).send(result.rows[0]);
    } else {
      res.status(404).send({ message: 'Player not found' });
    }
  } catch (error) {
    res.status(500).send({ message: 'Error retrieving player profile' });
  }
});

// Update Player Profile
app.put('/players/:id', verifyToken, async (req, res) => {
  const { gamer_tag } = req.body;
  try {
    await pool.query(
      'UPDATE players SET gamer_tag = $1 WHERE user_id = $2',
      [gamer_tag, req.params.id]
    );
    res.status(200).send({ message: 'Player profile updated successfully' });
  } catch (error) {
    res.status(500).send({ message: 'Error updating player profile' });
  }
});

// Submit Score
app.post('/scores', verifyToken, async (req, res) => {
  const { game_name, score } = req.body;
  try {
    await pool.query(
      'INSERT INTO scores(player_id, game_name, score, status) VALUES($1, $2, $3, $4)',
      [req.userId, game_name, score, 'pending']
    );
    res.status(201).send({ message: 'Score submitted successfully' });
  } catch (error) {
    res.status(500).send({ message: 'Error submitting score' });
  }
});

// Get High Scores
app.get('/scores/highscores', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT p.gamer_tag, s.game_name, s.score FROM scores s JOIN players p ON s.player_id = p.user_id WHERE s.status = $1 ORDER BY s.score DESC LIMIT 10',
      ['validated']
    );
    res.status(200).send(result.rows);
  } catch (error) {
    res.status(500).send({ message: 'Error retrieving high scores' });
  }
});

// File upload endpoint
app.post('/upload', verifyToken, upload.single('avatar'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  
  const fileId = Date.now().toString();
  const oldPath = req.file.path;
  const newPath = path.join('uploads', `${fileId}-${req.file.originalname}`);
  
  fs.rename(oldPath, newPath, (err) => {
    if (err) {
      return res.status(500).send('Error saving file.');
    }
    res.json({ fileId: fileId, fileName: req.file.originalname });
  });
});

// File retrieval endpoint
app.get('/files/:fileId', (req, res) => {
  const fileName = fs.readdirSync('uploads')
    .find(file => file.startsWith(req.params.fileId));
  
  if (!fileName) {
    return res.status(404).send('File not found.');
  }
  
  res.sendFile(path.join(__dirname, 'uploads', fileName));
});

// Scheduled Tasks
cron.schedule('0 0 * * *', async () => {
  console.log('Resetting daily leaderboard...');
  try {
    await pool.query('UPDATE players SET daily_score = 0');
    console.log('Daily leaderboard reset successful');
  } catch (error) {
    console.error('Error resetting daily leaderboard:', error);
  }
});

cron.schedule('0 */6 * * *', async () => {
  console.log('Generating cosmic event...');
  // This is a placeholder for the cosmic event generation logic
  // In a real application, this would interact with the database or game state
  console.log('Cosmic event generated: Double points for the next hour!');
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});