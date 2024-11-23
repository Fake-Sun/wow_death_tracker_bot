const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');

const app = express();
app.use(express.json());

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const deaths = {};
let defaultChannel = null; // To keep track of the default channel to use

// Endpoint to receive death data from the companion app
app.post('/death', (req, res) => {
    const { username, characterName, level, race, time, cause } = req.body;

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
        level,
        race,
        time,
        cause
    };
    deaths[username].lastDeath = deathInfo;
    deaths[username].deathDetails.push(deathInfo);

    // Announce death in the default channel if available
    if (defaultChannel) {
        defaultChannel.send(
            `💀 **Anuncio de Muerte** 💀\n\n` +
            `**Usuario:** \`${username}\`\n` +
            `**Personaje:** **${characterName}**\n` +
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

    res.sendStatus(200);
});

// Command to display the death scoreboard
client.on('messageCreate', message => {
    // Set the default channel if not already set
    if (!defaultChannel) {
        defaultChannel = message.channel;
    }

    if (message.content === '!deaths') {
        message.channel.send(
            `☠️ **Tabla de Clasificación de Muertes** ☠️\n\n` +
            generateScoreboard()
        );
    }
});

// Generate a scoreboard
function generateScoreboard() {
    const users = Object.keys(deaths);
    if (users.length === 0) {
        return 'No hay muertes registradas aún.';
    }

    // Sort users by total deaths in descending order
    users.sort((a, b) => deaths[b].totalDeaths - deaths[a].totalDeaths);

    let scoreboard = '| **Rango** | **Nombre de Usuario** | **Total de Muertes** | **Último Personaje Muerto** |\n';
    scoreboard += '|-----------|-----------------------|----------------------|-----------------------------|\n';

    users.forEach((username, index) => {
        const userDeaths = deaths[username];
        const lastDeath = userDeaths.lastDeath;
        scoreboard += `| ${index + 1} | ${username} | ${userDeaths.totalDeaths} | ${lastDeath.characterName} (Nivel ${lastDeath.level}, ${lastDeath.race}) |\n`;
    });

    return scoreboard;
}

// Generate detailed death list for a specific user
function generateUserDeathList(username) {
    if (!deaths[username]) {
        return `No hay muertes registradas para el usuario: ${username}`;
    }

    const userDeaths = deaths[username].deathDetails;
    let deathList = '';

    userDeaths.forEach((death, index) => {
        deathList += `${index + 1}. **${death.characterName}** - ☠️ *${death.time}* - Nivel ${death.level}, ${death.race} - *${death.cause}*\n`;
    });

    return deathList;
}

// Bot login
client.login('YOUR_DISCORD_BOT_TOKEN');

// Start the express server to receive data from the companion app
app.listen(3000, () => {
    console.log('Servidor ejecutándose en el puerto 3000');
});
