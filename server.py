from flask import Flask, jsonify, send_from_directory
import paho.mqtt.client as mqtt
import threading

app = Flask(__name__, static_folder="static")

# Variables globales
last_rfid = "Aucun"
last_fingerprint = "Aucun"
servo_state = "Fermé"
logs = []

# ============================
# 🔌 MQTT
# ============================
def on_connect(client, userdata, flags, rc):
    print("Connecté au broker MQTT !")
    client.subscribe("rfid/id")
    client.subscribe("finger/verify")
    client.subscribe("servo/state")

def on_message(client, userdata, msg):
    global last_rfid, last_fingerprint, servo_state, logs
    payload = msg.payload.decode()

    if msg.topic == "rfid/id":
        last_rfid = payload
    elif msg.topic == "finger/verify":
        last_fingerprint = payload
    elif msg.topic == "servo/state":
        servo_state = payload

    logs.append(f"[{msg.topic}] {payload}")
    if len(logs) > 30:
        logs.pop(0)

client = mqtt.Client()
client.on_connect = on_connect
client.on_message = on_message
client.connect("localhost", 1883)

# Lancer MQTT en thread
thread = threading.Thread(target=client.loop_forever)
thread.start()

# ============================
# 🌐 ROUTES API
# ============================
@app.get("/api/data")
def api_data():
    return jsonify({
        "lastRFID": last_rfid,
        "lastFingerprint": last_fingerprint,
        "servoState": servo_state,
        "logs": logs
    })

@app.get("/api/open")
def api_open():
    client.publish("servo/cmd", "open")
    return {"status": "Commande envoyée !"}

# ============================
# 📄 ROUTES WEB
# ============================
@app.get("/")
def index():
    return send_from_directory("static", "index.html")

# Fichiers statiques
@app.get("/<path:path>")
def static_files(path):
    return send_from_directory("static", path)

# ============================
# 🚀 LANCEMENT SERVEUR
# ============================
if __name__ == "__main__":
    print("Serveur lancé : http://localhost:3000")
    app.run(port=3000, debug=True)