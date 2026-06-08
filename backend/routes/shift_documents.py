import os
import uuid
import logging
from flask import Blueprint, request, jsonify, send_from_directory, current_app
from flask_jwt_extended import jwt_required
from werkzeug.utils import secure_filename
from models import ShiftDocument, TimeEntry, ServiceCenterMember
from extensions import db
from helpers import get_current_user, is_manager
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

shift_documents_bp = Blueprint(
    "shift_documents", __name__, url_prefix="/api/shift-documents"
)

ALLOWED_EXTENSIONS = {
    "png", "jpg", "jpeg", "gif", "webp", "bmp",
    "pdf", "doc", "docx", "xls", "xlsx",
    "txt", "csv",
}


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@shift_documents_bp.route("/upload", methods=["POST"])
@jwt_required()
def upload_document():
    user = get_current_user()
    time_entry_id = request.form.get("time_entry_id", type=int)
    if not time_entry_id:
        return jsonify({"error": "time_entry_id is required"}), 400

    entry = TimeEntry.query.get_or_404(time_entry_id)
    if entry.user_id != user.id and not is_manager(entry.service_center_id, user.id):
        return jsonify({"error": "Access denied"}), 403

    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": "File type not allowed"}), 400

    ext = file.filename.rsplit(".", 1)[1].lower()
    unique_name = f"{uuid.uuid4().hex}.{ext}"
    original_name = secure_filename(file.filename)

    upload_dir = os.path.join(current_app.config["UPLOAD_FOLDER"], "shift_docs")
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, unique_name)
    file.save(file_path)

    doc = ShiftDocument(
        time_entry_id=time_entry_id,
        filename=unique_name,
        original_name=original_name,
        mime_type=file.content_type or "application/octet-stream",
        file_size=os.path.getsize(file_path),
    )
    db.session.add(doc)
    db.session.commit()

    return jsonify(doc.to_dict()), 201


@shift_documents_bp.route("/<int:doc_id>/download", methods=["GET"])
def download_document(doc_id):
    doc = ShiftDocument.query.get_or_404(doc_id)
    upload_dir = os.path.join(current_app.config["UPLOAD_FOLDER"], "shift_docs")
    return send_from_directory(
        upload_dir, doc.filename,
        download_name=doc.original_name,
        mimetype=doc.mime_type,
    )


@shift_documents_bp.route("/<int:doc_id>", methods=["DELETE"])
@jwt_required()
def delete_document(doc_id):
    user = get_current_user()
    doc = ShiftDocument.query.get_or_404(doc_id)
    entry = TimeEntry.query.get(doc.time_entry_id)
    if not entry:
        return jsonify({"error": "Time entry not found"}), 404
    if not is_manager(entry.service_center_id, user.id):
        return jsonify({"error": "Access denied"}), 403

    upload_dir = os.path.join(current_app.config["UPLOAD_FOLDER"], "shift_docs")
    file_path = os.path.join(upload_dir, doc.filename)
    if os.path.exists(file_path):
        os.remove(file_path)

    db.session.delete(doc)
    db.session.commit()
    return jsonify({"message": "Deleted"}), 200


@shift_documents_bp.route("/by-entry/<int:entry_id>", methods=["GET"])
@jwt_required()
def list_documents(entry_id):
    user = get_current_user()
    entry = TimeEntry.query.get_or_404(entry_id)
    if entry.user_id != user.id and not is_manager(entry.service_center_id, user.id):
        return jsonify({"error": "Access denied"}), 403

    docs = ShiftDocument.query.filter_by(time_entry_id=entry_id).order_by(
        ShiftDocument.created_at.desc()
    ).all()
    return jsonify([d.to_dict() for d in docs]), 200
