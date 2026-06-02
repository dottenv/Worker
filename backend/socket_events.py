from flask import request
from flask_socketio import join_room, leave_room
from flask_jwt_extended import decode_token
from models import User

user_sids = {}


def register_socket_handlers(socketio):
    @socketio.on("connect")
    def handle_connect(auth=None):
        token = None
        if auth and "token" in auth:
            token = auth["token"]
        elif request.args.get("token"):
            token = request.args.get("token")

        if not token:
            return False

        try:
            decoded = decode_token(token)
            user_id = decoded["sub"]
            was_offline = user_id not in user_sids
            user_sids[user_id] = request.sid
            join_room(f"user_{user_id}")
            if was_offline:
                emit_swap_event(user_id, "user:online", {"user_id": user_id, "online": True})
        except Exception:
            return False

    @socketio.on("disconnect")
    def handle_disconnect():
        for uid, sid in list(user_sids.items()):
            if sid == request.sid:
                del user_sids[uid]
                leave_room(f"user_{uid}")
                emit_swap_event(uid, "user:online", {"user_id": uid, "online": False})
                break


def emit_swap_event(user_id, event, data):
    """Emit a socket event to all users in the same room. Falls back silently."""
    try:
        from extensions import socketio as sio
        sio.emit(event, data, room=f"user_{user_id}")
    except Exception:
        pass


def emit_finance_event(user_id, event, data):
    """Emit a finance socket event to a specific user."""
    try:
        from extensions import socketio as sio
        sio.emit(event, data, room=f"user_{user_id}")
    except Exception:
        pass


def emit_to_users(user_ids, event, data):
    """Emit a socket event to multiple users."""
    try:
        from extensions import socketio as sio
        for uid in user_ids:
            sio.emit(event, data, room=f"user_{uid}")
    except Exception:
        pass


def get_online_user_ids():
    return set(user_sids.keys())
