import os, re 
for root, dirs, files in os.walk('src'): 
    for f in files: 
        if f.endswith('.tsx') or f.endswith('.ts'): 
            path = os.path.join(root, f) 
            content = open(path, encoding='utf-8').read() 
            if '@/server/' in content: 
                for line in content.split('\n'): 
                    if 'import' in line and '@/server/' in line: 
                        print(path, ':', line.strip()) 
