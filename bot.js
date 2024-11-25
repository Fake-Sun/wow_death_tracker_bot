const { Client, GatewayIntentBits } = require('discord.js');
const mongoose = require('mongoose');

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

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMembers
    ]
});

let deaths = {};
let defaultChannel = null;

// Command to manually add a death
client.on('messageCreate', async message => {
    if (!defaultChannel) {
        defaultChannel = message.channel;
    }

    if (message.content.startsWith('!adddeath')) {
        const args = message.content.split('|').map(arg => arg.trim()).slice(1);
        if (args.length !== 7) {
            message.channel.send('Formato incorrecto. Usa: `!adddeath | username | characterName | characterClass | level | race | time | cause`');
            return;
        }

        const [username, characterName, characterClass, levelStr, race, time, cause] = args;

        // Validate the level input
        const level = parseInt(levelStr, 10);
        if (isNaN(level)) {
            message.channel.send('El nivel debe ser un número válido.');
            return;
        }

        await addDeath(username, characterName, characterClass, level, race, time, cause);
        
        // Announce the death in the default channel
        announceDeath(username, characterName, characterClass, level, race, time, cause);
    }

    if (message.content === '!deaths') {
        // Reload deaths from MongoDB to ensure the latest data
        deaths = await loadDeathsFromDatabase();
        message.channel.send(
            `☠️ **Tabla de Clasificación de Muertes** ☠️\n\n` +
            generateScoreboard()
        );
    }
});

// Function to add a death
async function addDeath(username, characterName, characterClass, level, race, time, cause) {
    // Save death to MongoDB
    const death = new Death({ username, characterName, characterClass, level, race, time, cause });
    await death.save();

    // Create or update user in the deaths object
    if (!deaths[username]) {
        deaths[username] = {
            totalDeaths: 0,
            lastDeath: null,
            deathDetails: []
        };
    }

    // Update death information
    deaths[username].totalDeaths += 1;
    const deathInfo = {
        characterName,
        characterClass,
        level,
        race,
        time,
        cause
    };
    deaths[username].lastDeath = deathInfo;
    deaths[username].deathDetails.push(deathInfo);
}

// Function to announce death in the default channel
function announceDeath(username, characterName, characterClass, level, race, time, cause) {
    if (defaultChannel) {
        defaultChannel.send(
            `💀 **Anuncio de Muerte** 💀\n\n` +
            `**Usuario:** \`${username}\`\n` +
            `**Personaje:** **${characterName}** (${characterClass})\n` +
            `**Nivel:** \`${level}\`\n` +
            `**Raza:** \`${race}\`\n` +
            `**Hora de Muerte:** ☠️ \`${time}\`\n` +
            `**Causa de Muerte:** *${cause}*\n\n` +
            `☠️ **Tabla de Clasificación de Muertes** ☠️\n\n` +
            generateScoreboard() +
            `\n\n📜 **Lista Detallada de Muertes para Usuario: ${username}** 📜\n` +
            generateUserDeathList(username)
        );
    } else {
        console.error('No default channel set to send death announcement');
    }
}

// Function to load deaths from MongoDB into memory
async function loadDeathsFromDatabase() {
    const allDeaths = await Death.find();
    const deathsMap = {};
    allDeaths.forEach(death => {
        if (!deathsMap[death.username]) {
            deathsMap[death.username] = {
                totalDeaths: 0,
                lastDeath: null,
                deathDetails: []
            };
        }
        deathsMap[death.username].totalDeaths += 1;
        const deathInfo = {
            characterName: death.characterName,
            characterClass: death.characterClass,
            level: death.level,
            race: death.race,
            time: death.time,
            cause: death.cause
        };
        deathsMap[death.username].lastDeath = deathInfo;
        deathsMap[death.username].deathDetails.push(deathInfo);
    });
    return deathsMap;
}

// Generate a scoreboard
function generateScoreboard() {
    const users = Object.keys(deaths);
    if (users.length === 0) {
        return 'No hay muertes registradas aún.';
    }

    // Sort users by total deaths in descending order
    users.sort((a, b) => deaths[b].totalDeaths - deaths[a].totalDeaths);

    let scoreboard = '```\n| Rango | Nombre de Usuario        | Total de Muertes    | Último Personaje Muerto                      |\n';
    scoreboard += '|-------|------------------------|--------------------|------------------------------------------|\n';

    users.forEach((username, index) => {
        const userDeaths = deaths[username];
        const lastDeath = userDeaths.lastDeath;
        scoreboard += `| ${(index + 1).toString().padEnd(6)} | ${username.padEnd(22)} | ${userDeaths.totalDeaths.toString().padEnd(18)} | ${lastDeath.characterName} (${lastDeath.characterClass}, Nivel ${lastDeath.level}, ${lastDeath.race}) |\n`;
    });

    return scoreboard + '```';
}

// Generate detailed death list for a specific user
function generateUserDeathList(username) {
    if (!deaths[username]) {
        return `No hay muertes registradas para el usuario: ${username}`;
    }

    const userDeaths = deaths[username].deathDetails;
    let deathList = '';

    userDeaths.forEach((death, index) => {
        deathList += `${index + 1}. **${death.characterName}** - ☠️ *${death.time}* - Nivel ${death.level}, ${death.characterClass}, ${death.race} - *${death.cause}*\n`;
    });

    return deathList;
}

// Bot login
client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
    // Load deaths from MongoDB into memory on startup
    deaths = await loadDeathsFromDatabase();
});

client.login(process.env.DISCORD_BOT_TOKEN);
