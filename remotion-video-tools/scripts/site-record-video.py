import json,sys,subprocess
d=json.load(open(f'{sys.argv[1]}/frames.json')); f=d['frames']; t0=f[0]['t']
lines=[]
for i,x in enumerate(f):
    dur=(f[i+1]['t']-x['t']) if i+1<len(f) else 0.5
    lines.append(f"file '{x['file']}'\nduration {max(dur,0.001):.4f}")
lines.append(f"file '{f[-1]['file']}'")
open(f'{sys.argv[1]}/concat.txt','w').write('\n'.join(lines))
subprocess.run(['ffmpeg','-v','error','-y','-f','concat','-safe','0','-i',f'{sys.argv[1]}/concat.txt','-vf','fps=30,format=yuv420p','-c:v','libx264','-crf','16','-preset','medium','-g','15',f'{sys.argv[1]}/screen.mp4'],check=True)
json.dump({'t0':t0,'marks':{m['name']:m['t']-t0 for m in d['marks']},'cursor':[{**c,'t':c['t']-t0} for c in d['cursor']],'W':d['W'],'H':d['H']},open(f'{sys.argv[1]}/timeline.json','w'),ensure_ascii=False,indent=1)
