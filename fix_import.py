import sys

with open('src/contexts/AuthContext.jsx', 'r') as f:
    lines = f.readlines()

# Fix line 12
if lines[11].strip().startswith("import api"):
    lines[11] = lines[11].replace("from '@/api'", "from '../api'")

with open('src/contexts/AuthContext.jsx', 'w') as f:
    f.writelines(lines)
    
print("Fixed import in AuthContext.jsx")
