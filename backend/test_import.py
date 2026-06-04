import sys
sys.path.insert(0, '.')
from routes.settings import settings_bp, verify_chat, get_forum_topics, get_known_topics
print('All OK')
print(f'Endpoints: verify_chat={verify_chat.__name__}, forum_topics={get_forum_topics.__name__}, topics={get_known_topics.__name__}')
