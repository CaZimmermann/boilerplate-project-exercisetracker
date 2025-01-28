// 1. Environment and Configuration
require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
const req = require('express/lib/request');

// 2. Global Middleware
app.use(cors());
app.use(express.static('public'));
app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 

// 3. Database Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log("MongoDB connection successful");
}).catch((err) => {
  console.error("MongoDB connection error:", err);
});

// 4. Mongoose Schemas and Models
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
});

const exerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true },
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

// 5. Routes
app.post('/api/users', async (req, res) => {
  const { username } = req.body;
  const newUser = new User({
    username: username
  });
  try {
  const savedUser = await newUser.save();
  res.json({
    _id: savedUser.id,
    username: savedUser.username
  });
} catch (err) {
  res.status(500).json({ error: "Failed to create user" });
}
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  const { _id } = req.params;
  const { description, duration, date } = req.body;

  if (!description || !duration) {
    return res.status(400).json({ error: 'Description and duration are required.' });
  }

  const exerciseDate = date ? new Date(date) : new Date();

  try {
    const newExercise = new Exercise({
      userId: _id,
      description,
      duration: parseInt(duration),
      date: exerciseDate,
    });

  await newExercise.save();

  const user = await User.findById(_id);

    res.json({
      username: user.username,
      description,
      duration: parseInt(duration),
      date: exerciseDate.toDateString(),
      _id: user._id,
    });
  } catch (err) {
    console.error('Error adding exercise:', err);
    res.status(500).json({ error: 'An error occurred while adding the exercise.' });
  }
});

app.get('/api/users', async (req, res) => {
  try {
  const users = await User.find({}, 'username _id');
  res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve users" });
  }
});

app.get('/api/users/:_id/logs', async (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;


  try {
    let filter = { userId: _id };
    if (from || to) {
      filter.date = {}; 
    }

    if (from) {
      filter.date.$gte = new Date(from); 
    }

    if (to) {
      filter.date.$lte = new Date(to); 
    }

  const count = await Exercise.countDocuments(filter);

  let exercises = await Exercise.find(filter)
      .limit(limit ? parseInt(limit) : 0) 
      .exec();

  exercises = exercises.map(exercise => ({
    description: exercise.description,
    duration: exercise.duration,
    date: exercise.date.toDateString(), 
  }));

  const user = await User.findById(_id);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  res.json({
    username: user.username, 
    count: count,
    _id: _id,
    log: exercises,
  });
} catch (err) {
  console.error('Error fetching exercise logs:', err);
  res.status(500).json({ error: 'An error occurred while fetching logs.' });
}
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// 6. Start the Server
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
