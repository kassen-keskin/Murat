lines = open('public/index.html', encoding='utf-8').readlines()
for i, line in enumerate(lines):
    if 'ticketStatusFilter' in line:
        print(f"Start at {i-5}:")
        for j in range(max(0, i-5), min(len(lines), i+15)):
            print(f"{j+1}: {lines[j]}", end='')
        break
