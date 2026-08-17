import json, subprocess, os, re, collections, glob, time

HOME = os.path.expanduser('~/.dsh/sessions')
def read_lines(path):
    out = subprocess.run(['zstd','-dc',path], capture_output=True, text=True, errors='replace').stdout
    for line in out.splitlines():
        try:
            yield json.loads(line)
        except Exception:
            pass

def stats(text):
    low = text.lower()
    return {
        'we': len(re.findall(r'\bwe\b', low)),
        'lets': len(re.findall(r"\blet's\b", low)),
        'letme': len(re.findall(r'\blet me\b', low)),
        'i': len(re.findall(r'\bi\b', low)),
        'need': len(re.findall(r'\bneed\b', low)),
        'chars': len(text),
    }

def first_line(text):
    for line in text.splitlines():
        line=line.strip()
        if line: return line
    return ''

def classify(line):
    if re.match(r'^We need\b', line, re.I): return 'we-need'
    if re.match(r'^The user wants', line, re.I): return 'user-wants'
    if re.match(r'^Let me\b', line, re.I): return 'let-me'
    return 'other'

files=[]
for root, dirs, names in os.walk(HOME):
    for n in names:
        if n=='session.jsonl.zstd':
            p=os.path.join(root,n)
            try: m=os.path.getmtime(p)
            except: continue
            # exclude our synthetic /tmp A/B fixtures
            if '/tmp' in root or '/private/tmp' in root: continue
            files.append((m,p))

files.sort(reverse=True)
print('recent real session files (top 12):')
for m,p in files[:12]:
    print(f'  {time.strftime("%m-%d %H:%M", time.localtime(m))} {p.replace(HOME,"~")}')

for m,p in files[:8]:
    print('\n'+'='*100)
    print('FILE', p.replace(HOME,'~'), 'mtime', time.strftime('%m-%d %H:%M', time.localtime(m)))
    first=True
    preset='?'
    selected=[]
    headers=[]
    assistants=[]
    user_sources=[]
    tool_calls=collections.Counter()
    title=''
    events=read_lines(p)
    # two passes? one pass list
    evs=list(events)
    for e in evs:
        t=e.get('type')
        if first and t=='session':
            first=False
            preset=e.get('agentPreset','?')
            print(' created preset:', preset, 'cwd:', e.get('cwd'))
        if t=='agent-preset/selected':
            selected.append(e.get('data',{}).get('agentPreset'))
            print(' selected preset event:', e.get('data',{}).get('agentPreset'), 'seq', e.get('seq'))
        if t=='session/title':
            title=e.get('data',{}).get('title') if isinstance(e.get('data'),dict) else e.get('data')
        if t=='request/header':
            d=e.get('data',{})
            hdr=d.get('header',{})
            tools=[x.get('name') for x in hdr.get('tools',[])]
            headers.append({'seq':e.get('seq'),'reason':d.get('reason'),'tools':tools,'config':hdr.get('config',{}),'adapterDefaults':hdr.get('adapterDefaults',{})})
        if t=='assistant/message':
            msg=e.get('data',{}).get('message',{})
            for block in msg.get('content',[]):
                if block.get('type')=='reasoning':
                    txt=block.get('text','')
                    line=first_line(txt)
                    s=stats(txt)
                    assistants.append({'seq':e.get('seq'),'line':line,'cls':classify(line),**s})
                    break
        if t=='user/message':
            src=e.get('data',{}).get('message',{}).get('source',{})
            user_sources.append({'seq':e.get('seq'),'kind':src.get('kind'),'name':src.get('name'),'form':src.get('form'),'chars':sum(len(b.get('text','')) for b in e.get('data',{}).get('message',{}).get('content',[]) if isinstance(b,dict))})
        if t=='tool/call':
            tool_calls[e.get('data',{}).get('name')]+=1
    print(' title:', title, '| selected:', selected)
    print(' headers:', len(headers))
    for h in headers:
        print(f'   seq={h["seq"]:>4} reason={h["reason"]:>8} tools={len(h["tools"]):>2} {h["tools"][:8]}{"..." if len(h["tools"])>8 else ""} maxTokens={h["config"].get("maxTokens","-")} adapterDefaults={h.get("adapterDefaults")}')
    print(' assistants:', len(assistants), '| tool calls:', sum(tool_calls.values()), dict(tool_calls.most_common(10)))
    # phase buckets by header seq
    bounds=[h['seq'] for h in headers]+[10**9]
    for i,h in enumerate(headers):
        bucket=[a for a in assistants if h['seq'] <= a['seq'] < bounds[i+1]]
        if not bucket: continue
        agg=collections.Counter(a['cls'] for a in bucket)
        tot_we=sum(a['we'] for a in bucket); tot_let=sum(a['letme'] for a in bucket); tot_lets=sum(a['lets'] for a in bucket)
        print(f'   phase {i} tools={len(h["tools"])} n={len(bucket)} cls={dict(agg)} we={tot_we} lets={tot_lets} letme={tot_let}')
        for a in bucket[:8]:
            print(f'      seq={a["seq"]:>4} {a["cls"]:<10} {a["line"][:70]}')
        if len(bucket)>8: print(f'      ... {len(bucket)-8} more')
    # first-line style transition in order
    seqs=[a['cls'] for a in assistants]
    transitions=[]
    for i in range(1,len(seqs)):
        if seqs[i]!=seqs[i-1]: transitions.append((assistants[i-1]['seq'], assistants[i]['seq'], seqs[i-1], seqs[i]))
    print(' style transitions:', len(transitions), transitions[:20])
    print(' user sources:')
    for u in user_sources[:30]:
        print(f'   seq={u["seq"]:>4} kind={u["kind"]} name={u.get("name")} form={u.get("form")} chars={u["chars"]}')
    if len(user_sources)>30: print('   ...')
