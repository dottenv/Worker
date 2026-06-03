import os, re

results = []

# Search frontend
for root, dirs, files in os.walk(r'C:\Users\щ\Documents\Worker\frontend\src'):
    for f in files:
        if f.endswith(('.tsx', '.ts')):
            path = os.path.join(root, f)
            try:
                with open(path, 'r', encoding='utf-8') as fp:
                    content = fp.read()
                for pattern, name in [
                    (r'Сервис[^\w]', 'Сервис'),
                    (r'Центр[^\w]', 'Центр'),
                    (r'центр[^\w]', 'центр'),
                    (r'СЦ[^\w]', 'СЦ'),
                    (r'сц[^\w]', 'сц'),
                ]:
                    for m in re.finditer(pattern, content):
                        # find line number
                        line_num = content[:m.start()].count('\n') + 1
                        line = content.split('\n')[line_num - 1].strip()
                        results.append((path, line_num, name, line[:150]))
            except:
                pass

# Search backend routes for UI strings
for root, dirs, files in os.walk(r'C:\Users\щ\Documents\Worker\backend'):
    for f in files:
        if f.endswith('.py'):
            path = os.path.join(root, f)
            try:
                with open(path, 'r', encoding='utf-8') as fp:
                    content = fp.read()
                for pattern, name in [
                    (r'Сервис[^\w]', 'Сервис'),
                    (r'Центр[^\w]', 'Центр'),
                    (r'центр[^\w]', 'центр'),
                    (r'СЦ[^\w]', 'СЦ'),
                    (r'сц[^\w]', 'сц'),
                ]:
                    for m in re.finditer(pattern, content):
                        line_num = content[:m.start()].count('\n') + 1
                        line = content.split('\n')[line_num - 1].strip()
                        results.append((path, line_num, name, line[:150]))
            except:
                pass

with open(r'C:\Users\щ\Documents\Worker\all_terms.txt', 'w', encoding='utf-8') as f:
    for path, line_num, name, line in sorted(set(results)):
        f.write(f'{path}:{line_num} [{name}]: {line}\n')

print(f'Found {len(results)} results')
