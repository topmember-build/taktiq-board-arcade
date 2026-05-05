f=open('src/routes/match.$id.tsx',encoding='utf-8').read() 
fixed=f.replace('@/server/matchMoves.functions.server','@/lib/matchMoves.server') 
open('src/routes/match.$id.tsx','w',encoding='utf-8').write(fixed) 
print('done') 
