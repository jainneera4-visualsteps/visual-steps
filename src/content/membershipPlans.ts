import type { FeaturePlan } from './featureRegistry';

export type MembershipPlan = { name:string; price:string; suffix?:string; description:string; plan:FeaturePlan; features:string[]; action:string; href?:string; featured?:boolean; status:'Available now'|'Coming soon' };

export const membershipPlans: MembershipPlan[] = [
  { name:'Starter', price:'Free', description:'A simple way for families to begin building calmer, more predictable routines.', plan:'starter' as FeaturePlan, features:['One parent account','Kid-friendly daily dashboard','Basic progress history'], action:'Start free', href:'/signup', status:'Available now' },
  { name:'Family', price:'$9', suffix:'/ month', description:'More personalization and planning support for families using Visual Steps every day.', plan:'family' as FeaturePlan, features:['Everything in Starter','Multiple child profiles','AI quizzes, worksheets and social stories','Expanded reports and printable resources'], action:'Coming soon', featured:true, status:'Coming soon' },
  { name:'Family Plus', price:'$19', suffix:'/ month', description:'Designed for families who want additional sharing, storage and support tools.', plan:'family-plus' as FeaturePlan, features:['Everything in Family','More AI generations','Priority support and future family collaboration'], action:'Coming soon', status:'Coming soon' },
];
