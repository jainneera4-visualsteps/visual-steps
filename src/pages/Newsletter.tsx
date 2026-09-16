import { CSSProperties, Children, FormEvent, ReactNode, isValidElement, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Bold, BookOpen, ExternalLink, Heading2, Italic, Link as LinkIcon, List, ListOrdered, Mail, MessageSquarePlus, Newspaper, Pencil, Quote, Send, ShieldCheck, Trash2, UsersRound, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button } from '../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { GridColumnHeader } from '../components/GridColumnHeader';
import { Input } from '../components/Input';
import { Pagination } from '../components/Pagination';
import { Select } from '../components/Select';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import { productFeatures } from '../content/featureRegistry';

type Issue = Record<string, any> & { id:string; issue_date:string; title:string; introduction:string; parent_tips:string[] };
type CommunitySubmissionRecord = {
  id:string; contribution_type:string; title:string; content:string; display_name:string;
  source_url:string|null; status:'draft'|'pending'|'approved'|'rejected'; submitted_at:string; reviewed_at:string|null;
};
const displayDate=(value:string)=>new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(`${value}T12:00:00Z`)).replace(/^(\d{2}) ([A-Za-z]{3}) /,(_match,day,month)=>`${Number.parseInt(day,10)} ${month}, `);
const featureIdFor=(item:any)=>item.id||productFeatures.find(feature=>feature.title===item.title)?.id;
const featureGuideUrl=(item:any, featureId:string)=>`/features/${featureId}${item.changeType==='updated'&&item.changedOn?`?update=${encodeURIComponent(item.changedOn)}&article=${encodeURIComponent(item.title||'')}`:''}`;
const communitySectionTypes=[
  {key:'story',title:'Parent Stories',tone:'amber' as const},
  {key:'news',title:'Community News',tone:'blue' as const},
  {key:'information',title:'Helpful Information',tone:'cyan' as const},
  {key:'tip',title:'Community Tips and Tricks',tone:'lime' as const},
  {key:'testimonial',title:'Community Testimonials',tone:'rose' as const},
  {key:'advertisement',title:'Community Advertisements',tone:'orange' as const},
];
const newsletterHighlights=(issue:Issue)=>{
  const candidates=[
    ...(issue.new_features||[]).map((item:any)=>item.title),
    ...(issue.how_to_series||[]).map((item:any)=>item.title),
    ...(issue.parent_tips||[]).map((item:any)=>typeof item==='string'?item:item?.title),
    ...(issue.recommended_resources||[]).map((item:any)=>item.title),
    ...(issue.suggested_books_resources||[]).map((item:any)=>item.title),
    ...(issue.community_posts||[]).map((item:any)=>item.title),
  ].map(value=>String(value||'').trim()).filter(Boolean);
  return [...new Set(candidates)].slice(0,3);
};
export function FormattedNewsletterContent({content}:{content:string}){
  return <div className="newsletter-article-content mt-5 text-left text-base leading-7"><ReactMarkdown skipHtml allowedElements={['p','h1','h2','h3','strong','em','ul','ol','li','blockquote','a','br']} components={{a:({href,children})=><a href={href} target="_blank" rel="noopener noreferrer">{children}</a>}}>{content}</ReactMarkdown></div>;
}

const escapeEditorHtml=(text:string)=>text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const inlineMarkdownToHtml=(text:string)=>escapeEditorHtml(text).replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,'<a href="$2">$1</a>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\*([^*]+)\*/g,'<em>$1</em>');
function markdownToEditorHtml(value:string){
  const lines=String(value||'').split(/\r?\n/);const html:string[]=[];let list:''|'ul'|'ol'='';
  const closeList=()=>{if(list){html.push(`</${list}>`);list='';}};
  for(const line of lines){const heading=line.match(/^(#{1,3})\s+(.+)/);const bullet=line.match(/^[-*]\s+(.+)/);const numbered=line.match(/^\d+\.\s+(.+)/);const quote=line.match(/^>\s?(.+)/);if(heading){closeList();html.push(`<h${heading[1].length}>${inlineMarkdownToHtml(heading[2])}</h${heading[1].length}>`);}else if(bullet||numbered){const next=bullet?'ul':'ol';if(list!==next){closeList();list=next;html.push(`<${next}>`);}html.push(`<li>${inlineMarkdownToHtml((bullet||numbered)![1])}</li>`);}else if(quote){closeList();html.push(`<blockquote>${inlineMarkdownToHtml(quote[1])}</blockquote>`);}else if(!line.trim()){closeList();}else{closeList();html.push(`<p>${inlineMarkdownToHtml(line)}</p>`);}}closeList();return html.join('');
}
function editorHtmlToMarkdown(editor:HTMLElement){
  const renderInline=(node:Node):string=>{if(node.nodeType===Node.TEXT_NODE)return node.textContent||'';if(!(node instanceof HTMLElement))return '';const content=Array.from(node.childNodes).map(renderInline).join('');if(node.tagName==='STRONG'||node.tagName==='B')return `**${content}**`;if(node.tagName==='EM'||node.tagName==='I')return `*${content}*`;if(node.tagName==='A'){const href=node.getAttribute('href')||'';return /^https?:\/\//i.test(href)?`[${content}](${href})`:content;}if(node.tagName==='BR')return '\n';return content;};
  const blockTags=new Set(['DIV','P','H1','H2','H3','BLOCKQUOTE','UL','OL']);
  const renderBlock=(node:Node):string=>{if(!(node instanceof HTMLElement))return renderInline(node).trim();if(/^H[1-3]$/.test(node.tagName))return `${'#'.repeat(Number(node.tagName[1]))} ${renderInline(node).trim()}`;if(node.tagName==='BLOCKQUOTE')return renderInline(node).trim().split('\n').filter(Boolean).map(line=>`> ${line}`).join('\n');if(node.tagName==='UL'||node.tagName==='OL')return Array.from(node.children).filter(item=>item.tagName==='LI').map((item,itemIndex)=>`${node.tagName==='UL'?'-':`${itemIndex+1}.`} ${renderInline(item).trim()}`).join('\n');const nestedBlocks=Array.from(node.childNodes).filter(child=>child instanceof HTMLElement&&blockTags.has(child.tagName));if(nestedBlocks.length)return nestedBlocks.map(renderBlock).filter(Boolean).join('\n\n');return renderInline(node).trim();};
  return Array.from(editor.childNodes).map(renderBlock).filter(Boolean).join('\n\n').replace(/\n{3,}/g,'\n\n').trim();
}
export function CommunityRichTextEditor({value,onChange,maxLength}:{value:string;onChange:(value:string)=>void;maxLength:number}){
  const editorRef=useRef<HTMLDivElement>(null);const emittedValue=useRef('');
  useEffect(()=>{if(!editorRef.current||value===emittedValue.current)return;editorRef.current.innerHTML=markdownToEditorHtml(value);},[value]);
  const emit=()=>{const editor=editorRef.current;if(!editor)return;const raw=editorHtmlToMarkdown(editor);const next=raw.slice(0,maxLength);if(raw.length>maxLength)editor.innerHTML=markdownToEditorHtml(next);emittedValue.current=next;onChange(next);};
  const command=(name:string,argument?:string)=>{editorRef.current?.focus();document.execCommand(name,false,argument);emit();};
  const addLink=()=>{const selection=window.getSelection();const savedRange=selection?.rangeCount?selection.getRangeAt(0).cloneRange():null;const url=window.prompt('Enter a safe website link beginning with https://');if(!url)return;try{const parsed=new URL(url);if(!['http:','https:'].includes(parsed.protocol))throw new Error();}catch{window.alert('Enter a valid http:// or https:// link.');return;}editorRef.current?.focus();if(savedRange&&selection){selection.removeAllRanges();selection.addRange(savedRange);}if(!selection?.toString())document.execCommand('insertText',false,'link text');document.execCommand('createLink',false,url);emit();};
  const tools=[{label:'Bold',icon:Bold,run:()=>command('bold')},{label:'Italic',icon:Italic,run:()=>command('italic')},{label:'Heading',icon:Heading2,run:()=>command('formatBlock','h2')},{label:'Bulleted list',icon:List,run:()=>command('insertUnorderedList')},{label:'Numbered list',icon:ListOrdered,run:()=>command('insertOrderedList')},{label:'Quote',icon:Quote,run:()=>command('formatBlock','blockquote')},{label:'Link',icon:LinkIcon,run:addLink}];
  return <div className="md:col-span-2"><label id="community-editor-label" className="app-label">Your contribution (20–{maxLength.toLocaleString()} characters)</label><div className="mt-2 overflow-hidden rounded-xl border border-slate-300 bg-white focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/10"><div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 p-2" role="toolbar" aria-label="Format contribution">{tools.map(tool=><button key={tool.label} type="button" title={tool.label} aria-label={tool.label} onMouseDown={event=>event.preventDefault()} onClick={tool.run} className="rounded-lg p-2 text-slate-600 hover:bg-white hover:text-brand-700"><tool.icon className="h-4 w-4"/></button>)}</div><div ref={editorRef} contentEditable role="textbox" aria-labelledby="community-editor-label" aria-multiline="true" className="newsletter-rich-editor h-72 w-full overflow-y-auto overscroll-contain p-4 leading-7 outline-none" onInput={emit} onPaste={event=>{event.preventDefault();document.execCommand('insertText',false,event.clipboardData.getData('text/plain'));emit();}}/></div><div className="mt-2 flex justify-between gap-4 text-xs text-slate-500"><span>Scroll inside the writing area to review and format longer content.</span><span>{value.length.toLocaleString()} / {maxLength.toLocaleString()}</span></div></div>;
}

export default function Newsletter(){
  const {month,issueDate}=useParams<{month?:string;issueDate?:string}>();
  const routeLocation=useLocation();
  const navigate=useNavigate();
  const {user}=useAuth();
  const [email,setEmail]=useState(''); const [issues,setIssues]=useState<Issue[]>([]); const [loading,setLoading]=useState(true); const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState<{ok:boolean;text:string}|null>(null);
  const [post,setPost]=useState({submissionId:'',contributionType:'story',title:'',content:'',displayName:'',sourceUrl:'',consentToPublish:false});
  const [submissionPreview,setSubmissionPreview]=useState(false);
  const [submissionFormOpen,setSubmissionFormOpen]=useState(false);
  const [unsubscribed,setUnsubscribed]=useState(false);
  const [archiveModalIssue,setArchiveModalIssue]=useState<Issue|null>(null);
  const [mySubmissions,setMySubmissions]=useState<CommunitySubmissionRecord[]>([]);
  const loadMySubmissions=async()=>{if(!user)return;try{const response=await apiFetch('/api/newsletter/community-submissions/mine',{},0);const data=await response.json();if(!response.ok)throw new Error(data.error);setMySubmissions(Array.isArray(data)?data:[]);}catch(error){setMessage({ok:false,text:error instanceof Error?error.message:'Your submissions could not be loaded.'});}};
  useEffect(()=>{
    const query=new URLSearchParams(routeLocation.search);
    if(query.get('confirmation')) setMessage({ok:query.get('confirmation')==='success',text:query.get('confirmation')==='success'?'Subscription confirmed. The next weekly issue will arrive on its scheduled delivery day.':'That confirmation link is invalid or already used.'});
    if(query.get('unsubscribe')) setMessage({ok:query.get('unsubscribe')==='success',text:query.get('unsubscribe')==='success'?'You have been unsubscribed.':'That unsubscribe link is invalid.'});
    fetch('/api/newsletters').then(response=>response.ok?response.json():Promise.reject()).then(data=>setIssues(Array.isArray(data)?data:[])).catch(()=>setMessage({ok:false,text:'The newsletter archive is temporarily unavailable.'})).finally(()=>setLoading(false));
  },[routeLocation.search]);
  useEffect(()=>{if(routeLocation.pathname==='/newsletter/community'&&user)void loadMySubmissions();},[routeLocation.pathname,user]);
  useEffect(()=>{if(routeLocation.pathname==='/newsletter/subscribe'&&user?.email)setEmail(current=>current||user.email);},[routeLocation.pathname,user]);
  useEffect(()=>{if(routeLocation.pathname!=='/newsletter/community')return;const requestedType=new URLSearchParams(routeLocation.search).get('type');if(requestedType&&['story','news','information','tip','testimonial','advertisement'].includes(requestedType))setPost(current=>({...current,contributionType:requestedType}));},[routeLocation.pathname,routeLocation.search]);
  const subscribe=async(event:FormEvent)=>{event.preventDefault();setBusy(true);try{const response=await fetch('/api/newsletter/subscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});const data=await response.json();if(!response.ok)throw new Error(data.error);setMessage({ok:true,text:data.message});setEmail('');}catch(error){setMessage({ok:false,text:error instanceof Error?error.message:'Subscription failed.'});}finally{setBusy(false);}};
  const unsubscribe=async()=>{setBusy(true);setMessage(null);try{const response=await apiFetch('/api/newsletter/subscription',{method:'DELETE'},0);const data=await response.json();if(!response.ok)throw new Error(data.error);setUnsubscribed(true);setMessage({ok:true,text:data.message});window.dispatchEvent(new Event('visual-steps:newsletter-subscription-changed'));}catch(error){setMessage({ok:false,text:error instanceof Error?error.message:'Unsubscribe failed.'});}finally{setBusy(false);}};
  const submit=async(event:FormEvent)=>{event.preventDefault();if(!submissionPreview){setSubmissionPreview(true);return;}setBusy(true);try{const response=await apiFetch('/api/newsletter/community-submissions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(post)},0);const data=await response.json();if(!response.ok)throw new Error(data.error);setMessage({ok:true,text:data.message});setPost({...post,submissionId:'',title:'',content:'',sourceUrl:'',consentToPublish:false});setSubmissionPreview(false);setSubmissionFormOpen(false);await loadMySubmissions();}catch(error){setMessage({ok:false,text:error instanceof Error?error.message:'Submission failed.'});}finally{setBusy(false);}};
  const saveCommunityDraft=async()=>{setBusy(true);try{const response=await apiFetch('/api/newsletter/community-submissions/draft',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(post)},0);const data=await response.json();if(!response.ok)throw new Error(data.error);setPost(current=>({...current,submissionId:data.id,consentToPublish:false}));setSubmissionPreview(false);setSubmissionFormOpen(false);setMessage({ok:true,text:data.message});await loadMySubmissions();}catch(error){setMessage({ok:false,text:error instanceof Error?error.message:'The draft could not be saved.'});}finally{setBusy(false);}};
  const editSubmission=(item:CommunitySubmissionRecord)=>{setPost({submissionId:item.id,contributionType:item.contribution_type,title:item.title,content:item.content,displayName:item.display_name,sourceUrl:item.source_url||'',consentToPublish:true});setSubmissionPreview(false);setSubmissionFormOpen(true);setMessage(null);window.scrollTo({top:0,behavior:'smooth'});};
  const openCommunityForm=()=>{setPost(current=>({...current,submissionId:'',title:'',content:'',sourceUrl:'',consentToPublish:false}));setSubmissionPreview(false);setSubmissionFormOpen(true);setMessage(null);};
  const deleteMySubmission=async(item:CommunitySubmissionRecord)=>{if(!window.confirm(`Delete “${item.title}”? This removes it from future review but does not change a newsletter that was already published.`))return;setBusy(true);try{const response=await apiFetch(`/api/newsletter/community-submissions/${item.id}`,{method:'DELETE'},0);const data=await response.json();if(!response.ok)throw new Error(data.error);if(post.submissionId===item.id)setPost({...post,submissionId:'',title:'',content:'',sourceUrl:'',consentToPublish:false});setMessage({ok:true,text:data.message});setSubmissionPreview(false);await loadMySubmissions();}catch(error){setMessage({ok:false,text:error instanceof Error?error.message:'The submission could not be deleted.'});}finally{setBusy(false);}};
  const monthGroups=issues.reduce<Record<string,Issue[]>>((groups,issue)=>{const key=issue.issue_date.slice(0,7);(groups[key]||=[]).push(issue);return groups;},{});
  const monthKeys=Object.keys(monthGroups).sort((a,b)=>b.localeCompare(a));
  const monthLabel=(value:string)=>new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${value}-01T12:00:00Z`));
  const selectedIssue=issueDate?issues.find(issue=>issue.issue_date===issueDate):undefined;
  const isSubscribePage=routeLocation.pathname==='/newsletter/subscribe';
  const isUnsubscribePage=routeLocation.pathname==='/newsletter/unsubscribe';
  const isCommunityPage=routeLocation.pathname==='/newsletter/community';
  const closeIssueTab=()=>{
    if(!issueDate)return;
    const monthUrl=`/newsletter/archive/${issueDate.slice(0,7)}`;
    window.close();
    window.setTimeout(()=>{if(!window.closed)window.location.assign(monthUrl);},100);
  };

  if(isSubscribePage)return <div className="w-full space-y-4 px-0"><div className="flex items-center gap-3"><Link to="/newsletter" className="inline-flex h-7 items-center pl-0 text-[12px] font-bold uppercase text-slate-600 hover:text-blue-600"><ArrowLeft className="mr-1 h-3 w-3"/>Back to List</Link><h1 className="text-xl font-bold leading-none tracking-tight text-slate-900">Subscribe Newsletter</h1></div><form id="newsletter-subscribe-form" onSubmit={subscribe}><Card className="overflow-hidden border-blue-200 bg-blue-50/50 shadow-sm"><CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-blue-100 bg-white/50 px-4 py-2"><CardTitle className="text-base font-bold">Subscription Details</CardTitle><div className="flex items-center gap-2"><Link to="/newsletter" className="inline-flex h-8 items-center rounded-lg px-3 text-[12px] font-bold text-slate-600 hover:bg-slate-100">Cancel</Link><Button type="submit" size="xs" disabled={busy} className="h-8 px-3 text-[12px] font-bold"><Mail className="mr-1.5 h-3.5 w-3.5"/>{busy?'Subscribing…':'Subscribe'}</Button></div></CardHeader><CardContent className="space-y-4 px-4 pb-4 pt-4">{message&&<div role="status" className={`rounded-lg border px-4 py-3 text-sm font-bold ${message.ok?'border-emerald-200 bg-emerald-50 text-emerald-800':'border-red-200 bg-red-50 text-red-800'}`}>{message.text}</div>}<div className="rounded-lg border border-slate-200 bg-white p-4"><div className="max-w-xl"><Input label="Email address" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></div><p className="mt-3 flex items-center gap-2 text-sm text-slate-500"><ShieldCheck className="h-5 w-5 text-emerald-600"/>Your email address stays private. Confirm once by email; every issue includes one-click unsubscribe.</p></div></CardContent></Card></form></div>;

  if(isUnsubscribePage)return <div className="w-full space-y-4 px-0"><div className="flex items-center gap-3"><Link to="/newsletter" className="inline-flex h-7 items-center pl-0 text-[12px] font-bold uppercase text-slate-600 hover:text-blue-600"><ArrowLeft className="mr-1 h-3 w-3"/>Back to List</Link><h1 className="text-xl font-bold leading-none tracking-tight text-slate-900">Unsubscribe Newsletter</h1></div><Card className="overflow-hidden border-blue-200 bg-blue-50/50 shadow-sm"><CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-blue-100 bg-white/50 px-4 py-2"><CardTitle className="text-base font-bold">Subscription Details</CardTitle><div className="flex items-center gap-2"><Link to="/newsletter" className="inline-flex h-8 items-center rounded-lg px-3 text-[12px] font-bold text-slate-600 hover:bg-slate-100">Cancel</Link>{!unsubscribed&&<Button type="button" variant="danger" size="xs" disabled={busy||!user} onClick={()=>void unsubscribe()} className="h-8 px-3 text-[12px] font-bold">{busy?'Unsubscribing…':'Unsubscribe'}</Button>}</div></CardHeader><CardContent className="space-y-4 px-4 pb-4 pt-4">{message&&<div role="status" className={`rounded-lg border px-4 py-3 text-sm font-bold ${message.ok?'border-emerald-200 bg-emerald-50 text-emerald-800':'border-red-200 bg-red-50 text-red-800'}`}>{message.text}</div>}<div className="rounded-lg border border-slate-200 bg-white p-4"><p className="font-bold text-slate-900">{user?.email||'Signed-in account'}</p><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Unsubscribing stops future Visual Steps Weekly emails. Published newsletters remain available in the Weekly Archive, and you may subscribe again later.</p>{!user&&<p className="mt-3 text-sm font-semibold text-red-700">Sign in to manage your newsletter subscription.</p>}</div></CardContent></Card></div>;

  if(isCommunityPage)return <div className="w-full space-y-3 px-0">{message&&<div role="status" className={`rounded-xl border px-4 py-3 text-sm font-bold ${message.ok?'border-emerald-200 bg-emerald-50 text-emerald-800':'border-red-200 bg-red-50 text-red-800'}`}>{message.text}</div>}<CommunitySubmission user={user} post={post} setPost={setPost} submit={submit} saveDraft={saveCommunityDraft} busy={busy} previewing={submissionPreview} setPreviewing={setSubmissionPreview} submissions={mySubmissions} onEdit={editSubmission} onDelete={deleteMySubmission} formOpen={submissionFormOpen} setFormOpen={setSubmissionFormOpen} onCreate={openCommunityForm}/></div>;

  if(issueDate)return <div className="page-shell"><div className="page-container space-y-6"><button type="button" onClick={closeIssueTab} className="inline-flex items-center gap-2 font-bold text-brand-700"><X className="h-4 w-4"/>Close newsletter</button>{loading?<p className="surface p-8">Loading…</p>:selectedIssue?<IssueCard issue={selectedIssue}/>:<p className="surface p-8 text-slate-600">This newsletter issue is unavailable.</p>}</div></div>;

  if(month)return <><div className="w-full space-y-3 px-0"><div className="app-page-header flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><h1 className="app-page-title flex items-center gap-3"><Newspaper className="h-8 w-8 text-blue-600"/>Weekly Archive</h1><p className="app-page-subtitle">Open a published Visual Steps newsletter.</p></div>{monthKeys.length>1&&<label className="flex items-center gap-2"><span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Month</span><select aria-label="Newsletter archive month" className="app-control h-9 min-w-44 py-1.5" value={month} onChange={event=>navigate(`/newsletter/archive/${event.target.value}`)}>{monthKeys.map(key=><option key={key} value={key}>{monthLabel(key)}</option>)}</select></label>}</div><Card className="border-slate-200 shadow-sm"><CardContent className="p-4"><h2 className="mb-3 text-sm font-black uppercase tracking-wide text-blue-700">{monthLabel(month)} ({monthGroups[month]?.length||0})</h2>{loading?<div className="app-empty-state">Loading newsletters…</div>:!monthGroups[month]?.length?<div className="app-empty-state"><Newspaper className="mb-3 h-8 w-8 text-slate-300"/><p>No published newsletters are available for this month.</p></div>:<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{monthGroups[month].map(issue=>{const highlights=newsletterHighlights(issue);return <button type="button" key={issue.id} onClick={()=>setArchiveModalIssue(issue)} className="group flex min-h-[22rem] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"><div className="relative flex min-h-32 w-full flex-col justify-between overflow-hidden bg-gradient-to-br from-blue-100 via-cyan-50 to-emerald-100 p-5"><span className="absolute -right-5 -top-6 h-24 w-24 rounded-full bg-white/50"/><span className="absolute -bottom-8 -left-4 h-20 w-20 rounded-full bg-blue-200/30"/><span className="relative grid h-11 w-11 place-items-center rounded-xl bg-white text-blue-600 shadow-sm"><Newspaper className="h-6 w-6"/></span><p className="relative mt-5 text-sm font-black uppercase tracking-wider text-blue-800">{displayDate(issue.issue_date)}</p></div><div className="flex w-full flex-1 flex-col p-5"><h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Inside this issue</h3><ul className="mt-3 space-y-3">{(highlights.length?highlights:['Visual Steps updates','Practical ideas for families','Helpful resources']).map((highlight,index)=><li key={`${issue.id}-highlight-${index}`} className="flex gap-2 text-sm font-semibold leading-5 text-slate-700"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500"/><span className="line-clamp-2">{highlight}</span></li>)}</ul><div className="mt-auto border-t border-slate-100 pt-4"><span className="inline-flex w-full items-center justify-between font-bold text-blue-700">Read Issue <BookOpen className="h-4 w-4"/></span></div></div></button>})}</div>}</CardContent></Card></div>{archiveModalIssue&&<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-6" onMouseDown={event=>{if(event.target===event.currentTarget)setArchiveModalIssue(null);}}><div role="dialog" aria-modal="true" aria-labelledby="newsletter-modal-title" className="flex h-[94vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-2xl"><header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-5"><div className="min-w-0"><h2 id="newsletter-modal-title" className="truncate text-lg font-black text-slate-900">Newsletter · {displayDate(archiveModalIssue.issue_date)}</h2><p className="text-xs text-slate-500">Use the newsletter controls to move through each page.</p></div><button type="button" onClick={()=>setArchiveModalIssue(null)} aria-label="Close newsletter" className="ml-4 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"><X className="h-5 w-5"/></button></header><div className="flex-1 overflow-y-auto p-3 sm:p-5"><IssueCard issue={archiveModalIssue}/></div><footer className="flex justify-end border-t border-slate-200 bg-white px-4 py-3"><Button onClick={()=>setArchiveModalIssue(null)}>Close</Button></footer></div></div>}</>;

  if(routeLocation.pathname==='/newsletter')return loading?<div className="w-full px-0"><div className="app-empty-state">Loading the latest newsletter…</div></div>:monthKeys.length?<Navigate to={`/newsletter/archive/${monthKeys[0]}`} replace/>:<div className="w-full px-0"><div className="app-empty-state"><Newspaper className="mb-3 h-8 w-8 text-slate-300"/>The first issue will appear after its scheduled publication.</div></div>;

  return null;
}

function CommunitySubmission({user,post,setPost,submit,saveDraft,busy,previewing,setPreviewing,submissions,onEdit,onDelete,formOpen,setFormOpen,onCreate}:{user:any;post:any;setPost:(value:any)=>void;submit:(event:FormEvent)=>Promise<void>;saveDraft:()=>Promise<void>;busy:boolean;previewing:boolean;setPreviewing:(value:boolean)=>void;submissions:CommunitySubmissionRecord[];onEdit:(item:CommunitySubmissionRecord)=>void;onDelete:(item:CommunitySubmissionRecord)=>void;formOpen:boolean;setFormOpen:(value:boolean)=>void;onCreate:()=>void}) {
  const [page,setPage]=useState(1);
  const [pageSize,setPageSize]=useState(10);
  const linkRequired = post.contributionType === 'news' || post.contributionType === 'advertisement';
  const editedRecord = submissions.find(item => item.id === post.submissionId);
  const canSaveDraft = !editedRecord || editedRecord.status === 'draft' || editedRecord.status === 'rejected';
  const typeLabels: Record<string, string> = {
    story: 'Personal story', news: 'News', information: 'Information', tip: 'Tip', testimonial: 'Testimonial', advertisement: 'Advertisement',
  };
  const totalPages=Math.max(1,Math.ceil(submissions.length/pageSize));
  const pageItems=submissions.slice((Math.min(page,totalPages)-1)*pageSize,Math.min(page,totalPages)*pageSize);

  if(!user)return <section className="surface w-full p-7 sm:p-10"><h1 className="text-3xl font-black">Share with the community</h1><p className="mt-6 rounded-xl bg-brand-50 p-4 text-sm">Sign in as a parent to submit content. Reading remains public. Organizations may also <Link to="/contact" className="font-bold underline">contact Visual Steps</Link> about a mission-aligned advertisement.</p></section>;

  if(!formOpen)return <section className="w-full space-y-3">
    <div className="app-page-header flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><h1 className="app-page-title flex items-center gap-3"><UsersRound className="h-8 w-8 text-blue-600"/>Share with the Community</h1><p className="app-page-subtitle">Review your saved and submitted community items.</p></div><Button onClick={onCreate}><MessageSquarePlus className="mr-2 h-4 w-4"/>Share Item</Button></div>
    <Card className="app-table-shell"><CardContent className="p-0">{totalPages>1&&<Pagination currentPage={Math.min(page,totalPages)} totalPages={totalPages} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={size=>{setPageSize(size);setPage(1);}}/>}<div className="w-full overflow-x-hidden"><table className="app-data-table w-full"><colgroup><col className="w-[18%]"/><col className="w-[32%]"/><col className="w-[16%]"/><col className="w-[22%]"/><col className="w-[12%]"/></colgroup><thead className="app-data-table-head"><tr><th className="px-4 py-3"><GridColumnHeader label="Type" help="The kind of item shared with the Visual Steps community."/></th><th className="px-4 py-3"><GridColumnHeader label="Title" help="The title saved with this community item."/></th><th className="px-4 py-3"><GridColumnHeader label="Status" help="Draft items are private; pending items await review; approved items may be published and are locked; rejected items can be revised."/></th><th className="px-4 py-3"><GridColumnHeader label="Submitted Date" help="The date and time this item was most recently submitted."/></th><th className="px-4 py-3"><GridColumnHeader label="Actions" help="Continue a draft or edit and resubmit a pending or rejected item. Approved items cannot be changed." align="center"/></th></tr></thead><tbody className="divide-y divide-slate-100">{pageItems.length?pageItems.map(item=><tr key={item.id} className="app-data-row"><td className="break-words px-4 py-4 text-slate-600">{typeLabels[item.contribution_type]||item.contribution_type}</td><td className="break-words px-4 py-4 font-bold text-slate-900">{item.title||'Untitled draft'}</td><td className="px-4 py-4 capitalize text-slate-600">{item.status}</td><td className="px-4 py-4 text-slate-600">{item.submitted_at?new Intl.DateTimeFormat('en-US',{dateStyle:'medium',timeStyle:'short'}).format(new Date(item.submitted_at)):'Not submitted'}</td><td className="px-4 py-4"><div className="flex items-center justify-center gap-1">{item.status!=='approved'?<button type="button" onClick={()=>onEdit(item)} aria-label={`${item.status==='draft'?'Continue':'Edit'} ${item.title||'draft'}`} title={item.status==='draft'?'Continue writing':'Edit and resubmit'} className="inline-grid h-8 w-8 place-items-center rounded-md text-slate-400 hover:bg-blue-50 hover:text-blue-600"><Pencil className="h-4 w-4"/></button>:<span className="text-slate-400" title="Approved items cannot be changed">—</span>}{(item.status==='draft'||item.status==='rejected')&&<button type="button" onClick={()=>onDelete(item)} disabled={busy} aria-label={`Delete ${item.title||'draft'}`} title="Delete" className="inline-grid h-8 w-8 place-items-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"><Trash2 className="h-4 w-4"/></button>}</div></td></tr>):<tr><td colSpan={5} className="px-4 py-12 text-center text-slate-500">You have not saved or submitted anything yet.</td></tr>}</tbody></table></div></CardContent></Card>
  </section>;

  return <section className="w-full space-y-4">
    <div className="flex items-center gap-3"><Button type="button" variant="ghost" size="xs" onClick={()=>{setFormOpen(false);setPreviewing(false);}} className="h-7 pl-0 text-[12px] font-bold uppercase hover:bg-transparent hover:text-blue-600"><ArrowLeft className="mr-1 h-3 w-3"/>Back to List</Button><h1 className="text-xl font-bold leading-none tracking-tight text-slate-900">{post.submissionId?'Edit Community Item':'Share Community Item'}</h1></div>
    <div className="surface p-4"><p className="text-sm leading-6 text-slate-600">Submit autism-related stories, news, information, tips, testimonials, or mission-aligned advertisements. Everything is reviewed before publication. Content must be non-medical and non-clinical, and must never include identifying information about an autistic person.</p>
    <form onSubmit={submit} className="mt-6 grid gap-4 md:grid-cols-2">
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
      <CommunityRichTextEditor value={post.content} onChange={content=>setPost({...post,content})} maxLength={10000}/>
      <label className="flex gap-3 text-sm md:col-span-2"><input type="checkbox" checked={post.consentToPublish} onChange={e=>setPost({...post,consentToPublish:e.target.checked})} required/><span>I created or may share this content and permit Visual Steps to review, edit for clarity, and publish it.</span></label>
      {previewing&&<div className="md:col-span-2 rounded-2xl border border-amber-200 bg-amber-50 p-5"><p className="text-xs font-black uppercase tracking-wider text-amber-800">Submission preview</p><article className="mt-4 rounded-xl bg-white p-5 shadow-sm"><h2 className="text-2xl font-black text-slate-950">{post.title}</h2><p className="mt-2 font-bold text-slate-700">By {post.displayName}</p><p className="mt-1 text-xs font-bold uppercase tracking-wide text-amber-800">{typeLabels[post.contributionType]}</p><FormattedNewsletterContent content={post.content}/></article><p className="mt-3 text-xs text-slate-600">Review the title, spacing, bullets, and author name. You can return to the form before sending it for administrator review.</p></div>}
      <div className="flex flex-wrap gap-3 md:col-span-2">{canSaveDraft&&<Button type="button" variant="outline" onClick={saveDraft} disabled={busy}>Save draft</Button>}{previewing&&<Button type="button" variant="outline" onClick={()=>setPreviewing(false)} disabled={busy}>Edit submission</Button>}<Button disabled={busy}><Send className="mr-2 h-4 w-4"/>{previewing?(post.submissionId?'Resubmit for review':'Submit for review'):'Preview submission'}</Button></div>
    </form></div>
  </section>;
}

export function IssueCard({issue}:{issue:Issue}){
  const title=(key:string,fallback:string)=>issue.section_titles?.[key]||fallback;
  const visible=(key:string)=>issue.section_visibility?.[key]!==false;
  const conciseEditorial=issue.section_visibility?.concise_editorial===true;
  const newFeaturesSection=visible('new_features')?<Section fullWidth itemColumns={conciseEditorial?1:2} numbered={conciseEditorial} tone="blue" title={title('new_features',conciseEditorial?"What's New in Visual Steps":'New and Updated Feature Details')} items={(issue.new_features||[]).map((x:any)=>{
    const featureId=featureIdFor(x);
    const compactDescription=x.description||[x.bullets?.find((bullet:any)=>bullet.label==='What changed')?.text,x.bullets?.find((bullet:any)=>bullet.label==='How it can help')?.text].filter(Boolean).join(' ');
    return <>{x.compact?<><b className="block text-slate-900">{x.title}</b><span className="mt-1 block">{compactDescription}</span></>:<><span className="mb-2 inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-black uppercase tracking-wider text-blue-800">{x.changeType==='updated'?'Feature update':'New feature'}</span><b className="block text-slate-900">{x.title}</b><span className="mt-1 block">{x.summary}</span><span className="mt-2 block">{x.details}</span>{x.familyImpact&&<span className="mt-2 block"><b>How this supports growth:</b> {x.familyImpact}</span>}<small className="mt-2 block font-semibold text-brand-800">Where to find it: {x.help}</small></>}{featureId&&<Link to={featureGuideUrl(x,featureId)} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex font-bold text-brand-800 underline underline-offset-4">Read more</Link>}</>;
  })}/>:null;
  const howToSection=visible('how_to_series')?<Section fullWidth tone="indigo" title={title('how_to_series','How To')} items={(issue.how_to_series||[]).map((x:any)=><article key={x.id}>
    <b className="block text-xl text-slate-950">{x.title}</b>
    <span className="mt-3 block"><b>Purpose:</b> {x.purpose}</span>
    <span className="mt-3 block rounded-lg bg-white/70 px-3 py-2"><b>Go to:</b> {x.navigation}</span>
    <span className="mt-4 block font-bold text-slate-900">Steps:</span>
    <ol className="mt-2 list-decimal space-y-2 pl-6">{(x.steps||[]).map((step:string,index:number)=><li key={`${x.id}-${index}`}>{step}</li>)}</ol>
    {x.id&&<Link to={`/features/${x.id}`} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex font-bold text-brand-800 underline underline-offset-4">See more details</Link>}
  </article>)}/>:null;
  const testimonialsSection=visible('parent_testimonials')?<Section tone="rose" title={title('parent_testimonials','Parent Testimonials')} items={(issue.parent_testimonials||[]).map((x:any)=><><b>By {x.displayName}</b><FormattedNewsletterContent content={x.quote}/>{x.editorialContext&&<small className="mt-2 block italic">{x.editorialContext}</small>}</>)}/>:null;
  const contentsOrder=[
    title('new_features',conciseEditorial?"What's New in Visual Steps":'New and Updated Feature Details'),
    title('how_to_series','How To'),
    title('feature_previews','Feature Previews'),
    title('feature_details','Using Visual Steps Meaningfully'),
    title('popular_features','Most Popular Features'),
    title('parent_tips','Tips and Tricks for Parents'),
    title('recommended_resources','Suggested Activities, Games and Websites'),
    title('suggested_books_resources','Suggested Books and Resources'),
    ...communitySectionTypes.map(section=>title(`community_${section.key}`,section.title)),
    title('parent_testimonials','Parent Testimonials'),
    title('advertisements','Mission-Aligned Advertisements'),
    title('membership_details','Current Visual Steps Membership Details'),
  ];
  return <NewsletterFlipBook issueTitle={issue.title} contentsOrder={contentsOrder}><header className="newsletter-page"><p className="text-sm font-black uppercase tracking-wider text-brand-700">{displayDate(issue.issue_date)}</p><h3 className="mt-3 text-4xl font-black sm:text-5xl">{issue.title}</h3><p className="mt-5 text-base leading-8 text-slate-600">{issue.introduction}</p><NewsletterLinks links={issue.footer_links}/></header><div className="grid gap-7">
    {newFeaturesSection}
    {howToSection}
    {visible('feature_previews')&&<Section oneItemPerPage fullWidth tone="violet" title={title('feature_previews','Feature Previews')} items={(issue.feature_previews||[]).map((x:any)=>{
      const featureId=featureIdFor(x);
      return <><img src={x.imageUrl} alt={`${x.title} feature preview`} className="mb-3 h-52 w-full rounded-xl object-contain object-top sm:h-64"/><b>{x.title}</b> — {x.caption}{x.familyImpact&&<span className="mt-2 block"><b>Why it matters:</b> {x.familyImpact}</span>}{featureId&&<Link to={`/features/${featureId}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex font-bold text-brand-800 underline underline-offset-4">Read more</Link>}</>;
    })}/>} {/* Feature preview page ends here. */}
    {conciseEditorial&&visible('feature_details')&&<Section bulleted tone="violet" title={title('feature_details','Using Visual Steps Meaningfully')} items={issue.feature_details||[]}/>} {/* Practical guidance */}
    {visible('popular_features') && (
      <Section tone="emerald" title={title('popular_features','Most Popular Features')} items={(issue.popular_features||[]).map((x:any)=><><b>{x.title}</b> — {x.explanation}</>)}/>
    )}
    {visible('parent_tips')&&(
      <Section bulleted tone="lime" title={title('parent_tips','Tips and Tricks for Parents')} items={issue.parent_tips||[]}/>
    )}
    {visible('recommended_resources')&&<Section tone="cyan" title={title('recommended_resources','Suggested Activities, Games and Websites')} items={(issue.recommended_resources||[]).map((x:any)=><><b>{x.title}</b> ({x.type}) — {x.description}{x.url&&<a href={x.url} target="_blank" rel="noreferrer" className="ml-1 underline">Visit</a>}</>)}/>} {/* Activity ideas */}
    {visible('suggested_books_resources')&&<Section fullWidth itemColumns={2} tone="amber" title={title('suggested_books_resources','Suggested Books and Resources')} items={(issue.suggested_books_resources||[]).map((x:any)=><><b>{x.title}</b> ({x.type}){x.creator&&<> by {x.creator}</>} — {x.description}{x.url&&<a href={x.url} target="_blank" rel="noreferrer" className="ml-1 underline">Visit resource</a>}</>)}/>} {/* Books and resources */}
    {visible('community_posts')&&communitySectionTypes.map(section=>{
      const posts=(issue.community_posts||[]).filter((post:any)=>String(post.type||'').toLowerCase()===section.key);
      if(!posts.length)return null;
      const items=posts.map((post:any)=><article key={post.title}><h5 className="text-xl font-black leading-tight text-slate-950 sm:text-2xl">{post.title}</h5><p className="mt-2 text-sm font-bold text-slate-700">By {post.displayName}</p><FormattedNewsletterContent content={post.content}/>{post.sourceUrl&&<a href={post.sourceUrl} target="_blank" rel="noreferrer" className="mt-4 inline-block font-bold underline">Source</a>}{post.editorialContext&&<small className="mt-3 block italic">{post.editorialContext}</small>}</article>);
      return <Section key={section.key} oneItemPerPage tone={section.tone} title={title(`community_${section.key}`,section.title)} items={items}/>;
    })}
    {testimonialsSection}
    {visible('advertisements')&&(
      <Section fullWidth itemColumns={2} tone="orange" title={title('advertisements','Mission-Aligned Advertisements')} items={(issue.advertisements||[]).map((x:any)=><><span className="text-xs font-black uppercase tracking-wider text-amber-800">Advertisement</span><span className="mt-1 block"><b>{x.title}</b> — {x.description}</span><span className="mt-2 block text-xs">From {x.advertiser}. {x.disclosure}</span>{x.destinationUrl&&<a href={x.destinationUrl} target="_blank" rel="sponsored noreferrer" className="mt-2 inline-block font-bold underline">Visit advertiser</a>}</>)}/>
    )}
    {visible('membership_details')&&(
      <Section tone="indigo" title={title('membership_details','Current Visual Steps Membership Details')} items={(issue.membership_details||[]).map((x:any)=><><b>{x.name}: {x.price}</b> — {x.status}. {x.details}</>)}/>
    )}
  </div></NewsletterFlipBook>;
}
function NewsletterFlipBook({issueTitle,contentsOrder,children}:{issueTitle:string;contentsOrder:string[];children:ReactNode}){
  const suppliedContent:ReactNode[]=[];
  for(const child of Children.toArray(children)){if(isValidElement<{className?:string;children?:ReactNode}>(child)&&child.props.className==='grid gap-7')suppliedContent.push(...Children.toArray(child.props.children));else suppliedContent.push(child);}
  const availableSectionTitles=suppliedContent.flatMap(child=>isValidElement<SectionProps>(child)&&child.type===Section&&child.props.items.length?[child.props.title]:[]);
  const sectionTitles=[...contentsOrder.filter(title=>availableSectionTitles.includes(title)),...availableSectionTitles.filter(title=>!contentsOrder.includes(title))];
  const [page,setPage]=useState(0);
  const [pageCount,setPageCount]=useState(1);
  const [sectionPages,setSectionPages]=useState<Record<string,number>>({});
  const [direction,setDirection]=useState<'forward'|'back'>('forward');
  const [singlePage,setSinglePage]=useState(false);
  const pointerStart=useRef<number|null>(null);
  useEffect(()=>{setPage(0);setPageCount(1);},[issueTitle]);
  useEffect(()=>{const query=window.matchMedia('(max-width: 760px)');const update=()=>{setSinglePage(query.matches);setPage(0);};update();query.addEventListener('change',update);return()=>query.removeEventListener('change',update);},[]);
  const step=singlePage?1:2;
  const turn=(next:number)=>{const bounded=Math.max(0,Math.min(next,pageCount-1));const normalized=singlePage?bounded:bounded-bounded%2;if(normalized===page)return;setDirection(normalized>page?'forward':'back');setPage(normalized);};
  const recordSectionPages=useCallback((next:Record<string,number>)=>setSectionPages(current=>JSON.stringify(current)===JSON.stringify(next)?current:next),[]);
  const content=[suppliedContent[0],<NewsletterContentsPage key="newsletter-contents" titles={sectionTitles} pages={sectionPages} onSelect={turn}/>,...suppliedContent.slice(1)];
  const rightPage=!singlePage&&page+1<pageCount;
  const lastSingle=!singlePage&&!rightPage;
  const finishSwipe=(clientX:number)=>{if(pointerStart.current===null)return;const distance=clientX-pointerStart.current;pointerStart.current=null;if(Math.abs(distance)<45)return;turn(page+(distance<0?step:-step));};
  return <section className="newsletter-copy newsletter-book mx-auto max-w-7xl" aria-label={`${issueTitle} flipbook`} tabIndex={0} onKeyDown={event=>{if(event.key==='ArrowRight'){event.preventDefault();turn(page+step);}if(event.key==='ArrowLeft'){event.preventDefault();turn(page-step);}}}>
    <div key={`${page}-${singlePage}`} className={`newsletter-book-stage newsletter-spread-${direction} ${singlePage?'is-single-page':''} ${lastSingle?'is-last-single':''}`} onPointerDown={event=>{pointerStart.current=event.clientX;}} onPointerUp={event=>finishSwipe(event.clientX)} onPointerCancel={()=>{pointerStart.current=null;}}>
      <div className="newsletter-book-page newsletter-book-page-left"><NewsletterBookLeaf content={content} pageIndex={page} onPageCount={setPageCount} onSectionPages={recordSectionPages}/>{page>0&&<button type="button" className="newsletter-page-turn-zone newsletter-page-turn-zone-left" onClick={()=>turn(page-step)} aria-label="Turn to previous pages"/>}</div>
      {rightPage&&<div className="newsletter-book-page newsletter-book-page-right"><NewsletterBookLeaf content={content} pageIndex={page+1}/>{page+1!==1&&<button type="button" className="newsletter-back-to-contents" onClick={()=>turn(1)}>Back to contents</button>}<button type="button" className="newsletter-page-turn-zone newsletter-page-turn-zone-right" onClick={()=>turn(page+step)} disabled={page+step>=pageCount} aria-label="Turn to next pages"/></div>}
      <div className="newsletter-turning-sheet" aria-hidden="true"/>
    </div><div className="newsletter-book-print">{content}</div>
    <div className="newsletter-book-status" aria-live="polite"><BookOpen className="h-5 w-5 text-brand-600"/><span>{singlePage?`Page ${page+1}`:`Pages ${page+1}${rightPage?`–${page+2}`:''}`} of {pageCount}</span></div>
    <p className="mt-2 text-center text-xs text-slate-500">Click a page edge, swipe, or use the left and right arrow keys to turn the pages.</p>
  </section>;
}
function NewsletterContentsPage({titles,pages,onSelect}:{titles:string[];pages:Record<string,number>;onSelect:(page:number)=>void}){
  return <section className="newsletter-page newsletter-contents-page" aria-labelledby="newsletter-contents-title"><h4 id="newsletter-contents-title" className="text-3xl font-black text-slate-950">Contents</h4><p className="mt-2 text-slate-600">Select a section to go directly to its page.</p><ol className="mt-6 space-y-1">{titles.map(title=>{const target=pages[title];return <li key={title}><button type="button" className="newsletter-contents-link" onClick={()=>target!==undefined&&onSelect(target)} disabled={target===undefined}><span>{title}</span><span className="newsletter-contents-dots" aria-hidden="true"/><span aria-label={`Page ${(target??0)+1}`}>{target===undefined?'…':target+1}</span></button></li>;})}</ol></section>;
}
function NewsletterBookLeaf({content,pageIndex,onPageCount,onSectionPages}:{content:ReactNode;pageIndex:number;onPageCount?:(count:number)=>void;onSectionPages?:(pages:Record<string,number>)=>void}){
  const leafRef=useRef<HTMLDivElement>(null);
  useLayoutEffect(()=>{
    let frame=0;
    const measure=()=>{const leaf=leafRef.current;const flow=leaf?.querySelector<HTMLElement>('.newsletter-flow-content');if(!leaf||!flow)return;flow.style.columnWidth=`${flow.clientWidth}px`;cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{const stride=leaf.clientWidth;onPageCount?.(Math.max(1,Math.ceil(flow.scrollWidth/stride)));if(onSectionPages){const flowLeft=flow.getBoundingClientRect().left;const pages:Record<string,number>={};flow.querySelectorAll<HTMLElement>('[data-newsletter-section-title]').forEach(marker=>{const rect=marker.getClientRects()[0];const title=marker.dataset.newsletterSectionTitle;if(rect&&title)pages[title]=Math.max(0,Math.round((rect.left-flowLeft)/stride));});onSectionPages(pages);}});};
    measure();const observer=new ResizeObserver(measure);if(leafRef.current)observer.observe(leafRef.current);const images=leafRef.current?.querySelectorAll('img')||[];images.forEach(image=>image.addEventListener('load',measure));window.addEventListener('resize',measure);return()=>{cancelAnimationFrame(frame);observer.disconnect();images.forEach(image=>image.removeEventListener('load',measure));window.removeEventListener('resize',measure);};
  },[content,onPageCount,onSectionPages]);
  return <div ref={leafRef} className="newsletter-book-leaf"><div className="newsletter-flow-viewport"><div className="newsletter-flow-content" style={{'--newsletter-page-index':pageIndex} as CSSProperties}>{content}</div></div></div>;
}
function NewsletterLinks({links}:{links?:Record<string,string>}){const items=[['Visual Steps Home',links?.mainPage||'/'],['Pricing',links?.pricing||'/pricing'],['Subscribe Newsletter','/newsletter/subscribe'],['Facebook',links?.facebook],['Instagram',links?.instagram]].filter((item):item is [string,string]=>Boolean(item[1]));return <nav aria-label="Newsletter links" className="mt-7 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-200 pt-5 text-sm font-bold text-brand-800">{items.map(([label,url])=><a key={label} href={url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{label}</a>)}</nav>}
type SectionProps={title:string;items:ReactNode[];tone:'blue'|'violet'|'amber'|'orange'|'rose'|'emerald'|'cyan'|'indigo'|'lime';fullWidth?:boolean;itemColumns?:1|2;bulleted?:boolean;numbered?:boolean;oneItemPerPage?:boolean};
function Section({title,items,tone,bulleted=false,numbered=false}:SectionProps){if(!items.length)return null;const colors={blue:'border-blue-200 bg-blue-50/80',violet:'border-violet-200 bg-violet-50/80',amber:'border-amber-200 bg-amber-50/80',orange:'border-orange-200 bg-orange-50/80',rose:'border-rose-200 bg-rose-50/80',emerald:'border-emerald-200 bg-emerald-50/80',cyan:'border-cyan-200 bg-cyan-50/80',indigo:'border-indigo-200 bg-indigo-50/80',lime:'border-lime-200 bg-lime-50/80'};const ListTag=numbered?'ol':'ul';return <section className={`newsletter-page border ${colors[tone]}`}><h4 data-newsletter-section-title={title} className="text-2xl font-black leading-tight text-slate-950 sm:text-3xl">{title}</h4><ListTag className={`mt-5 grid gap-5 text-base leading-7 text-slate-700 ${numbered?'newsletter-numbered-features list-outside list-decimal pl-6 marker:font-black marker:text-blue-700':bulleted?'list-outside list-disc pl-5 marker:text-lime-700':''}`}>{items.map((item,index)=><li key={index} className="newsletter-section-item border-b border-slate-200/70 pb-5 last:border-0 last:pb-0">{item}</li>)}</ListTag></section>}
