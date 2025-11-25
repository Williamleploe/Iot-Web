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
        this.io = null;
    }

    connect() {
        console.log('🔗 Connexion au broker MQTT...');
        
        this.mqttClient = mqtt.connect(this.host, {
            // Client ID personnalisé (fixe) demandé : "IoCours"
            clientId: 'IoCours',
            clean: true,
            connectTimeout: 4000,
            reconnectPeriod: 2000
        });

        this.mqttClient.on('connect', () => {
            console.log('✅ Connecté au broker MQTT:', this.host);
            
            this.mqttClient.subscribe('iot/from_device/+', { qos: 0 });
            this.mqttClient.subscribe('iot/broadcast/+', { qos: 0 });
            this.mqttClient.subscribe('iot/to_device/+', { qos: 0 });

            // Abonnement au topic mqttx_e5db9327 et ses sous-topics
            this.mqttClient.subscribe('mqttx_e5db9327', { qos: 0 });
            this.mqttClient.subscribe('mqttx_e5db9327/#', { qos: 0 });

            console.log('📡 Abonnements MQTT activés');
        });

        this.mqttClient.on('message', (topic, message) => {
            this.handleMessage(topic, message);
        });

        this.mqttClient.on('error', (err) => {
            console.error('❌ Erreur MQTT:', err);
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
            // Marque les messages provenant de mqttx_e5db9327 comme "external"
            source: topic.includes('from_device') ? 'device' : (topic.startsWith('mqttx_e5db9327') ? 'external' : 'server')
        };

        if (topic.startsWith('iot/from_device/')) {
            this.handleDeviceMessage(topic, msgStr, timestamp);
        } else if (topic.startsWith('iot/broadcast/')) {
            this.handleBroadcastMessage(topic, msgStr, timestamp);
        }

        this.sharedData.lastUpdate = new Date().toISOString();

        if (this.io) {
            this.io.emit('mqtt-message', messageData);
            this.io.emit('data-update', this.sharedData);
        }
    }

    handleDeviceMessage(topic, message, timestamp) {
        const deviceType = topic.split('/')[2];
        
        if (!this.sharedData.devices[deviceType]) {
            this.sharedData.devices[deviceType] = [];
        }

        const data = {
            value: message,
            timestamp: timestamp,
            type: deviceType
        };

        this.sharedData.devices[deviceType].unshift(data);
        
        if (this.sharedData.devices[deviceType].length > 50) {
            this.sharedData.devices[deviceType].pop();
        }
    }

    handleBroadcastMessage(topic, message, timestamp) {
        const broadcastType = topic.split('/')[2];
        
        if (!this.sharedData[broadcastType]) {
            this.sharedData[broadcastType] = [];
        }

        this.sharedData[broadcastType].unshift({
            message: message,
            timestamp: timestamp,
            type: broadcastType
        });

        if (this.sharedData[broadcastType].length > 100) {
            this.sharedData[broadcastType].pop();
        }
    }

    publishToMqtt(topic, message) {
        if (this.mqttClient && this.mqttClient.connected) {
            this.mqttClient.publish(topic, message);
            console.log(`📤 MQTT PUBLISH [${topic}]: ${message}`);
            return true;
        } else {
            console.error('❌ MQTT non connecté - Impossible de publier');
            return false;
        }
    }

    // Modifie sendNotification pour conserver l'historique
    sendNotification(message) {
        if (this.mqttClient && this.mqttClient.connected) {
            this.mqttClient.publish('iot/broadcast/notifications', message);
            
            // Ajouter à l'historique
            this.sharedData.notifications.unshift({
                message: message,
                timestamp: new Date().toLocaleString('fr-FR'),
                direction: 'outgoing'
            });
            
            console.log(`💬 Notification MQTT: ${message}`);
            return true;
        }
        return false;
    }


    sendCommandToDevice(command) {
        return this.publishToMqtt('iot/to_device/commands', command);
    }

    getSharedData() {
        return this.sharedData;
    }

    isConnected() {
        return this.mqttClient && this.mqttClient.connected;
    }
}

module.exports = MQTTHandler;