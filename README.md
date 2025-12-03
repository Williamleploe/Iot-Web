# 🚀 Interface Web – Projet IoT (RFID + Empreinte + MQTT)

Cette interface web affiche en temps réel les événements envoyés par l’ESP32 (RFID, empreinte) et permet d’envoyer des commandes via **MQTT** (WebSockets), directement depuis le navigateur grâce à **mqtt.js**.

---

# 📌 Objectifs du Dashboard Web

### 🔍 Consultation en temps réel
- Dernier badge RFID détecté  
- Dernière empreinte lue  
- Résultat : *granted* / *denied*  
- Historique des accès  
- Journal complet des événements  
- Statistiques (RFID / empreintes / refus)  

### 🕹️ Commandes MQTT
- Ouvrir la porte  
- Lister les utilisateurs  
- Supprimer tous les utilisateurs  
- Envoyer une commande MQTT personnalisée  

### 🌐 Connexion MQTT configurables
- Host  
- Port WebSocket (ex : 8083)  
- Topic de souscription (ex : `auth/door/#`)  
- Statut de connexion en temps réel  

---

# 🏗️ Architecture

```
[ESP32] ⇄ (MQTT) ⇄ [Broker] ⇄ (WebSocket) ⇄ [Dashboard Web]
```

➡️ Le dashboard utilise **mqtt.js (version navigateur)** chargé via CDN.  
➡️ Le broker doit avoir **WebSockets activé** (ex : MQTTX).  

---

# 🛠️ Technologies utilisées

### Frontend
- HTML  
- CSS  
- JavaScript  
- mqtt.js (client WebSocket)

### Broker MQTT
- MQTTX (client + broker local)

---

# 📁 Structure du projet

```
/web
│── index.html
└── style.css
```

---

# 🔧 Installation & Utilisation

## 1️⃣ Activer le broker MQTT avec WebSockets

Exemple avec **MQTTX Broker** :

- Host : `broker.emqx.io`
- Port WebSocket : `8083`
- Path : `/mqtt`

---

## 2️⃣ Ouvrir le dashboard

Il suffit d’ouvrir :

```
index.html
```

Aucune installation nécessaire.

---

## 3️⃣ Configurer dans l’interface

Zone **Configuration Broker MQTT** :

- Host : `broker.emqx.io`
- Port : `8083`
- Topic Sub : `auth/door/#`

Puis cliquer sur **Reconnexion**.

---

# 📨 Topics MQTT utilisés

| Utilité                | Topic                  | Direction               |
|------------------------|------------------------|-------------------------|
| Événement d’accès      | `auth/door/event`      | ESP32 → Dashboard       |
| Ouvrir la porte        | `auth/door/command`    | Dashboard → ESP32       |
| Lister utilisateurs    | `auth/door/command`    | Dashboard → ESP32       |
| Effacer tout           | `auth/door/command`    | Dashboard → ESP32       |

### Exemple d’événement reçu
```json
{
  "method": "rfid",
  "name": "Lucas",
  "result": "granted"
}
```
