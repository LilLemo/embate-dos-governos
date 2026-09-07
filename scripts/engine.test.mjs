import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PERIODS,months,previous,windows,coverage,comparison,intervals,winner,scorecard} from '../dist/engine.js';
const data=JSON.parse(readFileSync(new URL('../dist/data.json',import.meta.url),'utf8'));
const initial=()=>({city:'SP',a:{id:'lula2'},b:{id:'bolsonaro'},duration:'equal',index:'inpc'});
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);

test('Dados carregados correspondem às 27 capitais e Macaé, sem sobrepor o Rio',()=>{
 assert.equal(data.locations.length,28);assert.equal(data.locations.filter(l=>l.capital).length,27);
 assert.equal(data.locations.find(l=>l.id==='MACAE').capital,false);
 assert.equal(data.locations.find(l=>l.id==='RJ').name,'Rio de Janeiro');
 assert.equal(data.states.length,27);assert.equal(new Set(data.states.map(s=>s.uf)).size,27);
 assert.ok(data.states.every(s=>s.path.startsWith('M')));
});
test('As sete capitais novas preservam séries completas e curtas sem imputação',()=>{
 const expected={PE:379,AC:35,RJ:379,BA:379,MA:56,PI:35,ES:379};
 for(const [uf,count] of Object.entries(expected)){const l=data.locations.find(x=>x.id===uf);assert.ok(l);assert.equal(l.count,count);}
 assert.equal(data.locations.reduce((s,l)=>s+l.count,0),6783);
 assert.equal(data.locations.find(l=>l.id==='AC').first,'2016-01');
});
test('Os 380 meses econômicos são contínuos e usam a vigência salarial mensal',()=>{
 const dates=months('1994-12','2026-07');assert.equal(dates.length,380);
 for(const m of dates){assert.ok(data.salary[m]>0);for(const k of ['inpc','ipca'])assert.ok(data.indices[k].levels[m]>0);}
 assert.equal(data.salary['2020-01'],103900);assert.equal(data.salary['2020-02'],104500);
 assert.equal(data.salary['2023-04'],130200);assert.equal(data.salary['2023-05'],132000);
 near(data.indices.inpc.rates['2022-12'],.69);
});
test('Comparação integral exige os 48 meses; a média é dos quocientes mensais',()=>{
 const s=initial(),r=comparison(data,s);assert.ok(r.analyses.every(a=>a.coverage.complete));
 assert.ok(r.analyses.every(a=>a.coverage.total===48));
 const a=r.analyses[0];near(a.summary.share,a.series.reduce((sum,m)=>sum+100*m.basket/m.salary,0)/48);
 near(a.summary.baskets,a.series.reduce((sum,m)=>sum+m.salary/m.basket,0)/48);
});
test('Igualar duração recorta o mandato longo sem avançar dados em 2026',()=>{
 const s=initial();s.b.id='lula3';let r=comparison(data,s);
 assert.equal(r.ws[0].months.length,43);assert.equal(r.ws[0].end,'2010-07');assert.equal(r.ws[1].end,'2026-07');
 s.duration='full';r=comparison(data,s);assert.equal(r.ws[0].months.length,48);assert.equal(r.ws[1].months.length,43);
});
test('Comparação equivalente aplica na prática a duração do período mais curto',()=>{
 const s=initial();s.a.id='lula2';s.b.id='dilma2';let r=comparison(data,s);
 assert.equal(r.ws[0].months.length,16);assert.equal(r.ws[0].end,'2008-04');assert.equal(r.ws[1].end,'2016-04');
 s.a.id='temer';s.b.id='bolsonaro';r=comparison(data,s);
 assert.equal(r.ws[0].months.length,31);assert.equal(r.ws[1].months.length,31);assert.equal(r.ws[1].end,'2021-07');
});
test('Boa Vista preserva as lacunas, a referência recalculada e bloqueia médias parciais',()=>{
 const l=data.locations.find(l=>l.id==='RR');assert.equal(l.count,36);assert.ok(l.revisions['2015-12']);assert.equal(l.rows['2015-12'],undefined);
 assert.ok(intervals(l).length>1);const s=initial();s.city='RR';const r=comparison(data,s);
 assert.equal(r.analyses[0].summary,null);assert.equal(r.analyses[1].summary,null);
 assert.ok(r.analyses[0].series.every(x=>x.basket===null));
 assert.ok(r.analyses[0].economic); // salário e inflação são nacionais
});
test('Boa Vista permite períodos personalizados completos dentro da série disponível',()=>{
 const s=initial();s.city='RR';s.a={id:'custom',start:'2025-04',end:'2025-09'};s.b={id:'custom',start:'2026-01',end:'2026-06'};
 const r=comparison(data,s);assert.ok(r.analyses.every(a=>a.summary&&a.coverage.complete));
 assert.ok(r.analyses.every(a=>a.summary.foods[5]===null)); // batata não aplicável
});
test('Agregado usa amostra fixa e exclui Macaé e capitais sem cobertura completa',()=>{
 const s=initial();s.city='BR';const r=comparison(data,s);
 assert.ok(r.sample.length>1);assert.ok(r.sample.every(l=>l.capital));
 const required=[...new Set(r.ws.flatMap(w=>w.months))];assert.ok(r.sample.every(l=>required.every(m=>l.rows[m])));
 const m='2019-01';near(r.location.rows[m][0],r.sample.reduce((sum,l)=>sum+l.rows[m][0],0)/r.sample.length);
 assert.ok(r.analyses.every(a=>a.coverage.complete));
 assert.equal(r.location.rows[m][6],null); // sem imputar batata às cestas sem o item
});
test('Ganho real compõe a inflação e toma dezembro anterior como referência',()=>{
 const r=comparison(data,initial()).analyses[1];
 assert.equal(r.economic.baseline,'2018-12');
 const inflation=months('2019-01','2022-12').reduce((f,m)=>f*(1+data.indices.inpc.rates[m]/100),1);
 near(r.economic.real,((1212/954)/inflation-1)*100);
 const s=initial();s.index='ipca';assert.notEqual(comparison(data,s).analyses[1].economic.inflation,r.economic.inflation);
});
test('Revisões de 2015 não duplicam um mês e anomalias conhecidas permanecem auditáveis',()=>{
 const sp=data.locations.find(l=>l.id==='SP');assert.equal(sp.count,379);assert.equal(sp.rows['2015-12'][0],41212);assert.equal(sp.revisions['2015-12'][0],41813);
 assert.equal(data.locations.flatMap(l=>l.audit).length,2);
 for(const l of data.locations){assert.equal(l.count,Object.keys(l.rows).length);for(const row of Object.values(l.rows)){assert.ok(row[0]>0);assert.equal(row.length,14);}}
});
test('Transição presidencial e datas inválidas não criam meses silenciosos',()=>{
 assert.equal(PERIODS.find(p=>p.id==='dilma2').end,'2016-04');assert.equal(PERIODS.find(p=>p.id==='temer').start,'2016-06');
 assert.deepEqual(months('2026-02','2026-01'),[]);assert.deepEqual(months('2026-13','2027-01'),[]);
 assert.equal(previous('2020-01'),'2019-12');
});
test('Placar dá um ponto por critério independente e resolve empates',()=>{
 const r=comparison(data,initial()),board=scorecard(r);
 assert.equal(board.rounds.length,3);assert.equal(board.points.a+board.points.b,3);
 assert.equal(board.overall,'a');
 assert.equal(winner(10,10.003,'lower'),'tie');assert.equal(winner(null,4),'na');
 assert.equal(winner(4,5,'lower'),'a');assert.equal(winner(4,5,'higher'),'b');
});
