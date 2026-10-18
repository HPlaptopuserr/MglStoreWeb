'use client';
import {useMemo,useState} from 'react';
import Link from 'next/link';
import {currency,type DashboardData} from './model';
export function OverdueTable({rows}:{rows:DashboardData['overdue']}) {
 const [query,setQuery]=useState(''),[range,setRange]=useState('all'),[page,setPage]=useState(1);
 const filtered=useMemo(()=>rows.filter(r=>`${r.customer} ${r.phone??''} ${r.unit} ${r.reference}`.toLowerCase().includes(query.toLowerCase())&&(range==='all'||range==='30'&&r.days<=30||range==='60'&&r.days>30&&r.days<=60||range==='more'&&r.days>60)),[rows,query,range]);
 const pages=Math.max(1,Math.ceil(filtered.length/10));const current=Math.min(page,pages);
 return <section className="erp-card" id="overdue"><div className="erp-section-heading"><div><p className="erp-eyebrow">АВЛАГЫН ХЯНАЛТ</p><h2>Хугацаа хэтэрсэн төлбөр <small>{filtered.length}</small></h2></div><div className="erp-filters"><input aria-label="Төлөлт хайх" placeholder="Нэр, утас, байр, бүртгэлээр хайх…" value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}}/><select aria-label="Хоцролтын хугацаа" value={range} onChange={e=>{setRange(e.target.value);setPage(1)}}><option value="all">Бүх хугацаа</option><option value="30">1–30 хоног</option><option value="60">31–60 хоног</option><option value="more">60-аас дээш</option></select></div></div>
 <div className="erp-table-scroll"><table><thead><tr>{['Бүртгэлийн №','Худалдан авагч','Блок / байр','Төлөх өдөр','Хоцролт','Төлөх дүн','Үйлдэл'].map(t=><th key={t}>{t}</th>)}</tr></thead><tbody>{filtered.slice((current-1)*10,current*10).map(r=><tr key={r.id}><td title={r.reference}>{r.reference.slice(0,8)}</td><td><strong>{r.customer}</strong><small>{r.phone||'Утас оруулаагүй'}</small></td><td>{r.block} / №{r.unit}</td><td>{new Date(r.dueDate).toLocaleDateString('mn-MN',{timeZone:'Asia/Ulaanbaatar'})}</td><td><span className="erp-overdue-badge">{r.days} хоног</span></td><td>{currency(r.amount)}</td><td><Link href={`/building/manage/${r.projectId}/website`}>Төсөл нээх ↗</Link></td></tr>)}</tbody></table></div>
 {!filtered.length&&<div className="erp-empty">{rows.length?'Хайлтад тохирох төлөлт олдсонгүй.':'Хугацаа хэтэрсэн төлбөрийн хуваарь бүртгэгдээгүй байна.'}</div>}
 <footer className="erp-pagination"><span>Нийт {filtered.length} төлөлт</span><button disabled={current===1} onClick={()=>setPage(current-1)}>← Өмнөх</button><span>{current} / {pages}</span><button disabled={current===pages} onClick={()=>setPage(current+1)}>Дараах →</button></footer></section>;
}
