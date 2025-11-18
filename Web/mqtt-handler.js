const mqtt = require('mqtt');

class MQTTHandler {
    constructor() {
        this.mqttClient = null;
        this.host = 'mqtt://broker.emqx.io:1883';
        this.sharedData = {
            devices: {
                rfid: [],
                fingerprint: [],
                status: []
            },
            notifications: [],
            alerts: [],
            commands: [],
            lastUpdate: new Date().toISOString()
        };
        this.io = null; // Sera défini par app.js
    }

    connect() {
        console.log('🔗 Connexion au broker MQTT...');
        
        this.mqttClient = mqtt.connect(this.host, {
            clientId: 'node-server-' + Math.random().toString(16).substr(2, 8),
            clean: true,
            connectTimeout: 4000,
            reconnectPeriod: 2000
        });

        this.mqttClient.on('connect', () => {
            console.log('✅ Connecté au broker MQTT:', this.host);
            
            // Abonnements aux topics partagés
            this.mqttClient.subscribe('iot/from_device/+', { qos: 0 });
            this.mqttClient.subscribe('iot/broadcast/+', { qos: 0 });
            this.mqttClient.subscribe('iot/to_device/+', { qos: 0 });
            
            console.log('📡 Abonnements MQTT activés:');
            console.log('   - iot/from_device/+');
            console.log('   - iot/broadcast/+');
            console.log('   - iot/to_device/+');
            
            // Publier un message de statut du serveur
            this.mqttClient.publish('iot/from_device/status', 'Serveur Node.js démarré');
        });

        this.mqttClient.on('message', (topic, message) => {
            this.handleMessage(topic, message);
        });

        this.mqttClient.on('error', (err) => {
            console.error('❌ Erreur MQTT:', err);
        });

        this.mqttClient.on('close', () => {
            console.log('🔌 Connexion MQTT fermée');
        });

        this.mqttClient.on('reconnect', () => {
            console.log('🔄 Reconnexion au broker MQTT...');
        });
    }

    handleMessage(topic, message) {
        const msgStr = message.toString();
        const timestamp = new Date().toLocaleString('fr-FR');
        
        console.log(`📨 [${topic}] ${msgStr}`);

        const messageData = {
            message: msgStr,
            topic: topic,
            timestamp: timestamp,
            source: topic.includes('from_device') ? 'device' : 'server'
        };

        // Traitement selon le type de topic
        if (topic.startsWith('iot/from_device/')) {
            this.handleDeviceMessage(topic, msgStr, timestamp);
        } else if (topic.startsWith('iot/broadcast/')) {
            this.handleBroadcastMessage(topic, msgStr, timestamp);
        }

        // Mise à jour du timestamp
        this.sharedData.lastUpdate = new Date().toISOString();

        // Notification à tous les clients WebSocket
        if (this.io) {
            this.io.emit('mqtt-message', messageData);
            this.io.emit('data-update', this.sharedData);
        }
    }

    handleDeviceMessage(topic, message, timestamp) {
        const deviceType = topic.split('/')[2]; // rfid, fingerprint, status
        
        if (!this.sharedData.devices[deviceType]) {
            this.sharedData.devices[deviceType] = [];
        }

        const data = {
            value: message,
            timestamp: timestamp,
            type: deviceType
        };

        // Ajouter au début du tableau
        this.sharedData.devices[deviceType].unshift(data);
        
        // Limiter l'historique à 50 entrées
        if (this.sharedData.devices[deviceType].length > 50) {
            this.sharedData.devices[deviceType].pop();
        }

        console.log(`📱 ${deviceType.toUpperCase()}: ${message}`);
    }

    handleBroadcastMessage(topic, message, timestamp) {
        const broadcastType = topic.split('/')[2]; // notifications, alerts
        
        if (!this.sharedData[broadcastType]) {
            this.sharedData[broadcastType] = [];
        }

        this.sharedData[broadcastType].unshift({
            message: message,
            timestamp: timestamp,
            type: broadcastType
        });

        // Limiter l'historique
        if (this.sharedData[broadcastType].length > 100) {
            this.sharedData[broadcastType].pop();
        }

        console.log(`📢 ${broadcastType.toUpperCase()}: ${message}`);
    }

    // Méthodes d'envoi
    sendCommand(command) {
        if (this.mqttClient && this.mqttClient.connected) {
            this.mqttClient.publish('iot/to_device/commands', command);
            
            // Ajouter à l'historique des commandes
            this.sharedData.commands.unshift({
                command: command,
                timestamp: new Date().toLocaleString('fr-FR'),
                direction: 'outgoing'
            });
            
            console.log(`📤 Commande envoyée: ${command}`);
            return true;
        } else {
            console.error('❌ MQTT non connecté - Impossible d\'envoyer la commande');
            return false;
        }
    }

    sendNotification(message) {
        if (this.mqttClient && this.mqttClient.connected) {
            this.mqttClient.publish('iot/broadcast/notifications', message);
            console.log(`💬 Notification: ${message}`);
            return true;
        }
        return false;
    }

    sendAlert(message) {
        if (this.mqttClient && this.mqttClient.connected) {
            this.mqttClient.publish('iot/broadcast/alerts', message);
            console.log(`🚨 Alerte: ${message}`);
            return true;
        }
        return false;
    }

    getSharedData() {
        return this.sharedData;
    }

    // Statut de la connexion
    isConnected() {
        return this.mqttClient && this.mqttClient.connected;
    }
}

module.exports = MQTTHandler;