from __future__ import annotations

import json
import os
import smtplib
from email.message import EmailMessage
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from typing import Any

BASE_DIR = Path(__file__).resolve().parent

SMTP_CONFIG = {
    "host": os.environ.get("VIGISAFE_SMTP_HOST"),
    "port": int(os.environ.get("VIGISAFE_SMTP_PORT", "587")),
    "user": os.environ.get("VIGISAFE_SMTP_USER"),
    "password": os.environ.get("VIGISAFE_SMTP_PASS"),
    "sender": os.environ.get("VIGISAFE_SMTP_FROM"),
    "recipient": os.environ.get("VIGISAFE_SMTP_TO"),
}


def smtp_ready() -> bool:
    return all(
        SMTP_CONFIG[key]
        for key in ("host", "user", "password", "sender", "recipient")
    )


def send_alert_email(payload: dict[str, Any]) -> tuple[bool, str]:
    if not smtp_ready():
        return False, "SMTP non configuré (variables d'environnement manquantes)."

    message = EmailMessage()
    message["Subject"] = "[VIGISAFE] Alerte homme mort"
    message["From"] = SMTP_CONFIG["sender"]
    message["To"] = SMTP_CONFIG["recipient"]
    message.set_content(
        """
Alerte VIGISAFE

Un utilisateur n'a pas confirmé sa présence.

Détails:
- Nom: {last_name}
- Prénom: {first_name}
- Code agent: {agent_code}
- Durée sans confirmation: {elapsed}
""".format(
            last_name=payload.get("last_name", ""),
            first_name=payload.get("first_name", ""),
            agent_code=payload.get("agent_code", ""),
            elapsed=payload.get("elapsed", ""),
        )
    )

    with smtplib.SMTP(SMTP_CONFIG["host"], SMTP_CONFIG["port"]) as server:
        server.starttls()
        server.login(SMTP_CONFIG["user"], SMTP_CONFIG["password"])
        server.send_message(message)

    return True, "Email envoyé."


class VigisafeHandler(BaseHTTPRequestHandler):
    server_version = "VigisafeHTTP/0.1"

    def do_GET(self) -> None:  # noqa: N802
        if self.path in {"/", "/index.html"}:
            self._serve_file(BASE_DIR / "index.html", "text/html; charset=utf-8")
            return
        if self.path.startswith("/static/"):
            file_path = BASE_DIR / self.path.lstrip("/")
            if file_path.is_file():
                content_type = "text/plain"
                if file_path.suffix == ".css":
                    content_type = "text/css"
                elif file_path.suffix == ".js":
                    content_type = "application/javascript"
                self._serve_file(file_path, content_type)
                return
        self.send_error(HTTPStatus.NOT_FOUND, "Not Found")

    def do_POST(self) -> None:  # noqa: N802
        if self.path != "/api/send_alert":
            self.send_error(HTTPStatus.NOT_FOUND, "Not Found")
            return

        content_length = int(self.headers.get("Content-Length", "0"))
        payload = {}
        if content_length:
            raw_body = self.rfile.read(content_length)
            try:
                payload = json.loads(raw_body.decode("utf-8"))
            except json.JSONDecodeError:
                payload = {}

        success, message = send_alert_email(payload)
        response = {"success": success, "message": message}
        body = json.dumps(response).encode("utf-8")
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _serve_file(self, file_path: Path, content_type: str) -> None:
        data = file_path.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


def run() -> None:
    host = "0.0.0.0"
    port = int(os.environ.get("PORT", "5000"))
    server = HTTPServer((host, port), VigisafeHandler)
    print(f"VIGISAFE server running on http://{host}:{port}")
    server.serve_forever()


if __name__ == "__main__":
    run()
