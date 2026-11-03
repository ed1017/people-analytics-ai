"""Retained fictional reporting policy from the reviewed October23 generator.
Stable authority, hard span12; no new organizational benchmark.
"""
import hashlib,collections,heapq
from functools import lru_cache
@lru_cache(maxsize=None)
def stable_authority(e):return hashlib.sha256(('authority|'+e).encode()).hexdigest()
def authority(e,a):return (-a['level'],stable_authority(e),e)
def preferred(e,a):
 family=a.get('job','DEMO').split('-')[0]
 low,high=(3,6) if family in {'LEGAL','HR','FIN','STRAT','CORPDEV'} else (6,10) if family in {'OPS','CSM','SALES'} else (4,8)
 return low+int(hashlib.sha256(('team-size|'+e).encode()).hexdigest()[:16],16)%(high-low+1)
def forest(members,prior,cap=12):
 if cap<1:raise ValueError('capacity must be positive')
 result={};spans=collections.Counter();groups=collections.defaultdict(list)
 for e,a in members.items():groups[a['bu']].append(e)
 for bu,ids in sorted(groups.items()):
  ids.sort(key=lambda e:authority(e,members[e]));rank={e:i for i,e in enumerate(ids)};root=ids[0];result[root]=None
  for e in ids[1:]:
   p=prior.get(e)
   if p in rank and rank[p]<rank[e] and spans[p]<cap:result[e]=p;spans[p]+=1
  def priority(e):
   # Retained partial teams first; new teams before already preferred-size teams.
   target=min(cap,preferred(e,members[e]));n=spans[e]
   return (0 if 0<n<target else 1 if n==0 else 2,rank[e],e)
  available=[]
  for e in ids:
   if e not in result:
    while available:
     old=heapq.heappop(available);p=old[2]
     if spans[p]>=cap:continue
     current=priority(p)
     if old!=current:heapq.heappush(available,current);continue
     heapq.heappush(available,current);break
    if not available:
     # A new high-authority member may precede all free managers. Release one
     # future reservation, never an already processed edge; it will be reassigned.
     donor=next((child for child in reversed(ids) if child in result and result[child] is not None and rank[child]>rank[e] and rank[result[child]]<rank[e]),None)
     if donor is None:raise ValueError('No eligible manager capacity')
     p=result.pop(donor);spans[p]-=1;heapq.heappush(available,priority(p))
    p=available[0][2];result[e]=p;spans[p]+=1
   # Existing managers first, then higher authority; fills teams without forced monthly reshuffling.
   heapq.heappush(available,priority(e))
 check_forest(members,result,cap)
 return result

def check_forest(members,parents,cap):
 if set(members)!=set(parents):raise ValueError('coverage')
 spans=collections.Counter(p for p in parents.values() if p)
 roots=collections.Counter()
 for e,p in parents.items():
  if p is None:roots[members[e]['bu']]+=1
  elif p not in members or members[p]['bu']!=members[e]['bu'] or authority(p,members[p])>=authority(e,members[e]):raise ValueError('invalid edge')
 if any(n>cap for n in spans.values()):raise ValueError('capacity')
 if roots!=collections.Counter({a['bu']:1 for a in members.values()}):raise ValueError('roots')
 return spans
