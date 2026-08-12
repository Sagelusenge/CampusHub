"""API HTTP de CampusHubIA, entièrement locale et sans API externe."""

from __future__ import annotations

import hmac
import os
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory

from campushub_agent import CampusHubAgent, MODEL_NAME


BASE_DIR = Path(__file__).resolve().parent
KNOWLEDGE_PATH = Path(os.getenv("CAMPUSHUB_IA_KNOWLEDGE_PATH", BASE_DIR / "data" / "campushub_knowledge.txt"))
INTERNAL_TOKEN = os.getenv("CAMPUSHUB_IA_TOKEN", "")

app = Flask(__name__, static_folder="static")
app.config["MAX_CONTENT_LENGTH"] = 1 * 1024 * 1024
agent = CampusHubAgent(KNOWLEDGE_PATH)


def _authorized() -> bool:
    if not INTERNAL_TOKEN:
        return True
    received = request.headers.get("X-CampusHub-IA-Token", "")
    return hmac.compare_digest(received, INTERNAL_TOKEN)


@app.get("/")
def index():
    return send_from_directory("static", "index.html")


@app.get("/health")
def health():
    return jsonify({
        "status": "ok",
        "service": "CampusHubIA",
        "model": MODEL_NAME,
        "knowledge_ready": KNOWLEDGE_PATH.exists(),
        "knowledge_documents": agent.engine.document_count,
        "external_api": False,
    })


@app.get("/api/info")
def model_info():
    return jsonify({
        "name": "CampusHubIA",
        "model": MODEL_NAME,
        "response_mode": "local_hybrid",
        "knowledge_documents": agent.engine.document_count,
        "knowledge_path": KNOWLEDGE_PATH.name,
        "external_api": False,
    })


@app.post("/api/v1/respond")
def respond():
    if not _authorized():
        return jsonify({"error": "Accès interne refusé."}), 401
    data = request.get_json(silent=True) or {}
    message = data.get("message")
    context = data.get("context") or {}
    if not isinstance(message, str) or not message.strip():
        return jsonify({"error": "Le message doit être un texte non vide."}), 400
    if len(message) > 5000:
        return jsonify({"error": "Le message est trop long (maximum : 5000 caractères)."}), 400
    if not isinstance(context, dict):
        return jsonify({"error": "Le contexte doit être un objet JSON."}), 400
    result = agent.respond(
        message=message.strip(),
        task=str(data.get("task") or "GENERAL"),
        context=context,
        audience=str(data.get("audience") or "VISITEUR"),
    )
    return jsonify(result.as_dict())


@app.post("/api/chat")
def legacy_chat():
    """Compatibilité avec l’ancienne interface autonome du dossier My Agent."""
    data = request.get_json(silent=True) or {}
    message = data.get("message")
    if not isinstance(message, str) or not message.strip():
        return jsonify({"error": "Message requis"}), 400
    result = agent.respond(message.strip()).as_dict()
    return jsonify({
        "response": result["response"],
        "source": result["source"],
        "confidence": result["confidence"],
        "model": result["model"],
    })


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    print(f"CampusHubIA local : http://127.0.0.1:{port}")
    app.run(host="0.0.0.0", port=port, debug=False)
