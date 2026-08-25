import registry from '../../feature-registry.json';

export type FeatureSurface = 'home' | 'about' | 'onboarding' | 'chatbot' | 'pricing' | 'guest' | 'help';
export type FeaturePlan = 'starter' | 'family' | 'family-plus';

export interface ProductFeatureUpdate {
  updatedOn: string;
  title: string;
  summary: string;
  details: string;
  familyImpact: string;
}

export interface ProductFeature {
  id: string;
  title: string;
  summary: string;
  details: string;
  familyImpact: string;
  guideParagraphs: string[];
  help: string;
  screenshot: { src: string; alt: string; caption: string };
  introducedOn: string;
  updates?: ProductFeatureUpdate[];
  plan: FeaturePlan;
  icon: string;
  routes: string[];
  surfaces: FeatureSurface[];
}

export const productFeatures = registry as ProductFeature[];
export const NEW_FEATURE_DAYS = 30;

export function isFeatureNew(feature: ProductFeature, now = new Date()): boolean {
  const introduced = new Date(`${feature.introducedOn}T00:00:00Z`).getTime();
  const age = now.getTime() - introduced;
  return age >= 0 && age < NEW_FEATURE_DAYS * 24 * 60 * 60 * 1000;
}

export function isIntroducedRecently(introducedOn: string, now = new Date()): boolean {
  return isFeatureNew({ introducedOn } as ProductFeature, now);
}

export function featuresForSurface(surface: FeatureSurface): ProductFeature[] {
  return productFeatures.filter((feature) => feature.surfaces.includes(surface));
}

export function newFeatures(now = new Date()): ProductFeature[] {
  return productFeatures.filter((feature) => isFeatureNew(feature, now));
}
