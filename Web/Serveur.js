const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const MQTTHandler = require('./mqtt-handler');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const mqttHandler = new MQTTHandler();

// Middleware parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session (changer secret en prod via variable d'env)
const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || 'change_this_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 1 jour
});
app.use(sessionMiddleware);

// Simple "BDD" d'utilisateurs pour test (hacher en prod)
const USERS = [
    { username: 'admin', password: 'admin123' }
];

// Middleware de protection
function requireAuth(req, res, next) {
    if (req.session && req.session.user) return next();
    if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    res.redirect('/');
}

// Routes d'authentification
app.get('/', (req, res) => {
    if (req.session && req.session.user) return res.redirect('/dashboard');
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = USERS.find(u => u.username === username && u.password === password);
    if (user) {
        req.session.user = { username: user.username };
        return res.redirect('/dashboard');
    }
    return res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

app.get('/dashboard', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Static assets
app.use(express.static(path.join(__dirname, 'public')));

// Initialisation MQTT
mqttHandler.connect();
mqttHandler.io = io;

// API protégées
app.get('/api/data', requireAuth, (req, res) => {
    res.json(mqttHandler.getSharedData());
});

app.post('/api/command', requireAuth, (req, res) => {
    const { command } = req.body;
    if (command) {
        if (typeof mqttHandler.sendCommandToDevice === 'function') {
            mqttHandler.sendCommandToDevice(command);
        } else if (typeof mqttHandler.sendCommand === 'function') {
            mqttHandler.sendCommand(command);
        }
        return res.json({ status: 'success', message: `Commande envoyée: ${command}` });
    } else {
        return res.status(400).json({ status: 'error', message: 'Commande manquante' });
    }
});

app.post('/api/notification', requireAuth, (req, res) => {
    const { message } = req.body;
    if (message) {
        mqttHandler.sendNotification(message);
        return res.json({ status: 'success', message: `Notification envoyée: ${message}` });
    } else {
        return res.status(400).json({ status: 'error', message: 'Message manquant' });
    }
});

// Intégrer la session dans socket.io et vérifier l'authentification
io.use((socket, next) => {
    sessionMiddleware(socket.request, socket.request.res || {}, (err) => {
        if (err) return next(err);
        if (socket.request.session && socket.request.session.user) {
            return next();
        }
        return next(new Error('Unauthorized'));
    });
});

io.on('connection', (socket) => {
    console.log('👤 Client WebSocket connecté:', socket.id, 'user:', socket.request.session.user?.username);
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
