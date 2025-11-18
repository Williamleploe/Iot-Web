const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const MQTTHandler = require('./mqtt-handler');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const mqttHandler = new MQTTHandler();

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialisation MQTT
mqttHandler.connect();
mqttHandler.io = io;

// Routes API
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/data', (req, res) => {
    res.json(mqttHandler.getSharedData());
});

app.post('/api/command', (req, res) => {
    const { command } = req.body;
    if (command) {
        mqttHandler.sendCommand(command);
        res.json({ status: 'success', message: `Commande envoyée: ${command}` });
    } else {
        res.status(400).json({ status: 'error', message: 'Commande manquante' });
    }
});

app.post('/api/notification', (req, res) => {
    const { message } = req.body;
    if (message) {
        mqttHandler.sendNotification(message);
        res.json({ status: 'success', message: `Notification envoyée: ${message}` });
    } else {
        res.status(400).json({ status: 'error', message: 'Message manquant' });
    }
});

// WebSocket
io.on('connection', (socket) => {
    console.log('👤 Client WebSocket connecté:', socket.id);
    socket.emit('initial-data', mqttHandler.getSharedData());
    
    socket.on('disconnect', () => {
        console.log('👤 Client WebSocket déconnecté:', socket.id);
    });
});

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log('🚀 Serveur IoT démarré!');
    console.log(`📍 URL: http://localhost:${PORT}`);
});

module.exports = app;
