import { Cookie, FileCheck2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export type LegalPageKind = 'privacy' | 'terms' | 'cookies';

const EFFECTIVE_DATE = '25 Aug, 2026';
const CONTACT_EMAIL = 'visualstepsautism@gmail.com';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="border-t border-slate-200 pt-7 first:border-0 first:pt-0">
    <h2 className="text-xl font-black text-slate-950">{title}</h2>
    <div className="mt-3 space-y-3 text-justify text-sm leading-7 text-slate-700">{children}</div>
  </section>
);

function PrivacyPolicy() {
  return <>
    <Section title="Information Visual Steps handles">
      <p>Parents and caregivers may provide an account name and email address and create profiles for autistic children or adults. A family profile may contain a name, date of birth, grade or learning level, interests, strengths, support needs, routines, timezone, avatar, activities, messages, rewards, quiz responses, worksheets, social stories, and progress records. Please enter only information that is useful for providing support and avoid unnecessary medical, government-identification, financial, school, location, or other highly sensitive details.</p>
      <p>Newsletter subscriptions use an email address. Community stories, testimonials, tips, news, and advertisements are collected only when a signed-in parent submits them with publication consent. Guest Login information remains in the current browser session and is not saved with a family account.</p>
    </Section>
    <Section title="How information is used">
      <p>Family information is used to provide the features a parent or caregiver chooses, including schedules, visual activities, learning materials, rewards, reports, sharing links, account messages, and support. It is not sold. Visual Steps does not use family profiles for behavioral advertising.</p>
      <p>When a parent asks for AI-assisted material or guidance, the information needed for that request may be sent to the configured AI service to generate the response. Parents should remove unnecessary identifying details, review every result, and avoid using Visual Steps as medical, diagnostic, emergency, or clinical advice.</p>
      <p>Visual Steps records limited service activity to understand feature use, support accounts, protect the service, and plan improvements. Administrator insights do not include child / adult profiles, family content, request text, or raw IP addresses. Authorized administrators may see a parent account’s name, email address, account status, general features used, and action times.</p>
    </Section>
    <Section title="Service providers and limited sharing">
      <p>Visual Steps uses carefully selected service providers for sign-in, secure storage, website delivery, optional AI features, and email. They process information only as needed to provide the feature a family chooses and operate under their own security and privacy terms.</p>
      <p>Information may also be disclosed when legally required, when needed to protect people or the service, or as part of a business transfer with appropriate notice and safeguards.</p>
      <p>A social story is private unless a parent creates an expiring share link. Anyone who receives a valid link may view the shared story until it expires or is revoked, so links should be shared only with trusted people.</p>
      <p>Uploaded images use long, randomly generated addresses and only the owning parent may upload or delete them. However, an image can be viewed by someone who obtains its exact address. Do not upload photographs or documents that reveal private locations, schools, medical information, identity documents, or anything that should remain strictly confidential.</p>
    </Section>
    <Section title="Children, adults, and caregiver responsibility">
      <p>Parent accounts are intended for adults and caregivers. A parent controls child/adult profiles and creates limited learner access. Visual Steps should not be used by a child to create an independent parent account. The parent or legal caregiver is responsible for having authority to enter another person’s information and for explaining the service in a way that respects that person’s age, communication style, autonomy, and applicable consent rights.</p>
    </Section>
    <Section title="Retention, deletion, and choices">
      <p>Parents can review saved records through Data Management and can delete supported records they no longer need. Messages follow the retention setting selected by the parent. Newsletter subscribers can unsubscribe through the link in every issue. Account deletion or a copy/correction request can be made through <Link to="/contact" className="font-bold text-brand-700 underline">Contact</Link>. Some limited records may be retained when required for security, legal compliance, fraud prevention, or reliable backups.</p>
    </Section>
    <Section title="Security and limits">
      <p>Visual Steps uses protected sign-in, family-specific access, restricted child sessions, private-by-default records, and careful checks for uploaded files. Sensitive family information is not intended to be stored in public or shared browser caches.</p>
      <p>No online service can promise absolute security. Use a unique password, protect child access codes and sharing links, sign out on shared devices, and contact us promptly if access may have been compromised.</p>
    </Section>
    <Section title="Questions and policy updates">
      <p>Contact <a className="font-bold text-brand-700 underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> with a privacy request. Material changes will be reflected on this page by updating the effective date and, when appropriate, by providing an additional notice.</p>
    </Section>
  </>;
}

function TermsOfService() {
  return <>
    <Section title="Using Visual Steps">
      <p>Visual Steps provides planning, learning, communication, reward, reporting, and community tools for autistic children and adults and the people supporting them. You must be able to form a binding agreement and must provide accurate account information. Parents and caregivers are responsible for their account, the profiles they create, learner access codes, and activity performed through those credentials.</p>
    </Section>
    <Section title="Caregiver judgment and no clinical advice">
      <p>Visual Steps is an organizational and educational support tool, not a medical device, healthcare provider, therapist, emergency service, or substitute for professional judgment. AI drafts, suggested activities, reports, rewards, stories, worksheets, and quizzes may be incomplete or incorrect. A responsible adult must review materials and decide whether they are safe, respectful, age-appropriate, and suitable for the autistic person’s communication, sensory, physical, emotional, intellectual, and support needs.</p>
    </Section>
    <Section title="Respectful and permitted use">
      <p>Do not use Visual Steps to harm, exploit, shame, threaten, deceive, discriminate against, or coerce another person. Do not upload unlawful content, malware, private information without authority, or material that infringes another person’s rights. Do not bypass access controls, probe other families’ information, automate excessive requests, resell the service without permission, or use AI features to create prohibited content.</p>
      <p>Community submissions and testimonials must be truthful, relevant to the Visual Steps mission, non-clinical, and free of identifying information about another person unless lawful permission has been obtained. Submission does not guarantee publication, and approved content may be edited for clarity or removed.</p>
    </Section>
    <Section title="Your content and service operation">
      <p>You retain ownership of content you create. You grant Visual Steps the limited permission needed to store, process, display, and transmit it to operate features you request. Content submitted for public community publication also carries the publication permission stated on that form.</p>
      <p>Features may change, be suspended, or be discontinued, and free or future paid limits may change with reasonable notice. Access may be restricted when necessary to protect people, data, the service, or legal compliance. You may stop using the service and request account deletion at any time.</p>
    </Section>
    <Section title="Availability and responsibility">
      <p>The service is provided on an “as available” basis to the extent permitted by law. Visual Steps cannot guarantee uninterrupted availability, preservation of every record, or that generated material will achieve a particular result. Keep independent copies of information that is important to your family. Nothing in these terms excludes rights or responsibilities that cannot legally be excluded.</p>
    </Section>
    <Section title="Questions and changes">
      <p>Questions about these terms may be sent to <a className="font-bold text-brand-700 underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Material revisions will be identified by a new effective date and may require renewed acceptance.</p>
    </Section>
  </>;
}

function CookieDisclosure() {
  return <>
    <Section title="Current cookie and analytics practice">
      <p>Visual Steps does not install advertising cookies or use cross-site behavioral advertising. It records privacy-conscious first-party page visits to understand visitor totals, general country or region, referring website, device category, pages visited, and features explored. The service hashes a temporary browser-session identifier and does not retain raw IP addresses, form contents, search text, or child / adult information in website traffic reports.</p>
      <p>The measurement request is not sent when the browser communicates a Do Not Track preference. The information is used for service planning, reliability, and understanding which Visual Steps areas are useful. It is not used to create advertising profiles or follow visitors across unrelated websites.</p>
    </Section>
    <Section title="Essential browser storage">
      <p>The sign-in service stores session information in the browser so a parent can remain securely signed in. Visual Steps also uses browser storage for interface preferences, selected profiles, walkthrough status, child sessions, and the temporary Guest Login.</p>
      <p>A browser may keep basic application files so the installed app opens more reliably. Private family records are not intentionally placed in that cache.</p>
      <p>The hosting or security provider may use strictly necessary cookies or similar signals to deliver the site, prevent abuse, or verify requests. Blocking essential storage may prevent sign-in, learner access, preferences, or installed-app behavior from working.</p>
    </Section>
    <Section title="How to control stored information">
      <p>You can sign out to clear the active Visual Steps session, end Guest Login by reloading or leaving it, or use browser settings to remove site data, local storage, cookies, and caches. Clearing site data can sign you out and reset interface preferences, but it does not delete records saved in your Visual Steps account. Use Data Management or contact Visual Steps for saved-account records.</p>
    </Section>
    <Section title="Third-party destinations">
      <p>Links to social media, books, resources, or other websites open services with their own cookie and analytics practices. Visual Steps does not control those services. Review their notices before providing information.</p>
    </Section>
  </>;
}

const pageMeta = {
  privacy: { title: 'Privacy Policy', description: 'How Visual Steps handles and protects sensitive family information.', icon: ShieldCheck },
  terms: { title: 'Terms of Service', description: 'The responsibilities and conditions for using Visual Steps.', icon: FileCheck2 },
  cookies: { title: 'Cookies & Analytics', description: 'A plain-language explanation of browser storage, cookies, and analytics.', icon: Cookie },
};

export default function Legal({ kind }: { kind: LegalPageKind }) {
  const meta = pageMeta[kind];
  const Icon = meta.icon;
  return <div className="page-shell"><div className="page-container">
    <article className="surface mx-auto max-w-4xl p-6 sm:p-10">
      <header className="border-b border-slate-200 pb-7">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><Icon className="h-6 w-6" /></span>
        <h1 className="mt-5 text-4xl font-black text-slate-950 sm:text-5xl">{meta.title}</h1>
        <p className="mt-3 text-lg leading-8 text-slate-600">{meta.description}</p>
        <p className="mt-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500"><LockKeyhole className="h-4 w-4" /> Effective {EFFECTIVE_DATE}</p>
      </header>
      <div className="mt-8 space-y-8">{kind === 'privacy' ? <PrivacyPolicy /> : kind === 'terms' ? <TermsOfService /> : <CookieDisclosure />}</div>
    </article>
  </div></div>;
}
