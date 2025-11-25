// Dashboard.js avec ajout du système de scan Wi-Fi + sélection ESP32
// Basé sur ton fichier complet fourni (classe Dashboard)
// ➜ Ajout des fonctions : rechercherCarte(), connecterCarte(ip)
// ➜ Ajout des boutons: #searchDevice et liste #deviceList

class Dashboard {
    constructor() {
        this.socket = io();
        this.currentFilter = 'all';
        this.mqttFilter = 'mqtt-all';
        this.messageCounts = { rfid: 0, fingerprint: 0, status: 0, total: 0 };

        // Stocke les cartes détectées
        this.detectedDevices = [];

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupSocketListeners();
        this.updateStatus();
        console.log('🚀 Dashboard IoT avec ESP32 + Scan Wi-Fi initialisé');
    }

    setupEventListeners() {
        // --- Ajout bouton rechercher carte ESP32 ---
        const searchBtn = document.getElementById("searchDevice");
        if (searchBtn) {
            searchBtn.addEventListener("click", () => this.rechercherCarte());
        }

        // --- Boutons déjà existants ---
        document.querySelectorAll('[data-command]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const command = e.target.dataset.command;
                this.sendCommand(command);
            });
        });

        document.querySelectorAll('.filter-btn').forEach(btn => {
            if (btn.dataset.filter && !btn.dataset.filter.startsWith('mqtt-')) {
                btn.addEventListener('click', (e) => this.setFilter(e.target.dataset.filter));
            }
        });

        document.querySelectorAll('.filter-btn').forEach(btn => {
            if (btn.dataset.filter && btn.dataset.filter.startsWith('mqtt-')) {
                btn.addEventListener('click', (e) => this.setMqttFilter(e.target.dataset.filter));
            }
        });

        const sendCustom = document.getElementById('btn-send-custom');
        if (sendCustom) sendCustom.addEventListener('click', () => {
            const command = document.getElementById('custom-command').value;
            if (command) this.sendCommand(command);
        });

        const sendMqtt = document.getElementById('btn-send-mqtt');
        if (sendMqtt) sendMqtt.addEventListener('click', () => this.sendMqttMessage());

        const clearLogs = document.getElementById('btn-clear-all');
        if (clearLogs) clearLogs.addEventListener('click', () => this.clearAllLogs());
    }

    // ==========================
    // 🔍 SCAN & SÉLECTION ESP32
    // ==========================

    async rechercherCarte() {
        const deviceList = document.getElementById("deviceList");
        if (!deviceList) return;

        deviceList.innerHTML = "🔎 Recherche en cours...";

        try {
            // URL de découverte (ex: AP ESP32)
            const res = await fetch("http://192.168.4.1/devices");
            const data = await res.json();

            this.detectedDevices = data.devices || [];

            if (this.detectedDevices.length === 0) {
                deviceList.innerHTML = "❌ Aucune carte trouvée";
                return;
            }

            deviceList.innerHTML = "";

            this.detectedDevices.forEach(dev => {
                const li = document.createElement("div");
                li.className = "device-item";
                li.innerHTML = `
                    <strong>${dev.name}</strong> — ${dev.ip}
                    <button class="btn-connect" data-ip="${dev.ip}">Connecter</button>
                `;
                deviceList.appendChild(li);
            });

            document.querySelectorAll('.btn-connect').forEach(btn => {
                btn.addEventListener('click', () => this.connecterCarte(btn.dataset.ip));
            });
        } catch (err) {
            console.error(err);
            deviceList.innerHTML = "⚠️ Erreur lors de la recherche";
        }
    }

    async connecterCarte(ip) {
        try {
            const res = await fetch(`http://${ip}/connect`);
            const txt = await res.text();
            alert("ESP32 connectée: " + txt);
            this.addSystemMessage(`Connexion établie avec ${ip}`);
        } catch (err) {
            console.error(err);
            alert("Impossible de se connecter à la carte");
        }
    }

    // --- le reste du Dashboard reste identique ---