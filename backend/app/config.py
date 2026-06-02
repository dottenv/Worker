import os


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key")
    SQLALCHEMY_DATABASE_URI = (
        f"postgresql://{os.environ.get('DB_USER', 'worktime')}:"
        f"{os.environ.get('DB_PASSWORD', 'worktime')}@"
        f"{os.environ.get('DB_HOST', 'localhost')}:"
        f"{os.environ.get('DB_PORT', '5432')}/"
        f"{os.environ.get('DB_NAME', 'worktime')}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "jwt-dev-secret")
    JWT_ACCESS_TOKEN_EXPIRES = 86400
    JSON_AS_ASCII = False
