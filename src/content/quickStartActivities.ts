export const quickStartNeeds = [
  { id: 'routine', label: 'Morning or bedtime routines' },
  { id: 'self-care', label: 'Self-care' },
  { id: 'communication', label: 'Communication' },
  { id: 'transitions', label: 'Transitions or changes' },
  { id: 'regulation', label: 'Emotional regulation' },
  { id: 'learning', label: 'School or learning' },
  { id: 'responsibility', label: 'Household responsibilities' },
  { id: 'going-out', label: 'Going somewhere' },
  { id: 'other', label: 'Something else' },
] as const;

export type QuickStartNeed = typeof quickStartNeeds[number]['id'];

export const quickStartActivities: Record<Exclude<QuickStartNeed, 'other'>, { title: string; category: string; description: string; steps: string[] }> = {
  routine: { title: 'Get ready for the day', category: 'Daily Living', description: 'Follow a short visual routine for getting ready.', steps: ['Get dressed', 'Brush teeth', 'Pack what is needed'] },
  'self-care': { title: 'Brush my teeth', category: 'Self-Care', description: 'Use clear steps to complete tooth brushing.', steps: ['Put toothpaste on the brush', 'Brush teeth', 'Rinse and put the brush away'] },
  communication: { title: 'Ask for help', category: 'Communication', description: 'Use a familiar way to let someone know help is needed.', steps: ['Pause and identify what is difficult', 'Use words, a gesture, or a communication tool', 'Show or tell the person what help is needed'] },
  transitions: { title: 'Get ready for a change', category: 'Transitions', description: 'Prepare for moving from the current activity to what comes next.', steps: ['Check what is happening next', 'Finish or pause the current activity', 'Take needed items to the next activity'] },
  regulation: { title: 'Take a calm break', category: 'Wellbeing', description: 'Use a familiar calming routine when a break would help.', steps: ['Move to the chosen calm space', 'Choose one calming support', 'Return when ready or ask for more help'] },
  learning: { title: 'Start homework', category: 'Learning', description: 'Prepare the space and begin one manageable learning task.', steps: ['Choose the first task', 'Gather the materials', 'Complete one small part'] },
  responsibility: { title: 'Tidy my activity space', category: 'Responsibility', description: 'Put used items back in their usual places.', steps: ['Collect the items that were used', 'Return each item to its place', 'Check that the space is ready'] },
  'going-out': { title: 'Prepare to go out', category: 'Community', description: 'Review what will happen and gather what is needed before leaving.', steps: ['Check where we are going', 'Get dressed for the trip', 'Bring any comfort or communication supports'] },
};
