import { CSSProperties, Children, FormEvent, ReactNode, isValidElement, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { Bold, BookOpen, ExternalLink, Heading2, Italic, Link as LinkIcon, List, ListOrdered, Mail, Quote, Send, ShieldCheck, Trash2, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
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
const communitySectionTypes=[
  {key:'story',title:'Parent Stories',tone:'amber' as const},
  {key:'news',title:'Community News',tone:'blue' as const},
  {key:'information',title:'Helpful Information',tone:'cyan' as const},
  {key:'tip',title:'Community Tips and Tricks',tone:'lime' as const},
  {key:'testimonial',title:'Community Testimonials',tone:'rose' as const},
  {key:'advertisement',title:'Community Advertisements',tone:'orange' as const},
];
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
  useEffect(()=>{if(routeLocation.pathname!=='/newsletter/community')return;const requestedType=new URLSearchParams(routeLocation.search).get('type');if(requestedType&&['story','news','information','tip','testimonial','advertisement'].includes(requestedType))setPost(current=>({...current,contributionType:requestedType}));},[routeLocation.pathname,routeLocation.search]);
  const subscribe=async(event:FormEvent)=>{event.preventDefault();setBusy(true);try{const response=await fetch('/api/newsletter/subscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});const data=await response.json();if(!response.ok)throw new Error(data.error);setMessage({ok:true,text:data.message});setEmail('');}catch(error){setMessage({ok:false,text:error instanceof Error?error.message:'Subscription failed.'});}finally{setBusy(false);}};
  const submit=async(event:FormEvent)=>{event.preventDefault();if(!submissionPreview){setSubmissionPreview(true);return;}setBusy(true);try{const response=await apiFetch('/api/newsletter/community-submissions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(post)},0);const data=await response.json();if(!response.ok)throw new Error(data.error);setMessage({ok:true,text:data.message});setPost({...post,submissionId:'',title:'',content:'',sourceUrl:'',consentToPublish:false});setSubmissionPreview(false);await loadMySubmissions();}catch(error){setMessage({ok:false,text:error instanceof Error?error.message:'Submission failed.'});}finally{setBusy(false);}};
  const saveCommunityDraft=async()=>{setBusy(true);try{const response=await apiFetch('/api/newsletter/community-submissions/draft',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(post)},0);const data=await response.json();if(!response.ok)throw new Error(data.error);setPost(current=>({...current,submissionId:data.id,consentToPublish:false}));setSubmissionPreview(false);setMessage({ok:true,text:data.message});await loadMySubmissions();}catch(error){setMessage({ok:false,text:error instanceof Error?error.message:'The draft could not be saved.'});}finally{setBusy(false);}};
  const editSubmission=(item:CommunitySubmissionRecord)=>{setPost({submissionId:item.id,contributionType:item.contribution_type,title:item.title,content:item.content,displayName:item.display_name,sourceUrl:item.source_url||'',consentToPublish:true});setSubmissionPreview(false);setMessage(null);window.scrollTo({top:0,behavior:'smooth'});};
  const deleteMySubmission=async(item:CommunitySubmissionRecord)=>{if(!window.confirm(`Delete “${item.title}”? This removes it from future review but does not change a newsletter that was already published.`))return;setBusy(true);try{const response=await apiFetch(`/api/newsletter/community-submissions/${item.id}`,{method:'DELETE'},0);const data=await response.json();if(!response.ok)throw new Error(data.error);if(post.submissionId===item.id)setPost({...post,submissionId:'',title:'',content:'',sourceUrl:'',consentToPublish:false});setMessage({ok:true,text:data.message});setSubmissionPreview(false);await loadMySubmissions();}catch(error){setMessage({ok:false,text:error instanceof Error?error.message:'The submission could not be deleted.'});}finally{setBusy(false);}};
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

  if(isCommunityPage)return <div className="page-shell"><div className="page-container flex min-h-[70vh] items-center justify-center">{message&&<div role="status" className={`fixed top-24 z-20 rounded-xl border p-4 text-sm font-bold ${message.ok?'border-emerald-200 bg-emerald-50 text-emerald-800':'border-red-200 bg-red-50 text-red-800'}`}>{message.text}</div>}<CommunitySubmission user={user} post={post} setPost={setPost} submit={submit} saveDraft={saveCommunityDraft} busy={busy} previewing={submissionPreview} setPreviewing={setSubmissionPreview} submissions={mySubmissions} onEdit={editSubmission} onDelete={deleteMySubmission}/></div></div>;

  if(issueDate)return <div className="page-shell"><div className="page-container space-y-6"><button type="button" onClick={closeIssueTab} className="inline-flex items-center gap-2 font-bold text-brand-700"><X className="h-4 w-4"/>Close newsletter</button>{loading?<p className="surface p-8">Loading…</p>:selectedIssue?<IssueCard issue={selectedIssue}/>:<p className="surface p-8 text-slate-600">This newsletter issue is unavailable.</p>}</div></div>;

  if(month)return <div className="page-shell"><div className="page-container space-y-7"><section className="public-hero p-7 sm:p-10"><p className="text-xs font-black uppercase tracking-widest text-brand-700">Weekly archive</p><h1 className="mt-2 text-4xl font-black">{monthLabel(month)}</h1><p className="mt-3 text-slate-600">Select an issue below. Each newsletter opens in a new browser tab so this monthly list remains available.</p></section>{loading?<p className="surface p-8">Loading…</p>:!monthGroups[month]?.length?<p className="surface p-8 text-slate-600">No published newsletters are available for this month.</p>:<div className="surface divide-y divide-slate-200 px-6">{monthGroups[month].map(issue=><Link key={issue.id} to={`/newsletter/issues/${issue.issue_date}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-4 py-5 font-bold text-slate-800 hover:text-brand-700"><span><span className="block text-xs uppercase tracking-wider text-brand-600">{displayDate(issue.issue_date)}</span><span className="mt-1 block text-lg">{issue.title}</span></span><ExternalLink className="h-5 w-5 shrink-0"/></Link>)}</div>}</div></div>;

  if(routeLocation.pathname==='/newsletter')return loading?<div className="page-shell"><div className="page-container"><p className="surface p-8">Loading the latest newsletter…</p></div></div>:monthKeys.length?<Navigate to={`/newsletter/archive/${monthKeys[0]}`} replace/>:<div className="page-shell"><div className="page-container"><p className="surface p-8 text-slate-600">The first issue will appear after its scheduled publication.</p></div></div>;

  return null;
}

function CommunitySubmission({user,post,setPost,submit,saveDraft,busy,previewing,setPreviewing,submissions,onEdit,onDelete}:{user:any;post:any;setPost:(value:any)=>void;submit:(event:FormEvent)=>Promise<void>;saveDraft:()=>Promise<void>;busy:boolean;previewing:boolean;setPreviewing:(value:boolean)=>void;submissions:CommunitySubmissionRecord[];onEdit:(item:CommunitySubmissionRecord)=>void;onDelete:(item:CommunitySubmissionRecord)=>void}) {
  const linkRequired = post.contributionType === 'news' || post.contributionType === 'advertisement';
  const editedRecord = submissions.find(item => item.id === post.submissionId);
  const canSaveDraft = !editedRecord || editedRecord.status === 'draft' || editedRecord.status === 'rejected';
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
      <CommunityRichTextEditor value={post.content} onChange={content=>setPost({...post,content})} maxLength={10000}/>
      <label className="flex gap-3 text-sm md:col-span-2"><input type="checkbox" checked={post.consentToPublish} onChange={e=>setPost({...post,consentToPublish:e.target.checked})} required/><span>I created or may share this content and permit Visual Steps to review, edit for clarity, and publish it.</span></label>
      {previewing&&<div className="md:col-span-2 rounded-2xl border border-amber-200 bg-amber-50 p-5"><p className="text-xs font-black uppercase tracking-wider text-amber-800">Submission preview</p><article className="mt-4 rounded-xl bg-white p-5 shadow-sm"><h2 className="text-2xl font-black text-slate-950">{post.title}</h2><p className="mt-2 font-bold text-slate-700">By {post.displayName}</p><p className="mt-1 text-xs font-bold uppercase tracking-wide text-amber-800">{typeLabels[post.contributionType]}</p><FormattedNewsletterContent content={post.content}/></article><p className="mt-3 text-xs text-slate-600">Review the title, spacing, bullets, and author name. You can return to the form before sending it for administrator review.</p></div>}
      <div className="flex flex-wrap gap-3 md:col-span-2">{canSaveDraft&&<Button type="button" variant="outline" onClick={saveDraft} disabled={busy}>Save draft</Button>}{previewing&&<Button type="button" variant="outline" onClick={()=>setPreviewing(false)} disabled={busy}>Edit submission</Button>}<Button disabled={busy}><Send className="mr-2 h-4 w-4"/>{previewing?(post.submissionId?'Resubmit for review':'Submit for review'):'Preview submission'}</Button></div>
    </form><div className="mt-10 border-t border-slate-200 pt-7"><h2 className="text-2xl font-black">My submissions</h2><p className="mt-2 text-sm leading-6 text-slate-600">Save unfinished writing privately, or open an earlier contribution to correct its wording and formatting. You may delete your drafts and rejected submissions. Pending and approved submissions remain protected.</p><div className="mt-5 grid gap-3">{submissions.length?submissions.map(item=><article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-black text-slate-900">{item.title||'Untitled draft'}</h3><p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">{typeLabels[item.contribution_type]} · {item.status}</p></div><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={()=>onEdit(item)}>{item.status==='draft'?'Continue writing':'Edit and resubmit'}</Button>{(item.status==='draft'||item.status==='rejected')&&<Button type="button" variant="danger" onClick={()=>onDelete(item)} disabled={busy}><Trash2 className="mr-2 h-4 w-4"/>Delete</Button>}</div></div><div className="mt-3 max-h-32 overflow-hidden">{item.content?<FormattedNewsletterContent content={item.content}/>:<p className="text-sm italic text-slate-500">No content written yet.</p>}</div></article>):<p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">You have not saved or submitted anything yet.</p>}</div></div></> : <p className="mt-6 rounded-xl bg-brand-50 p-4 text-sm">Sign in as a parent to submit content. Reading remains public. Organizations may also <Link to="/contact" className="font-bold underline">contact Visual Steps</Link> about a mission-aligned advertisement.</p>}
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
    {visible('parent_testimonials')&&<Section tone="rose" title={title('parent_testimonials','Parent Testimonials')} items={(issue.parent_testimonials||[]).map((x:any)=><><b>By {x.displayName}</b><FormattedNewsletterContent content={x.quote}/>{x.editorialContext&&<small className="mt-2 block italic">{x.editorialContext}</small>}</>)}/>} {/* Testimonial page ends here. */}
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
  const suppliedContent:ReactNode[]=[];
  for(const child of Children.toArray(children)){if(isValidElement<{className?:string;children?:ReactNode}>(child)&&child.props.className==='grid gap-7')suppliedContent.push(...Children.toArray(child.props.children));else suppliedContent.push(child);}
  const sectionTitles=suppliedContent.flatMap(child=>isValidElement<SectionProps>(child)&&child.type===Section&&child.props.items.length?[child.props.title]:[]);
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
type SectionProps={title:string;items:ReactNode[];tone:'blue'|'violet'|'amber'|'orange'|'rose'|'emerald'|'cyan'|'indigo'|'lime';fullWidth?:boolean;itemColumns?:1|2;bulleted?:boolean;oneItemPerPage?:boolean};
function Section({title,items,tone,bulleted=false}:SectionProps){if(!items.length)return null;const colors={blue:'border-blue-200 bg-blue-50/80',violet:'border-violet-200 bg-violet-50/80',amber:'border-amber-200 bg-amber-50/80',orange:'border-orange-200 bg-orange-50/80',rose:'border-rose-200 bg-rose-50/80',emerald:'border-emerald-200 bg-emerald-50/80',cyan:'border-cyan-200 bg-cyan-50/80',indigo:'border-indigo-200 bg-indigo-50/80',lime:'border-lime-200 bg-lime-50/80'};return <section className={`newsletter-page border ${colors[tone]}`}><h4 data-newsletter-section-title={title} className="text-2xl font-black leading-tight text-slate-950 sm:text-3xl">{title}</h4><ul className={`mt-5 grid gap-5 text-base leading-7 text-slate-700 ${bulleted?'list-outside list-disc pl-5 marker:text-lime-700':''}`}>{items.map((item,index)=><li key={index} className="newsletter-section-item border-b border-slate-200/70 pb-5 last:border-0 last:pb-0">{item}</li>)}</ul></section>}
