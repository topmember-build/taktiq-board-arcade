import re 
content = open('src/routes/match.$id.tsx', encoding='utf-8').read() 
fixed = content.replace('@/server/matchMoves.functions"', '@/server/matchMoves.functions.server"') 
open('src/routes/match.$id.tsx', 'w', encoding='utf-8').write(fixed) 
print('Done') 
