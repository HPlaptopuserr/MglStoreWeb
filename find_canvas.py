import re

path = '/home/guser/Documents/Projects/MglStoreWeb/apps/admin/src/app/contract/sign/[id]/page.tsx'
with open(path, 'r') as f:
    content = f.read()
    lines = content.split('\n')

# Find the canvas block and replace it
target = '                        <div className="border-2 border-dashed border-[#1e4e8c]/40 rounded-lg bg-blue-50/30 relative" style={{ height: 140 }}>'

# Try to find it
for i, line in enumerate(lines):
    if 'border-dashed' in line and 'height: 140' in line:
        print(f"Line {i+1}: {repr(line)}")

print("Done searching")
