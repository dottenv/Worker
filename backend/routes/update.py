import os
import json
import logging
import subprocess
import threading
import urllib.request
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from helpers import get_current_user

logger = logging.getLogger(__name__)

update_bp = Blueprint("update", __name__, url_prefix="/api/update")

GITHUB_REPO = "dottenv/Worker"
GITHUB_API = f"https://api.github.com/repos/{GITHUB_REPO}"


def fetch_json(url):
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Worker-App",
            "Accept": "application/vnd.github.v3+json",
        },
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode())


@update_bp.route("/check", methods=["GET"])
@jwt_required()
def check_update():
    user = get_current_user()
    if not user or not user.is_superuser:
        return jsonify({"error": "Access denied"}), 403

    current = request.args.get("current", "")

    try:
        data = fetch_json(f"{GITHUB_API}/commits?per_page=10&sha=main")

        latest_sha = data[0]["sha"] if data else ""
        latest_short = latest_sha[:7] if latest_sha else ""

        commits = []
        behind = 0
        found_current = not current or current == "unknown"
        for c in data:
            short_sha = c["sha"][:7]
            if not found_current:
                behind += 1
                if short_sha == current:
                    found_current = True
                    continue
            if found_current and short_sha != current:
                commits.append({
                    "hash": short_sha,
                    "message": c["commit"]["message"].split("\n")[0],
                })

        if not found_current:
            behind = len(data)

        return jsonify({
            "current": current,
            "latest": latest_short,
            "behind": behind if not found_current else behind,
            "commits": commits,
            "update_available": behind > 0,
        })
    except Exception as e:
        logger.warning("Update check failed: %s", e)
        return jsonify({"error": str(e), "update_available": False}), 500


@update_bp.route("/apply", methods=["POST"])
@jwt_required()
def apply_update():
    user = get_current_user()
    if not user or not user.is_superuser:
        return jsonify({"error": "Access denied"}), 403

    repo_path = os.environ.get("UPDATE_REPO_PATH", "/repo")
    setup_script = os.path.join(repo_path, "setup.sh")

    if not os.path.isfile(setup_script):
        return jsonify({"error": "Update script not found. Mount repo to /repo and ensure setup.sh exists."}), 500

    if not os.path.exists("/var/run/docker.sock"):
        return jsonify({"error": "Docker socket not available. Mount /var/run/docker.sock."}), 500

    thread = threading.Thread(target=_run_update, args=(repo_path,), daemon=True)
    thread.start()

    return jsonify({"status": "started"})


def _run_update(repo_path):
    from extensions import socketio as sio

    try:
        sio.emit("update:progress", {"message": "Сохранение локальных изменений...", "percent": 10})
        subprocess.run(
            ["git", "stash", "--include-untracked"],
            cwd=repo_path, capture_output=True, timeout=30,
        )

        sio.emit("update:progress", {"message": "Загрузка обновлений из git...", "percent": 30})
        subprocess.run(["git", "pull"], cwd=repo_path, capture_output=True, timeout=60)

        new_hash = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=repo_path, capture_output=True, text=True, timeout=5,
        ).stdout.strip()

        sio.emit("update:progress", {"message": "Остановка контейнеров...", "percent": 50})
        subprocess.run(
            ["docker", "compose", "down", "--remove-orphans", "frontend", "backend"],
            cwd=repo_path, capture_output=True, timeout=60,
        )

        sio.emit("update:progress", {"message": "Очистка кеша...", "percent": 70})
        subprocess.run(["docker", "image", "prune", "-f"], cwd=repo_path, capture_output=True, timeout=30)
        subprocess.run(
            ["rm", "-rf", "frontend/dev-dist", "frontend/node_modules"],
            cwd=repo_path, capture_output=True, timeout=10,
        )

        sio.emit("update:progress", {"message": "Сборка и запуск контейнеров...", "percent": 85})

        env = os.environ.copy()
        env["GIT_HASH"] = new_hash
        subprocess.run(
            ["docker", "compose", "up", "--build", "-d", "frontend", "backend"],
            cwd=repo_path, env=env, capture_output=True, timeout=600,
        )

        sio.emit("update:progress", {"message": f"Обновление завершено! Сборка {new_hash}", "percent": 100})
    except subprocess.TimeoutExpired as e:
        _emit_error(sio, f"Операция превысила тайм-аут: {e.cmd}")
    except Exception as e:
        _emit_error(sio, str(e))


def _emit_error(sio, message):
    try:
        sio.emit("update:error", {"message": message})
    except Exception:
        pass
