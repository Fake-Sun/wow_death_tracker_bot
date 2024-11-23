const express = require('express');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('Failed to connect to MongoDB', err));

// Define Mongoose Schema and Model for deaths
const deathSchema = new mongoose.Schema({
    username: String,
    characterName: String,
    characterClass: String,
    level: Number,
    race: String,
    time: String,
    cause: String
});
const Death = mongoose.model('Death', deathSchema);

// Endpoint to receive death data from the companion app
app.post('/death', async (req, res) => {
    const { username, characterName, characterClass, level, race, time, cause } = req.body;
    try {
        const death = new Death({ username, characterName, characterClass, level, race, time, cause });
        await death.save();
        res.status(200).send('Death recorded successfully');
    } catch (error) {
        console.error('Error saving death:', error);
        res.status(500).send('Internal server error');
    }
});

// Start the express server to receive data from the companion app
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
