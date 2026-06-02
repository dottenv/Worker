from .auth import auth_bp
from .service_centers import service_centers_bp
from .members import members_bp
from .shifts import shifts_bp
from .schedule import schedule_bp
from .swaps import swaps_bp
from .push import push_bp
from .notifications import notifications_bp
from .finance import finance_bp
from .time_entries import time_entries_bp
from .custom_fields import custom_fields_bp
from .shift_documents import shift_documents_bp
from .vapid import vapid_bp
__all__ = [
    "auth_bp",
    "service_centers_bp",
    "members_bp",
    "shifts_bp",
    "schedule_bp",
    "swaps_bp",
    "push_bp",
    "notifications_bp",
    "finance_bp",
    "time_entries_bp",
    "custom_fields_bp",
    "shift_documents_bp",
    "vapid_bp",
]
