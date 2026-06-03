import os, re, sys

path = r'C:\Users\щ\Documents\Worker\frontend\src\pages\AdminSchedule.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
print(f'File size: {len(content)}', flush=True)

# search for Russian unicode range
russian_words = re.findall(r'[А-Яа-яёЁ]+', content)
unique = sorted(set(russian_words))
print(f'Found {len(unique)} unique Russian words', flush=True)
for w in unique:
    print(w, flush=True)
