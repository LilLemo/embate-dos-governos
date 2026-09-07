export const PERIODS = [
 {id:'fhc1',name:'FHC I',full:'Fernando Henrique Cardoso',start:'1995-01',end:'1998-12',term:'1º mandato',portrait:'portraits/fhc.webp'},
 {id:'fhc2',name:'FHC II',full:'Fernando Henrique Cardoso',start:'1999-01',end:'2002-12',term:'2º mandato',portrait:'portraits/fhc.webp'},
 {id:'lula1',name:'Lula I',full:'Luiz Inácio Lula da Silva',start:'2003-01',end:'2006-12',term:'1º mandato',portrait:'portraits/lula1.webp'},
 {id:'lula2',name:'Lula II',full:'Luiz Inácio Lula da Silva',start:'2007-01',end:'2010-12',term:'2º mandato',portrait:'portraits/lula2.webp'},
 {id:'dilma1',name:'Dilma I',full:'Dilma Rousseff',start:'2011-01',end:'2014-12',term:'1º mandato',portrait:'portraits/dilma.webp'},
 {id:'dilma2',name:'Dilma II',full:'Dilma Rousseff',start:'2015-01',end:'2016-04',term:'Até o afastamento',portrait:'portraits/dilma.webp'},
 {id:'temer',name:'Temer',full:'Michel Temer',start:'2016-06',end:'2018-12',term:'Inclui exercício interino',portrait:'portraits/temer.webp'},
 {id:'bolsonaro',name:'Bolsonaro',full:'Jair Bolsonaro',start:'2019-01',end:'2022-12',term:'Mandato completo',portrait:'portraits/bolsonaro.webp'},
 {id:'lula3',name:'Lula III',full:'Luiz Inácio Lula da Silva',start:'2023-01',end:'2026-07',term:'Em andamento · até jul/26',portrait:'portraits/lula3.webp'},
];
export function ordinal(m) { return +m.slice(0,4)*12 + +m.slice(5,7)-1; }
export function monthFrom(n) { return `${Math.floor(n/12)}-${String(n%12+1).padStart(2,'0')}`; }
export function months(a,b) {
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(a)||!/^\d{4}-(0[1-9]|1[0-2])$/.test(b)||a>b) return [];
 const result=[]; for(let n=ordinal(a);n<=ordinal(b);n++) result.push(monthFrom(n));return result;
}
export const previous=m=>monthFrom(ordinal(m)-1);
export function windows(state) {
 const result=['a','b'].map(k=>{
  const s=state[k];const p=s.id==='custom'?{id:'custom',name:'Personalizado',full:'Período escolhido',term:'Recorte livre',start:s.start,end:s.end}:PERIODS.find(p=>p.id===s.id);
  return {...p,months:months(p.start,p.end)};
 });
 if(state.duration==='equal'){
  const n=Math.min(...result.map(w=>w.months.length));
  for(const w of result){w.months=w.months.slice(0,n);w.end=w.months.at(-1)||w.start;}
 }
 return result;
}
export function coverage(location,dates) { const count=dates.filter(m=>location?.rows[m]).length;return {count,total:dates.length,complete:dates.length>0&&count===dates.length}; }
export function intervals(location){
 const dates=Object.keys(location.rows).sort(),groups=[];
 for(const m of dates){const g=groups.at(-1);if(g&&ordinal(m)===ordinal(g[1])+1)g[1]=m;else groups.push([m,m]);}
 return groups;
}
export function selection(data,state,ws=windows(state)){
 if(state.city!=='BR')return {location:data.locations.find(l=>l.id===state.city),sample:[]};
 const required=[...new Set(ws.flatMap(w=>w.months))];
 const sample=data.locations.filter(l=>l.capital&&required.length&&required.every(m=>l.rows[m]));
 if(!sample.length)return {location:null,sample:[]};
 const candidate=[...new Set([...required,...ws.map(w=>previous(w.start))])].sort();
 const rows={};
 for(const m of candidate){
  if(!sample.every(l=>l.rows[m]))continue;
  rows[m]=Array.from({length:14},(_,i)=>sample.every(l=>l.rows[m][i]!=null)?sample.reduce((s,l)=>s+l.rows[m][i],0)/sample.length:null);
 }
 return {location:{id:'BR',uf:'BR',name:'Média das capitais',capital:false,rows,count:Object.keys(rows).length,first:required[0],last:required.at(-1),sample:true,notes:[],audit:[]},sample};
}
const mean=arr=>arr.length?arr.reduce((a,b)=>a+b,0)/arr.length:null;
export function analyse(data,location,w,index='inpc'){
 const cov=coverage(location,w.months),levels=data.indices[index].levels;
 const series=w.months.map(month=>{
  const r=location?.rows[month],salary=data.salary[month],level=levels[month];
  return {month,basket:r?.[0]??null,salary,share:r&&salary?100*r[0]/salary:null,
   baskets:r&&salary?salary/r[0]:null,hours:r&&salary?220*r[0]/salary:null,
   realSalary:salary&&level?salary*levels[data.lastMonth]/level:null,
   foods:Array.from({length:13},(_,i)=>r?.[i+1]!=null&&salary?100*r[i+1]/salary:null)};
 });
 const baseline=previous(w.start),last=w.months.at(-1);
 const s0=data.salary[baseline],s1=data.salary[last],i0=levels[baseline],i1=levels[last];
 const economic=s0&&s1&&i0&&i1?{nominal:100*(s1/s0-1),inflation:100*(i1/i0-1),real:100*((s1/s0)/(i1/i0)-1),baseline,last}:null;
 const summary=cov.complete?{
  share:mean(series.map(r=>r.share)),baskets:mean(series.map(r=>r.baskets)),hours:mean(series.map(r=>r.hours)),
  meanBasket:mean(series.map(r=>r.basket)),meanSalary:mean(series.map(r=>r.salary)),
  foods:Array.from({length:13},(_,i)=>series.every(r=>r.foods[i]!=null)?mean(series.map(r=>r.foods[i])):null),
  startShare:series[0].share,endShare:series.at(-1).share,
 }:null;
 return {window:w,coverage:cov,series,summary,economic,
  methodBreak:w.start<'2016-01'&&w.end>='2016-01',
  audit:location?.audit?.filter(x=>x.month>=w.start&&x.month<=w.end)||[]};
}
export function comparison(data,state){const ws=windows(state),chosen=selection(data,state,ws);return {...chosen,ws,analyses:ws.map(w=>analyse(data,chosen.location,w,state.index))};}

export function winner(a,b,direction='higher',epsilon=.005){
 if(!Number.isFinite(a)||!Number.isFinite(b))return 'na';
 if(Math.abs(a-b)<=epsilon)return 'tie';
 const aWins=direction==='lower'?a<b:a>b;
 return aWins?'a':'b';
}

export function scorecard(result){
 const [a,b]=result.analyses;
 const trend=r=>r.summary? r.summary.endShare-r.summary.startShare:null;
 const rounds=[
  {id:'basket',label:'Cesta no salário',help:'Menor média vence',a:a.summary?.share,b:b.summary?.share,direction:'lower'},
  {id:'real',label:'Salário real',help:'Maior variação vence',a:a.economic?.real,b:b.economic?.real,direction:'higher'},
  {id:'trend',label:'Evolução da cesta',help:'Menor mudança em pontos percentuais vence',a:trend(a),b:trend(b),direction:'lower'},
 ].map(r=>({...r,winner:winner(r.a,r.b,r.direction)}));
 const points={a:rounds.filter(r=>r.winner==='a').length,b:rounds.filter(r=>r.winner==='b').length};
 const valid=rounds.filter(r=>r.winner!=='na').length;
 const overall=!valid?'na':points.a===points.b?'tie':points.a>points.b?'a':'b';
 return {rounds,points,valid,overall};
}
