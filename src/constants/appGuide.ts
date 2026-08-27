import { featuresForSurface } from '../content/featureRegistry';

const currentFeatures = featuresForSurface('help');

export const APP_GUIDE = {
  about: {
    name: "Visual Steps",
    description: "Visual Steps helps parents and caregivers organize meaningful routines, learning, progress, and encouragement for autistic people of all ages.",
    keyFeatures: currentFeatures.map(feature => `${feature.title}: ${feature.summary}`),
  },
  strategies: {
    restlessOrOverwhelmed: "If a child / adult feels restless or overwhelmed, suggest reducing the visible work, offering a pause, and presenting one clear next step without making a clinical judgment.",
    transitions: "If a parent asks about transitions (e.g., stopping a screen activity), suggest using a clear, predictable visual countdown script or a sensory decompression block before moving to the next task."
  },
  knowledgeBase: {
    features: currentFeatures.map(feature => ({ id: feature.id, help: feature.help, familyImpact: feature.familyImpact })),
    learnerDashboard: "The learner dashboard presents assigned work, verification status, earned rewards, and recent positive recognition in a focused child / adult view.",
    parentWorkspace: "The parent workspace manages profiles, activities, verification, rewards, learning resources, reports, sharing, and family-controlled data review.",
    fallback: "If the exact answer is not available in the current Visual Steps guide, explain that clearly and direct the parent or caregiver to the closest relevant menu without inventing a field or button."
  }
};

export default APP_GUIDE;
