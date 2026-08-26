import { CSSProperties, Children, FormEvent, ReactNode, isValidElement, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { BookOpen, ExternalLink, Mail, Send, ShieldCheck, X } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Textarea } from '../components/Textarea';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import { productFeatures } from '../content/featureRegistry';

type Issue = Record<string, any> & { id:string; issue_date:string; title:string; introduction:string; parent_tips:string[] };
type CommunitySubmissionRecord = {
  id:string; contribution_type:string; title:string; content:string; display_name:string;
  source_url:string|null; status:'pending'|'approved'|'rejected'; submitted_at:string; reviewed_at:string|null;
};
const displayDate=(value:string)=>new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(`${value}T12:00:00Z`)).replace(/^(\d{2}) ([A-Za-z]{3}) /,(_match,day,month)=>`${Number.parseInt(day,10)} ${month}, `);
const featureIdFor=(item:any)=>item.id||productFeatures.find(feature=>feature.title===item.title)?.id;
const communitySectionTypes=[
  {key:'story',title:'Parent Stories',tone:'amber' as const},
  {key:'news',title:'Community News',tone:'blue' as const},
  {key:'information',title:'Helpful Information',tone:'cyan' as const},
  {key:'tip',title:'Community Tips and Tricks',tone:'lime' as const},
  {key:'testimonial',title:'Community Testimonials',tone:'rose' as const},
  {key:'advertisement',title:'Community Advertisements',tone:'orange' as const},
];
function FormattedNewsletterContent({content}:{content:string}){
  return <div className="newsletter-article-content mt-5 text-left text-base leading-7">{content.split(/\n{2,}/).map((block,index)=>{
    const value=block.trim();
    const lines=value.split('\n').map(line=>line.trim()).filter(Boolean);
    const heading=value.replace(/^#{1,3}\s*/, '').replace(/^\*\*(.+)\*\*$/, '$1');
    if(lines.length===1&&(/^(#{1,3})\s/.test(value)||/^\*\*.+\*\*$/.test(value)||/[:—-]$/.test(value))&&heading.length<=100)return <h6 key={index}>{heading}</h6>;
    if(lines.length&&lines.every(line=>/^[-*•]\s+/.test(line)))return <ul key={index}>{lines.map((line,lineIndex)=><li key={lineIndex}>{line.replace(/^[-*•]\s+/, '')}</li>)}</ul>;
    return <p key={index}>{value}</p>;
  })}</div>;
}

export default function Newsletter(){
  const {month,issueDate}=useParams<{month?:string;issueDate?:string}>();
  const routeLocation=useLocation();
  const {user}=useAuth();
  const [email,setEmail]=useState(''); const [issues,setIssues]=useState<Issue[]>([]); const [loading,setLoading]=useState(true); const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState<{ok:boolean;text:string}|null>(null);
  const [post,setPost]=useState({submissionId:'',contributionType:'story',title:'',content:'',displayName:'',sourceUrl:'',consentToPublish:false});
  const [submissionPreview,setSubmissionPreview]=useState(false);
  const [mySubmissions,setMySubmissions]=useState<CommunitySubmissionRecord[]>([]);
  const loadMySubmissions=async()=>{if(!user)return;try{const response=await apiFetch('/api/newsletter/community-submissions/mine',{},0);const data=await response.json();if(!response.ok)throw new Error(data.error);setMySubmissions(Array.isArray(data)?data:[]);}catch(error){setMessage({ok:false,text:error instanceof Error?error.message:'Your submissions could not be loaded.'});}};
  useEffect(()=>{
    const query=new URLSearchParams(routeLocation.search);
    if(query.get('confirmation')) setMessage({ok:query.get('confirmation')==='success',text:query.get('confirmation')==='success'?'Subscription confirmed. The next weekly issue will arrive on its scheduled delivery day.':'That confirmation link is invalid or already used.'});
    if(query.get('unsubscribe')) setMessage({ok:query.get('unsubscribe')==='success',text:query.get('unsubscribe')==='success'?'You have been unsubscribed.':'That unsubscribe link is invalid.'});
    fetch('/api/newsletters').then(response=>response.ok?response.json():Promise.reject()).then(data=>setIssues(Array.isArray(data)?data:[])).catch(()=>setMessage({ok:false,text:'The newsletter archive is temporarily unavailable.'})).finally(()=>setLoading(false));
  },[routeLocation.search]);
  useEffect(()=>{if(routeLocation.pathname==='/newsletter/community'&&user)void loadMySubmissions();},[routeLocation.pathname,user]);
  const subscribe=async(event:FormEvent)=>{event.preventDefault();setBusy(true);try{const response=await fetch('/api/newsletter/subscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});const data=await response.json();if(!response.ok)throw new Error(data.error);setMessage({ok:true,text:data.message});setEmail('');}catch(error){setMessage({ok:false,text:error instanceof Error?error.message:'Subscription failed.'});}finally{setBusy(false);}};
  const submit=async(event:FormEvent)=>{event.preventDefault();if(!submissionPreview){setSubmissionPreview(true);return;}setBusy(true);try{const response=await apiFetch('/api/newsletter/community-submissions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(post)},0);const data=await response.json();if(!response.ok)throw new Error(data.error);setMessage({ok:true,text:data.message});setPost({...post,submissionId:'',title:'',content:'',sourceUrl:'',consentToPublish:false});setSubmissionPreview(false);await loadMySubmissions();}catch(error){setMessage({ok:false,text:error instanceof Error?error.message:'Submission failed.'});}finally{setBusy(false);}};
  const editSubmission=(item:CommunitySubmissionRecord)=>{setPost({submissionId:item.id,contributionType:item.contribution_type,title:item.title,content:item.content,displayName:item.display_name,sourceUrl:item.source_url||'',consentToPublish:true});setSubmissionPreview(false);setMessage(null);window.scrollTo({top:0,behavior:'smooth'});};
  const monthGroups=issues.reduce<Record<string,Issue[]>>((groups,issue)=>{const key=issue.issue_date.slice(0,7);(groups[key]||=[]).push(issue);return groups;},{});
  const monthKeys=Object.keys(monthGroups).sort((a,b)=>b.localeCompare(a));
  const monthLabel=(value:string)=>new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${value}-01T12:00:00Z`));
  const selectedIssue=issueDate?issues.find(issue=>issue.issue_date===issueDate):undefined;
  const isSubscribePage=routeLocation.pathname==='/newsletter/subscribe';
  const isCommunityPage=routeLocation.pathname==='/newsletter/community';
  const closeIssueTab=()=>{
    if(!issueDate)return;
    const monthUrl=`/newsletter/archive/${issueDate.slice(0,7)}`;
    window.close();
    window.setTimeout(()=>{if(!window.closed)window.location.assign(monthUrl);},100);
  };

  if(isSubscribePage)return <div className="page-shell"><div className="page-container flex min-h-[70vh] items-center justify-center"><section className="surface w-full max-w-3xl p-7 sm:p-10"><h1 className="text-3xl font-black sm:text-4xl">Get the weekly issue</h1><p className="mt-3 text-slate-600">Confirm once by email. Every issue includes one-click unsubscribe.</p>{message&&<div role="status" className={`mt-5 rounded-xl border p-4 text-sm font-bold ${message.ok?'border-emerald-200 bg-emerald-50 text-emerald-800':'border-red-200 bg-red-50 text-red-800'}`}>{message.text}</div>}<form onSubmit={subscribe} className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end"><Input label="Email address" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/><Button disabled={busy}><Mail className="mr-2 h-4 w-4"/>Subscribe</Button></form><p className="mt-5 flex gap-2 text-sm text-slate-500"><ShieldCheck className="h-5 w-5 text-emerald-600"/>Subscriber addresses stay private.</p></section></div></div>;

  if(isCommunityPage)return <div className="page-shell"><div className="page-container flex min-h-[70vh] items-center justify-center">{message&&<div role="status" className={`fixed top-24 z-20 rounded-xl border p-4 text-sm font-bold ${message.ok?'border-emerald-200 bg-emerald-50 text-emerald-800':'border-red-200 bg-red-50 text-red-800'}`}>{message.text}</div>}<CommunitySubmission user={user} post={post} setPost={setPost} submit={submit} busy={busy} previewing={submissionPreview} setPreviewing={setSubmissionPreview} submissions={mySubmissions} onEdit={editSubmission}/></div></div>;

  if(issueDate)return <div className="page-shell"><div className="page-container space-y-6"><button type="button" onClick={closeIssueTab} className="inline-flex items-center gap-2 font-bold text-brand-700"><X className="h-4 w-4"/>Close newsletter</button>{loading?<p className="surface p-8">Loading…</p>:selectedIssue?<IssueCard issue={selectedIssue}/>:<p className="surface p-8 text-slate-600">This newsletter issue is unavailable.</p>}</div></div>;

  if(month)return <div className="page-shell"><div className="page-container space-y-7"><section className="public-hero p-7 sm:p-10"><p className="text-xs font-black uppercase tracking-widest text-brand-700">Weekly archive</p><h1 className="mt-2 text-4xl font-black">{monthLabel(month)}</h1><p className="mt-3 text-slate-600">Select an issue below. Each newsletter opens in a new browser tab so this monthly list remains available.</p></section>{loading?<p className="surface p-8">Loading…</p>:!monthGroups[month]?.length?<p className="surface p-8 text-slate-600">No published newsletters are available for this month.</p>:<div className="surface divide-y divide-slate-200 px-6">{monthGroups[month].map(issue=><Link key={issue.id} to={`/newsletter/issues/${issue.issue_date}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-4 py-5 font-bold text-slate-800 hover:text-brand-700"><span><span className="block text-xs uppercase tracking-wider text-brand-600">{displayDate(issue.issue_date)}</span><span className="mt-1 block text-lg">{issue.title}</span></span><ExternalLink className="h-5 w-5 shrink-0"/></Link>)}</div>}</div></div>;

  if(routeLocation.pathname==='/newsletter')return loading?<div className="page-shell"><div className="page-container"><p className="surface p-8">Loading the latest newsletter…</p></div></div>:monthKeys.length?<Navigate to={`/newsletter/archive/${monthKeys[0]}`} replace/>:<div className="page-shell"><div className="page-container"><p className="surface p-8 text-slate-600">The first issue will appear after its scheduled publication.</p></div></div>;

  return null;
}

function CommunitySubmission({user,post,setPost,submit,busy,previewing,setPreviewing,submissions,onEdit}:{user:any;post:any;setPost:(value:any)=>void;submit:(event:FormEvent)=>Promise<void>;busy:boolean;previewing:boolean;setPreviewing:(value:boolean)=>void;submissions:CommunitySubmissionRecord[];onEdit:(item:CommunitySubmissionRecord)=>void}) {
  const linkRequired = post.contributionType === 'news' || post.contributionType === 'advertisement';
  const typeLabels: Record<string, string> = {
    story: 'Personal story', news: 'News', information: 'Information', tip: 'Tip', testimonial: 'Testimonial', advertisement: 'Advertisement',
  };

  return <section className="surface w-full max-w-4xl p-7 sm:p-10">
    <h1 className="text-3xl font-black sm:text-4xl">Share with the community</h1>
    <p className="mt-3 text-sm leading-7 text-slate-600">Signed-in parents may submit autism-related stories, news, information, tips, testimonials, or mission-aligned advertisements. Everything is reviewed before publication. Content must be non-medical and non-clinical, and must never include identifying information about an autistic person.</p>
    {user ? <><form onSubmit={submit} className="mt-6 grid gap-4 md:grid-cols-2">
      {post.submissionId&&<div className="md:col-span-2 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"><b>Revising an earlier submission.</b> After you preview and resubmit it, its status returns to pending review. Newsletters already published are preserved as they appeared at publication.</div>}
      <Select label="Type" value={post.contributionType} onChange={e=>setPost({...post, contributionType:e.target.value, sourceUrl:''})}>
        {Object.entries(typeLabels).map(([value, label])=><option key={value} value={value}>{label}</option>)}
      </Select>
      <Input label="Public display name or advertiser" value={post.displayName} onChange={e=>setPost({...post,displayName:e.target.value})} placeholder="First name, initials, organization, or Visual Steps parent" minLength={2} maxLength={80} required/>
      <Input label="Title" value={post.title} onChange={e=>setPost({...post,title:e.target.value})} minLength={3} maxLength={120} required className="md:col-span-2"/>
      {linkRequired && <Input
        label={post.contributionType === 'news' ? 'Source link' : 'Advertisement destination link'}
        type="url"
        value={post.sourceUrl}
        onChange={e=>setPost({...post,sourceUrl:e.target.value})}
        placeholder="https://example.com"
        required
        className="md:col-span-2"
      />}
      {!linkRequired && <p className="md:col-span-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">No website link is needed for this type of submission.</p>}
      <Textarea label="Your contribution (20–10,000 characters)" rows={10} value={post.content} onChange={e=>setPost({...post,content:e.target.value})} minLength={20} maxLength={10000} required className="md:col-span-2"/>
      <p className="md:col-span-2 -mt-2 text-xs text-slate-500">Paragraph breaks, line breaks, headings written on their own lines, and bullet symbols will be preserved when published.</p>
      <label className="flex gap-3 text-sm md:col-span-2"><input type="checkbox" checked={post.consentToPublish} onChange={e=>setPost({...post,consentToPublish:e.target.checked})} required/><span>I created or may share this content and permit Visual Steps to review, edit for clarity, and publish it.</span></label>
      {previewing&&<div className="md:col-span-2 rounded-2xl border border-amber-200 bg-amber-50 p-5"><p className="text-xs font-black uppercase tracking-wider text-amber-800">Submission preview</p><article className="mt-4 rounded-xl bg-white p-5 shadow-sm"><h2 className="text-2xl font-black text-slate-950">{post.title}</h2><p className="mt-2 font-bold text-slate-700">By {post.displayName}</p><p className="mt-1 text-xs font-bold uppercase tracking-wide text-amber-800">{typeLabels[post.contributionType]}</p><FormattedNewsletterContent content={post.content}/></article><p className="mt-3 text-xs text-slate-600">Review the title, spacing, bullets, and author name. You can return to the form before sending it for administrator review.</p></div>}
      <div className="flex flex-wrap gap-3 md:col-span-2">{previewing&&<Button type="button" variant="outline" onClick={()=>setPreviewing(false)} disabled={busy}>Edit submission</Button>}<Button disabled={busy}><Send className="mr-2 h-4 w-4"/>{previewing?(post.submissionId?'Resubmit for review':'Submit for review'):'Preview submission'}</Button></div>
    </form><div className="mt-10 border-t border-slate-200 pt-7"><h2 className="text-2xl font-black">My submissions</h2><p className="mt-2 text-sm leading-6 text-slate-600">Open any earlier contribution to correct the wording or formatting. A revised contribution returns to review, while previously published newsletter issues stay unchanged.</p><div className="mt-5 grid gap-3">{submissions.length?submissions.map(item=><article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-black text-slate-900">{item.title}</h3><p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">{typeLabels[item.contribution_type]} · {item.status}</p></div><Button type="button" variant="outline" onClick={()=>onEdit(item)}>Edit and resubmit</Button></div><p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{item.content}</p></article>):<p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">You have not submitted anything yet.</p>}</div></div></> : <p className="mt-6 rounded-xl bg-brand-50 p-4 text-sm">Sign in as a parent to submit content. Reading remains public. Organizations may also <Link to="/contact" className="font-bold underline">contact Visual Steps</Link> about a mission-aligned advertisement.</p>}
  </section>;
}

export function IssueCard({issue}:{issue:Issue}){
  const title=(key:string,fallback:string)=>issue.section_titles?.[key]||fallback;
  const visible=(key:string)=>issue.section_visibility?.[key]!==false;
  return <NewsletterFlipBook issueTitle={issue.title}><header className="newsletter-page"><p className="text-sm font-black uppercase tracking-wider text-brand-700">{displayDate(issue.issue_date)}</p><h3 className="mt-3 text-4xl font-black sm:text-5xl">{issue.title}</h3><p className="mt-5 text-base leading-8 text-slate-600">{issue.introduction}</p><NewsletterLinks links={issue.footer_links}/></header><div className="grid gap-7">
    {visible('feature_previews')&&<Section oneItemPerPage fullWidth tone="violet" title={title('feature_previews','Feature Previews')} items={(issue.feature_previews||[]).map((x:any)=>{
      const featureId=featureIdFor(x);
      return <><img src={x.imageUrl} alt={`${x.title} feature preview`} className="mb-3 h-52 w-full rounded-xl object-contain object-top sm:h-64"/><b>{x.title}</b> — {x.caption}{x.familyImpact&&<span className="mt-2 block"><b>Why it matters:</b> {x.familyImpact}</span>}{featureId&&<Link to={`/features/${featureId}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex font-bold text-brand-800 underline underline-offset-4">Read more</Link>}</>;
    })}/>} {visible('new_features')&&<Section fullWidth itemColumns={2} tone="blue" title={title('new_features','New and Updated Feature Details')} items={(issue.new_features||[]).map((x:any)=>{
      const featureId=featureIdFor(x);
      return <><span className="mb-2 inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-black uppercase tracking-wider text-blue-800">{x.changeType==='updated'?'Feature update':'New feature'}</span><b className="block text-slate-900">{x.title}</b><span className="mt-1 block">{x.summary}</span><span className="mt-2 block">{x.details}</span>{x.familyImpact&&<span className="mt-2 block"><b>How this supports growth:</b> {x.familyImpact}</span>}<small className="mt-2 block font-semibold text-brand-800">Where to find it: {x.help}</small>{featureId&&<Link to={`/features/${featureId}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex font-bold text-brand-800 underline underline-offset-4">Read more</Link>}</>;
    })}/>} {/* Feature preview page ends here. */}
    {visible('community_posts')&&communitySectionTypes.map(section=>{
      const posts=(issue.community_posts||[]).filter((post:any)=>String(post.type||'').toLowerCase()===section.key);
      if(!posts.length)return null;
      const items=posts.map((post:any)=><article key={post.title}><h5 className="text-xl font-black leading-tight text-slate-950 sm:text-2xl">{post.title}</h5><p className="mt-2 text-sm font-bold text-slate-700">By {post.displayName}</p><FormattedNewsletterContent content={post.content}/>{post.sourceUrl&&<a href={post.sourceUrl} target="_blank" rel="noreferrer" className="mt-4 inline-block font-bold underline">Source</a>}{post.editorialContext&&<small className="mt-3 block italic">{post.editorialContext}</small>}</article>);
      return <Section key={section.key} oneItemPerPage tone={section.tone} title={title(`community_${section.key}`,section.title)} items={items}/>;
    })}
    {visible('parent_testimonials')&&<Section tone="rose" title={title('parent_testimonials','Parent Testimonials')} items={(issue.parent_testimonials||[]).map((x:any)=><>“{x.quote}” — <b>{x.displayName}</b>{x.editorialContext&&<small className="mt-2 block italic">{x.editorialContext}</small>}</>)}/>} {/* Testimonial page ends here. */}
    {visible('popular_features') && (
      <Section tone="emerald" title={title('popular_features','Most Popular Features')} items={(issue.popular_features||[]).map((x:any)=><><b>{x.title}</b> — {x.explanation}</>)}/>
    )}
    {visible('recommended_resources')&&<Section tone="cyan" title={title('recommended_resources','Suggested Activities, Games and Websites')} items={(issue.recommended_resources||[]).map((x:any)=><><b>{x.title}</b> ({x.type}) — {x.description}{x.url&&<a href={x.url} target="_blank" rel="noreferrer" className="ml-1 underline">Visit</a>}</>)}/>}
    {visible('suggested_books_resources')&&<Section fullWidth itemColumns={2} tone="amber" title={title('suggested_books_resources','Suggested Books and Resources')} items={(issue.suggested_books_resources||[]).map((x:any)=><><b>{x.title}</b> ({x.type}){x.creator&&<> by {x.creator}</>} — {x.description}{x.url&&<a href={x.url} target="_blank" rel="noreferrer" className="ml-1 underline">Visit resource</a>}</>)}/>}
    {visible('advertisements')&&<Section fullWidth itemColumns={2} tone="orange" title={title('advertisements','Mission-Aligned Advertisements')} items={(issue.advertisements||[]).map((x:any)=><><span className="text-xs font-black uppercase tracking-wider text-amber-800">Advertisement</span><span className="mt-1 block"><b>{x.title}</b> — {x.description}</span><span className="mt-2 block text-xs">From {x.advertiser}. {x.disclosure}</span>{x.destinationUrl&&<a href={x.destinationUrl} target="_blank" rel="sponsored noreferrer" className="mt-2 inline-block font-bold underline">Visit advertiser</a>}</>)}/>}
    {visible('parent_tips')&&<Section bulleted tone="lime" title={title('parent_tips','Tips and Tricks for Parents')} items={issue.parent_tips||[]}/>}
    {visible('membership_details')&&<Section tone="indigo" title={title('membership_details','Current Visual Steps Membership Details')} items={(issue.membership_details||[]).map((x:any)=><><b>{x.name}: {x.price}</b> — {x.status}. {x.details}</>)}/>}
  </div></NewsletterFlipBook>;
}
function NewsletterFlipBook({issueTitle,children}:{issueTitle:string;children:ReactNode}){
  const content:ReactNode[]=[];
  for(const child of Children.toArray(children)){if(isValidElement<{className?:string;children?:ReactNode}>(child)&&child.props.className==='grid gap-7')content.push(...Children.toArray(child.props.children));else content.push(child);}
  const [page,setPage]=useState(0);
  const [pageCount,setPageCount]=useState(1);
  const [direction,setDirection]=useState<'forward'|'back'>('forward');
  const [singlePage,setSinglePage]=useState(false);
  const pointerStart=useRef<number|null>(null);
  useEffect(()=>{setPage(0);setPageCount(1);},[issueTitle]);
  useEffect(()=>{const query=window.matchMedia('(max-width: 760px)');const update=()=>{setSinglePage(query.matches);setPage(0);};update();query.addEventListener('change',update);return()=>query.removeEventListener('change',update);},[]);
  const step=singlePage?1:2;
  const turn=(next:number)=>{const bounded=Math.max(0,Math.min(next,pageCount-1));const normalized=singlePage?bounded:bounded-bounded%2;if(normalized===page)return;setDirection(normalized>page?'forward':'back');setPage(normalized);};
  const rightPage=!singlePage&&page+1<pageCount;
  const lastSingle=!singlePage&&!rightPage;
  const finishSwipe=(clientX:number)=>{if(pointerStart.current===null)return;const distance=clientX-pointerStart.current;pointerStart.current=null;if(Math.abs(distance)<45)return;turn(page+(distance<0?step:-step));};
  return <section className="newsletter-copy newsletter-book mx-auto max-w-7xl" aria-label={`${issueTitle} flipbook`} tabIndex={0} onKeyDown={event=>{if(event.key==='ArrowRight'){event.preventDefault();turn(page+step);}if(event.key==='ArrowLeft'){event.preventDefault();turn(page-step);}}}>
    <div key={`${page}-${singlePage}`} className={`newsletter-book-stage newsletter-spread-${direction} ${singlePage?'is-single-page':''} ${lastSingle?'is-last-single':''}`} onPointerDown={event=>{pointerStart.current=event.clientX;}} onPointerUp={event=>finishSwipe(event.clientX)} onPointerCancel={()=>{pointerStart.current=null;}}>
      <div className="newsletter-book-page newsletter-book-page-left"><NewsletterBookLeaf content={content} pageIndex={page} onPageCount={setPageCount}/>{page>0&&<button type="button" className="newsletter-page-turn-zone newsletter-page-turn-zone-left" onClick={()=>turn(page-step)} aria-label="Turn to previous pages"/>}</div>
      {rightPage&&<div className="newsletter-book-page newsletter-book-page-right"><NewsletterBookLeaf content={content} pageIndex={page+1}/><button type="button" className="newsletter-page-turn-zone newsletter-page-turn-zone-right" onClick={()=>turn(page+step)} disabled={page+step>=pageCount} aria-label="Turn to next pages"/></div>}
      <div className="newsletter-turning-sheet" aria-hidden="true"/>
    </div><div className="newsletter-book-print">{content}</div>
    <div className="newsletter-book-status" aria-live="polite"><BookOpen className="h-5 w-5 text-brand-600"/><span>{singlePage?`Page ${page+1}`:`Pages ${page+1}${rightPage?`–${page+2}`:''}`} of {pageCount}</span></div>
    <p className="mt-2 text-center text-xs text-slate-500">Click a page edge, swipe, or use the left and right arrow keys to turn the pages.</p>
  </section>;
}
function NewsletterBookLeaf({content,pageIndex,onPageCount}:{content:ReactNode;pageIndex:number;onPageCount?:(count:number)=>void}){
  const leafRef=useRef<HTMLDivElement>(null);
  useLayoutEffect(()=>{
    let frame=0;
    const measure=()=>{const leaf=leafRef.current;const flow=leaf?.querySelector<HTMLElement>('.newsletter-flow-content');if(!leaf||!flow)return;flow.style.columnWidth=`${flow.clientWidth}px`;cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{if(!onPageCount)return;const stride=leaf.clientWidth;onPageCount(Math.max(1,Math.ceil(flow.scrollWidth/stride)));});};
    measure();const observer=new ResizeObserver(measure);if(leafRef.current)observer.observe(leafRef.current);const images=leafRef.current?.querySelectorAll('img')||[];images.forEach(image=>image.addEventListener('load',measure));window.addEventListener('resize',measure);return()=>{cancelAnimationFrame(frame);observer.disconnect();images.forEach(image=>image.removeEventListener('load',measure));window.removeEventListener('resize',measure);};
  },[content,onPageCount]);
  return <div ref={leafRef} className="newsletter-book-leaf"><div className="newsletter-flow-viewport"><div className="newsletter-flow-content" style={{'--newsletter-page-index':pageIndex} as CSSProperties}>{content}</div></div></div>;
}
function NewsletterLinks({links}:{links?:Record<string,string>}){const items=[['Visual Steps Home',links?.mainPage||'/'],['Subscribe Newsletter','/newsletter/subscribe'],['Facebook',links?.facebook],['Instagram',links?.instagram]].filter((item):item is [string,string]=>Boolean(item[1]));return <nav aria-label="Newsletter links" className="mt-7 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-200 pt-5 text-sm font-bold text-brand-800">{items.map(([label,url])=><a key={label} href={url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{label}</a>)}</nav>}
type SectionProps={title:string;items:ReactNode[];tone:'blue'|'violet'|'amber'|'orange'|'rose'|'emerald'|'cyan'|'indigo'|'lime';fullWidth?:boolean;itemColumns?:1|2;bulleted?:boolean;oneItemPerPage?:boolean};
function Section({title,items,tone,bulleted=false}:SectionProps){if(!items.length)return null;const colors={blue:'border-blue-200 bg-blue-50/80',violet:'border-violet-200 bg-violet-50/80',amber:'border-amber-200 bg-amber-50/80',orange:'border-orange-200 bg-orange-50/80',rose:'border-rose-200 bg-rose-50/80',emerald:'border-emerald-200 bg-emerald-50/80',cyan:'border-cyan-200 bg-cyan-50/80',indigo:'border-indigo-200 bg-indigo-50/80',lime:'border-lime-200 bg-lime-50/80'};return <section className={`newsletter-page border ${colors[tone]}`}><h4 className="text-2xl font-black leading-tight text-slate-950 sm:text-3xl">{title}</h4><ul className={`mt-5 grid gap-5 text-base leading-7 text-slate-700 ${bulleted?'list-outside list-disc pl-5 marker:text-lime-700':''}`}>{items.map((item,index)=><li key={index} className="newsletter-section-item border-b border-slate-200/70 pb-5 last:border-0 last:pb-0">{item}</li>)}</ul></section>}
