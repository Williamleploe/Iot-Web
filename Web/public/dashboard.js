class Dashboard {
    constructor() {
        this.socket = io();
        this.currentFilter = 'all';
        this.mqttFilter = 'mqtt-all';
        this.messageCounts = {
            rfid: 0,
            fingerprint: 0,
            status: 0,
            total: 0
        };
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupSocketListeners();
        this.updateStatus();
        console.log('🚀 Dashboard IoT avec ESP32 initialisé');
    }

    setupEventListeners() {
        // Boutons de commande ESP32
        document.querySelectorAll('[data-command]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const command = e.target.dataset.command;
                this.sendCommand(command);
            });
        });

        // Filtres messages ESP32
        document.querySelectorAll('.filter-btn').forEach(btn => {
            if (btn.dataset.filter && !btn.dataset.filter.startsWith('mqtt-')) {
                btn.addEventListener('click', (e) => {
                    this.setFilter(e.target.dataset.filter);
                });
            }
        });

        // Filtres messages MQTT généraux
        document.querySelectorAll('.filter-btn').forEach(btn => {
            if (btn.dataset.filter && btn.dataset.filter.startsWith('mqtt-')) {
                btn.addEventListener('click', (e) => {
                    this.setMqttFilter(e.target.dataset.filter);
                });
            }
        });

        // Commande personnalisée ESP32
        document.getElementById('btn-send-custom').addEventListener('click', () => {
            const command = document.getElementById('custom-command').value;
            if (command) {
                this.sendCommand(command);
                document.getElementById('custom-command').value = '';
            }
        });

        // Envoi message MQTT général
        document.getElementById('btn-send-mqtt').addEventListener('click', () => {
            this.sendMqttMessage();
        });

        // Effacer tous les logs
        document.getElementById('btn-clear-all').addEventListener('click', () => {
            this.clearAllLogs();
        });
    }

    setupSocketListeners() {
        // Connexion WebSocket
        this.socket.on('connect', () => {
            this.updateWebSocketStatus(true);
            this.addSystemMessage('Connecté au serveur WebSocket');
            console.log('🔌 WebSocket connecté');
        });

        this.socket.on('disconnect', () => {
            this.updateWebSocketStatus(false);
            this.addSystemMessage('Déconnecté du serveur WebSocket');
            console.log('🔌 WebSocket déconnecté');
        });

        // Messages MQTT
        this.socket.on('mqtt-message', (data) => {
            this.handleMQTTMessage(data);
        });

        // Données initiales
        this.socket.on('initial-data', (data) => {
            this.updateDashboard(data);
            console.log('📊 Données initiales reçues');
        });
    }

    handleMQTTMessage(data) {
        // Mettre à jour l'heure du dernier message
        this.updateLastMessageTime();
        
        // Ajouter au log MQTT général
        this.addMqttMessage(data.topic, data.message, data.source, data.timestamp);
        
        // Traiter les messages ESP32 spécifiquement
        if (data.topic.startsWith('iot/from_device/')) {
            this.handleESP32Message(data);
        }
        
        // Mettre à jour le statut MQTT
        this.updateMQTTStatus(true);
        
        console.log('📨 Message MQTT traité:', data.topic);
    }

    handleESP32Message(data) {
        const deviceType = data.topic.split('/')[2];
        
        // Compter les messages
        this.messageCounts[deviceType]++;
        this.messageCounts.total++;
        this.updateMessageCounts();
        
        // Ajouter au log ESP32
        this.addESP32Message(data.topic, data.message, data.timestamp);
        
        // Mettre à jour les interfaces spécifiques
        if (data.topic.includes('rfid/scan')) {
            this.updateDeviceStatus('rfid', data.message, data.timestamp);
            this.updateESP32Status('online');
        } else if (data.topic.includes('fingerprint/scan')) {
            this.updateDeviceStatus('fingerprint', data.message, data.timestamp);
            this.updateESP32Status('online');
        } else if (data.topic.includes('status')) {
            this.updateESP32Status('online');
        }
    }

    addESP32Message(topic, message, timestamp) {
        const logElement = document.getElementById('esp32-message-log');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message-grid';
        
        const shortTopic = topic.replace('iot/from_device/', '');
        
        messageDiv.innerHTML = `
            <div class="topic-short">${shortTopic}</div>
            <div class="message-content">${message}</div>
            <div class="message-time">${timestamp}</div>
        `;
        
        // Appliquer le filtre
        if (this.shouldShowESP32Message(topic)) {
            messageDiv.style.display = 'grid';
        } else {
            messageDiv.style.display = 'none';
        }
        
        logElement.prepend(messageDiv);
        
        // Limiter à 100 messages
        if (logElement.children.length > 100) {
            logElement.removeChild(logElement.lastChild);
        }
    }

    addMqttMessage(topic, message, source, timestamp) {
        const logElement = document.getElementById('mqtt-message-log');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'mqtt-message-grid';
        
        messageDiv.innerHTML = `
            <div class="message-source">${source}</div>
            <div class="message-topic">${topic}</div>
            <div class="message-content">${message}</div>
            <div class="message-time">${timestamp}</div>
        `;
        
        // Appliquer le filtre MQTT
        if (this.shouldShowMqttMessage(topic, source)) {
            messageDiv.style.display = 'grid';
        } else {
            messageDiv.style.display = 'none';
        }
        
        logElement.prepend(messageDiv);
        
        // Limiter à 100 messages
        if (logElement.children.length > 100) {
            logElement.removeChild(logElement.lastChild);
        }
    }

    addSystemMessage(message) {
        this.addMqttMessage('Système', message, 'system', new Date().toLocaleString('fr-FR'));
    }

    shouldShowESP32Message(topic) {
        if (this.currentFilter === 'all') return true;
        if (this.currentFilter === 'rfid' && topic.includes('rfid')) return true;
        if (this.currentFilter === 'fingerprint' && topic.includes('fingerprint')) return true;
        if (this.currentFilter === 'status' && topic.includes('status')) return true;
        return false;
    }

    shouldShowMqttMessage(topic, source) {
        if (this.mqttFilter === 'mqtt-all') return true;
        if (this.mqttFilter === 'mqtt-device' && source === 'device') return true;
        if (this.mqttFilter === 'mqtt-broadcast' && topic.includes('broadcast')) return true;
        if (this.mqttFilter === 'mqtt-commands' && topic.includes('command')) return true;
        return false;
    }

    setFilter(filter) {
        this.currentFilter = filter;
        
        document.querySelectorAll('.filter-btn').forEach(btn => {
            if (!btn.dataset.filter.startsWith('mqtt-')) {
                btn.classList.toggle('active', btn.dataset.filter === filter);
            }
        });
        
        // Appliquer le filtre aux messages ESP32
        const esp32Log = document.getElementById('esp32-message-log');
        esp32Log.querySelectorAll('.message-grid').forEach(message => {
            const topic = 'iot/from_device/' + message.querySelector('.topic-short').textContent;
            if (this.shouldShowESP32Message(topic)) {
                message.style.display = 'grid';
            } else {
                message.style.display = 'none';
            }
        });
    }

    setMqttFilter(filter) {
        this.mqttFilter = filter;
        
        document.querySelectorAll('.filter-btn').forEach(btn => {
            if (btn.dataset.filter.startsWith('mqtt-')) {
                btn.classList.toggle('active', btn.dataset.filter === filter);
            }
        });
        
        // Appliquer le filtre aux messages MQTT
        const mqttLog = document.getElementById('mqtt-message-log');
        mqttLog.querySelectorAll('.mqtt-message-grid').forEach(message => {
            const topic = message.querySelector('.message-topic').textContent;
            const source = message.querySelector('.message-source').textContent;
            if (this.shouldShowMqttMessage(topic, source)) {
                message.style.display = 'grid';
            } else {
                message.style.display = 'none';
            }
        });
    }

    updateMessageCounts() {
        document.getElementById('rfid-count').textContent = this.messageCounts.rfid;
        document.getElementById('fingerprint-count').textContent = this.messageCounts.fingerprint;
        document.getElementById('total-count').textContent = this.messageCounts.total;
    }

    updateDeviceStatus(device, value, timestamp) {
        const element = document.getElementById(`${device}-status`);
        const historyElement = document.getElementById(`${device}-history`);
        
        element.innerHTML = `
            <div class="value">${value}</div>
            <div class="time">${timestamp}</div>
        `;
        
        element.classList.remove('waiting');
        element.classList.add('active');
        
        // Ajout à l'historique
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.textContent = `${timestamp} - ${value}`;
        historyElement.prepend(historyItem);
        
        if (historyElement.children.length > 10) {
            historyElement.removeChild(historyElement.lastChild);
        }
        
        setTimeout(() => {
            element.classList.remove('active');
            element.classList.add('waiting');
        }, 5000);
    }

    updateESP32Status(status) {
        const element = document.getElementById('esp32-status');
        element.textContent = status === 'online' ? 'Connecté' : 'Non détecté';
        element.className = `conn-value ${status === 'online' ? 'online' : 'offline'}`;
    }

    updateLastMessageTime() {
        const now = new Date().toLocaleTimeString('fr-FR');
        document.getElementById('last-message-time').textContent = now;
    }

    updateWebSocketStatus(connected) {
        const element = document.getElementById('websocket-status');
        element.textContent = `WebSocket: ${connected ? 'Connecté' : 'Déconnecté'}`;
        element.className = `status ${connected ? 'online' : 'offline'}`;
    }

    updateMQTTStatus(connected) {
        const element = document.getElementById('mqtt-status');
        element.textContent = `MQTT: ${connected ? 'Connecté' : 'Déconnecté'}`;
        element.className = `status ${connected ? 'online' : 'offline'}`;
        
        const brokerElement = document.getElementById('broker-status');
        brokerElement.className = `conn-value ${connected ? 'online' : 'offline'}`;
    }

    updateStatus() {
        setInterval(() => {
            const now = new Date().toLocaleString('fr-FR');
            document.getElementById('last-update').textContent = `Dernière mise à jour: ${now}`;
        }, 30000);
    }

    async sendCommand(command) {
        try {
            const response = await fetch('/api/command', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command })
            });
            
            const result = await response.json();
            this.addSystemMessage(`Commande envoyée à ESP32: ${command}`);
            console.log('📤 Commande envoyée à ESP32:', command);
            
        } catch (error) {
            console.error('❌ Erreur envoi commande:', error);
            this.addSystemMessage(`Échec envoi commande: ${command}`);
        }
    }

    async sendMqttMessage() {
        const topic = document.getElementById('mqtt-topic').value;
        const message = document.getElementById('mqtt-message').value;
        
        if (!topic || !message) {
            alert('Veuillez remplir le topic et le message');
            return;
        }

        try {
            const response = await fetch('/api/notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, topic })
            });
            
            const result = await response.json();
            this.addSystemMessage(`Message MQTT publié: ${topic} -> ${message}`);
            document.getElementById('mqtt-message').value = '';
            console.log('📤 Message MQTT publié:', topic, message);
            
        } catch (error) {
            console.error('❌ Erreur envoi message MQTT:', error);
            this.addSystemMessage(`Échec publication MQTT: ${topic}`);
        }
    }

    clearAllLogs() {
        document.getElementById('esp32-message-log').innerHTML = '';
        document.getElementById('mqtt-message-log').innerHTML = '';
        this.messageCounts = { rfid: 0, fingerprint: 0, status: 0, total: 0 };
        this.addSystemMessage('Tous les logs ont été effacés');
        console.log('🗑️ Tous les logs effacés');
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    new Dashboard();
});