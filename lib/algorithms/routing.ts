export type Point = { id: string; x: number; y: number };
export type Edge = { from: string; to: string; distance: number; blocked?: boolean; bidirectional?: boolean };
const euclidean = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export function aStar(nodes: Point[], edges: Edge[], startId: string, goalId: string) { const byId=new Map(nodes.map(n=>[n.id,n]));const open=new Set([startId]);const came=new Map<string,string>();const g=new Map<string,number>([[startId,0]]);const goal=byId.get(goalId);if(!goal)return[];while(open.size){const current=[...open].sort((a,b)=>(g.get(a)??Infinity)+euclidean(byId.get(a)!,goal)-((g.get(b)??Infinity)+euclidean(byId.get(b)!,goal)))[0];if(current===goalId){const path=[current];let cursor=current;while(came.has(cursor)){cursor=came.get(cursor)!;path.unshift(cursor)}return path}open.delete(current);for(const edge of edges.filter(e=>!e.blocked&&(e.from===current||(e.bidirectional!==false&&e.to===current)))){const next=edge.from===current?edge.to:edge.from;const tentative=(g.get(current)??Infinity)+edge.distance;if(tentative<(g.get(next)??Infinity)){came.set(next,current);g.set(next,tentative);open.add(next)}}}return dijkstra(nodes,edges,startId,goalId)}
export function dijkstra(nodes: Point[], edges: Edge[], startId: string, goalId: string) { const unvisited=new Set(nodes.map(n=>n.id));const dist=new Map<string,number>([[startId,0]]);const prev=new Map<string,string>();while(unvisited.size){const current=[...unvisited].sort((a,b)=>(dist.get(a)??Infinity)-(dist.get(b)??Infinity))[0];if(!Number.isFinite(dist.get(current)??Infinity))break;unvisited.delete(current);if(current===goalId)break;for(const e of edges.filter(e=>!e.blocked&&(e.from===current||(e.bidirectional!==false&&e.to===current)))){const next=e.from===current?e.to:e.from;const alt=(dist.get(current)??0)+e.distance;if(alt<(dist.get(next)??Infinity)){dist.set(next,alt);prev.set(next,current)}}}if(!dist.has(goalId))return[];const path=[goalId];let cursor=goalId;while(prev.has(cursor)){cursor=prev.get(cursor)!;path.unshift(cursor)}return path}
export const routeDistance=(route:Point[])=>route.slice(1).reduce((d,p,i)=>d+euclidean(route[i],p),0);
export function nearestNeighbor(start:Point,stops:Point[]){const left=[...stops],route=[start];while(left.length){const current=route.at(-1)!;left.sort((a,b)=>euclidean(current,a)-euclidean(current,b));route.push(left.shift()!)}return[...route,start]}
export function twoOpt(route:Point[]){let best=[...route],improved=true;while(improved){improved=false;for(let i=1;i<best.length-2;i++)for(let k=i+1;k<best.length-1;k++){const candidate=[...best.slice(0,i),...best.slice(i,k+1).reverse(),...best.slice(k+1)];if(routeDistance(candidate)+.001<routeDistance(best)){best=candidate;improved=true}}}return best}

export function warehouseAStarRoute(stops:Point[]){
  const cp:Point={id:'CP',x:60,y:520};
  const corridorYs=[170,275,380,485,520];
  const nodes:Point[]=[cp,...corridorYs.map(y=>({id:`S-${y}`,x:85,y}))];
  const edges:Edge[]=[{from:'CP',to:'S-520',distance:25,bidirectional:true}];
  for(let i=1;i<corridorYs.length;i++)edges.push({from:`S-${corridorYs[i-1]}`,to:`S-${corridorYs[i]}`,distance:corridorYs[i]-corridorYs[i-1],bidirectional:true});
  stops.forEach((stop,i)=>{const corridorY=stop.y+65,access={id:`A-${i}`,x:stop.x+37,y:corridorY},goal={id:`G-${i}`,x:stop.x+37,y:stop.y+21};nodes.push(access,goal);edges.push({from:`S-${corridorY}`,to:access.id,distance:access.x-85,bidirectional:true},{from:access.id,to:goal.id,distance:44,bidirectional:true});});
  const ordered=twoOpt(nearestNeighbor(cp,stops.map((s,i)=>({...s,id:`G-${i}`,x:s.x+37,y:s.y+21})))).slice(1,-1);
  const ids=['CP',...ordered.map(p=>p.id),'CP'];const pathIds:string[]=[];
  for(let i=1;i<ids.length;i++){const segment=aStar(nodes,edges,ids[i-1],ids[i]);pathIds.push(...segment.slice(i===1?0:1));}
  const byId=new Map(nodes.map(n=>[n.id,n]));return pathIds.map(id=>byId.get(id)!).filter(Boolean);
}
