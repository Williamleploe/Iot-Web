async function updateData() {
    const res = await fetch('/api/data');
    const data = await res.json();

    document.getElementById("rfid").textContent = data.lastRFID;
    document.getElementById("fingerprint").textContent = data.lastFingerprint;
    document.getElementById("servo").textContent = data.servoState;
    document.getElementById("logs").textContent = data.logs.join("\n");
}

document.getElementById("open-btn").addEventListener("click", async () => {
    await fetch('/api/open');
    alert("Commande envoyée !");
});

setInterval(updateData, 500);
updateData();
