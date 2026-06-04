from flask import Blueprint, jsonify, current_app
import base64
import logging

logger = logging.getLogger(__name__)

vapid_bp = Blueprint("vapid", __name__, url_prefix="/api/vapid")


def _extract_public_key_bytes(pem_str: str) -> bytes | None:
    """Extract the raw EC public key bytes (uncompressed, 65 bytes: 0x04 + 32 + 32) from a VAPID PEM."""
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import ec
    from cryptography.hazmat.backends import default_backend

    try:
        pem_data = pem_str.encode("utf-8")
        key = serialization.load_pem_private_key(pem_data, password=None, backend=default_backend())
        if isinstance(key, ec.EllipticCurvePrivateKey):
            pub = key.public_key()
            raw_bytes = pub.public_bytes(
                encoding=serialization.Encoding.X962,
                format=serialization.PublicFormat.UncompressedPoint,
            )
            return raw_bytes
    except Exception as e:
        logger.debug("Could not load PEM as private key: %s", e)

    try:
        pem_data = pem_str.encode("utf-8")
        key = serialization.load_pem_public_key(pem_data, backend=default_backend())
        if isinstance(key, ec.EllipticCurvePublicKey):
            raw_bytes = key.public_bytes(
                encoding=serialization.Encoding.X962,
                format=serialization.PublicFormat.UncompressedPoint,
            )
            return raw_bytes
    except Exception as e:
        logger.debug("Could not load PEM as public key: %s", e)

    return None


@vapid_bp.route("/public-key", methods=["GET"])
def get_public_key():
    pem = current_app.config.get("VAPID_PUBLIC_KEY") or current_app.config.get("VAPID_PRIVATE_KEY") or ""
    if not pem:
        return jsonify({"error": "VAPID not configured"}), 500

    raw_bytes = _extract_public_key_bytes(pem)
    if not raw_bytes:
        logger.error("Could not extract public key from VAPID PEM")
        return jsonify({"error": "Failed to extract VAPID public key"}), 500

    encoded = base64.urlsafe_b64encode(raw_bytes).rstrip(b"=").decode("ascii")
    return jsonify({"publicKey": encoded}), 200
