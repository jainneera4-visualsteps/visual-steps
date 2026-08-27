import type { FeaturePlan } from './featureRegistry';

export type MembershipPlan = { name:string; price:string; suffix?:string; description:string; plan:FeaturePlan; features:string[]; action:string; href:string; featured?:boolean; status:'Available now' };

export const membershipPlans: MembershipPlan[] = [
  { name:'Starter', price:'Free', description:'Use the current Visual Steps tools to build clearer routines, personalized learning, meaningful rewards, and practical progress plans.', plan:'starter' as FeaturePlan, features:['Parent and learner dashboards','Visual activities and parent verification','Quizzes, worksheets, and social stories','Progress reports and meaningful rewards'], action:'Start free', href:'/signup', featured:true, status:'Available now' },
];
