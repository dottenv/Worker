with open("src/pages/Settings.tsx", "r", encoding="utf-8") as f:
    content = f.read()
for name in ["LogOut", "ChevronRight", "Puzzle"]:
    count = content.count(name)
    print(f"{name}: {count}")
