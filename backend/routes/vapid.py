from flask import Blueprint, jsonify, current_app
import base64
from py_vapid import Vapid


vapid_bp = Blueprint("vapid", __name__, url_prefix="/api/vapid")


def _get_vapid():
    """Try to get VAPID from public key, fall back to private key."""
    pem = current_app.config.get("VAPID_PUBLIC_KEY", "")
    if pem:
        try:
            return Vapid.from_pem(pem.encode("utf-8"))
        except Exception:
            pass
    pem = current_app.config.get("VAPID_PRIVATE_KEY", "")
    if pem:
        try:
            return Vapid.from_pem(pem.encode("utf-8"))
        except Exception:
            pass
    return None


@vapid_bp.route("/public-key", methods=["GET"])
def get_public_key():
    vapid = _get_vapid()
    if not vapid:
        return jsonify({"error": "VAPID not configured"}), 500

    try:
        raw_key = vapid.public_key.public_key
        raw_bytes = raw_key.to_string()
        uncompressed = b"\x04" + raw_bytes
        encoded = base64.urlsafe_b64encode(uncompressed).rstrip(b"=").decode("ascii")
        return jsonify({"publicKey": encoded}), 200
    except Exception as e:
        current_app.logger.error(f"Failed to extract VAPID key: {e}")
        return jsonify({"error": "Failed to extract VAPID key"}), 500
