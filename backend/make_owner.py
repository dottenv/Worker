"""
Скрипт: выдать пользователю права владельца (owner) по email.

Использование:
    python make_owner.py email@example.com

Создаёт первый склад для пользователя, если у него его нет.
"""

import sys
from app import create_app
from models import User, ServiceCenter, ServiceCenterMember
from extensions import db

app = create_app()

with app.app_context():
    if len(sys.argv) < 2:
        print('Укажите email: python make_owner.py user@example.com')
        sys.exit(1)

    email = sys.argv[1].strip().lower()
    user = User.query.filter_by(email=email).first()

    if not user:
        print(f'Пользователь с email "{email}" не найден.')
        sys.exit(1)

    existing = ServiceCenter.query.filter_by(owner_id=user.id).count()
    if existing > 0:
        print(f'Пользователь {user.full_name} ({email}) уже владелец ({existing} центров).')
        sys.exit(0)

    sc = ServiceCenter(
        name='Мой склад',
        description='',
        owner_id=user.id,
    )
    db.session.add(sc)
    db.session.flush()

    member = ServiceCenterMember(
        service_center_id=sc.id,
        user_id=user.id,
        role='owner',
    )
    db.session.add(member)
    db.session.commit()

    print(f'Готово. Для {user.full_name} ({email}) создан склад "Мой склад" (id={sc.id}).')
