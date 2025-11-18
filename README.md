# 🚀 Partie Web – Projet IoT (RFID + Empreinte + MQTT)

Cette partie du projet correspond à l’interface **web** et au **serveur local** permettant de visualiser les données venant de l’ESP32 (RFID, empreinte, servo…) et d’envoyer des commandes via MQTT.

Elle s’appuie sur un serveur Node.js qui se connecte à votre broker MQTT local (ex : **MQTTX**).

---

## 📌 Objectifs de la partie Web

La partie web doit permettre :

### 🔍 Consultation en temps réel
- Lecture du dernier badge RFID scanné  
- Lecture du dernier résultat du capteur d’empreinte  
- État du servo (ouvert / fermé)  
- Logs rapides des événements reçus du broker  

### 🕹️ Contrôle à distance
- Bouton “Ouvrir la porte” (commande MQTT vers l’ESP32)  
- Possibilité d’étendre : reset, enregistrement empreinte…

### 🌐 Connexion au Broker MQTT
- Le serveur Node.js se connecte au **broker MQTTX**  
- La page web utilise une API interne fournie par ce serveur  
- Tout tourne en **local**, rapide et sans internet

---

## 🏗️ Architecture

[ESP32] <----> [Broker MQTTX] <----> [Serveur Web Node.js] <----> [Dashboard Web]


---

## 🛠️ Technologies utilisées

### Backend (serveur local)
- Node.js  
- Express.js  
- mqtt.js  

### Frontend (dashboard)
- HTML5  
- CSS3  
- JavaScript pur (aucune dépendance externe)

### Broker
- MQTTX (broker local)

---

## 📁 Structure du projet

/web
│── server.js → serveur web + client MQTT
│── package.json
└── /public
│── index.html → interface web
│── style.css → styles (optionnel)
└── script.js → logique front

---

# 🔧 Installation & Lancement

## 1️⃣ Installer Node.js  
Télécharger : https://nodejs.org

---

## 2️⃣ Installer les dépendances

cd web
npm install


Installe :
- express
- mqtt

---

## 3️⃣ Démarrer le broker MQTT (MQTTX)

Configurer :
mqtt://localhost:1883


---

## 4️⃣ Lancer le serveur web

node server.js


---

## 5️⃣ Accéder au dashboard web

Ouvrir dans un navigateur :

👉 http://localhost:3000

Fonctionnalités :
- Affichage en temps réel des données MQTT  
- Mise à jour auto  
- Bouton pour commander le servo  

---

## 📨 Topics MQTT utilisés

| Action / Donnée       | Topic MQTT      | Direction |
|------------------------|------------------|-----------|
| ID RFID détecté       | `rfid/id`        | ESP32 → Serveur Web |
| Résultat empreinte    | `finger/verify`  | ESP32 → Serveur Web |
| État du servo         | `servo/state`    | ESP32 → Serveur Web |
| Ouvrir la porte       | `servo/cmd`      | Serveur Web → ESP32 |

---




