import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "supersecretkey")
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", f"sqlite:///{os.path.join(BASE_DIR, 'app.db')}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "change-this-to-a-long-secret-key-1234567890")
    JWT_ACCESS_TOKEN_EXPIRES = 60 * 60 * 24 * 7  # 7 days

    VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY", (
        "-----BEGIN PRIVATE KEY-----\n"
        "MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQg9fV9VhTNpuPFlYXp\n"
        "n5wJaCT7r6jaVjW3gLBoIzgqM/ihRANCAASWtJcxRxeqa5Ts2gIYUo4ouohjErIn\n"
        "6G18iNqjGdDVajf8pD8WKVHkbLwfQejeLU2GwuWaIEkbGjd0gktCrNAU\n"
        "-----END PRIVATE KEY-----"
    ))
    VAPID_PUBLIC_KEY = os.environ.get("VAPID_PUBLIC_KEY", (
        "-----BEGIN PUBLIC KEY-----\n"
        "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAElrSXMUcXqmuU7NoCGFKOKLqIYxKy\n"
        "J+htfIjaoxnQ1Wo3/KQ/FilR5Gy8H0Ho3i1NhsLlmiBJGxo3dIJLQqzQFA==\n"
        "-----END PUBLIC KEY-----"
    ))
