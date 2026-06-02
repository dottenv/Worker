from flask import Blueprint

api_bp = Blueprint("api", __name__)

from .auth import auth_bp
from .warehouses import warehouses_bp
from .employees import employees_bp
from .sessions import sessions_bp

api_bp.register_blueprint(auth_bp, url_prefix="/auth")
api_bp.register_blueprint(warehouses_bp, url_prefix="/warehouses")
api_bp.register_blueprint(employees_bp, url_prefix="/employees")
api_bp.register_blueprint(sessions_bp, url_prefix="/sessions")
