export type ActivityWorkflowStatus = 'pending' | 'awaiting_verification' | 'completed';

export const getChildSubmissionStatus = (requiresVerification: boolean): ActivityWorkflowStatus => (
  requiresVerification ? 'awaiting_verification' : 'completed'
);

export const grantsRewardForTransition = (
  previousStatus: ActivityWorkflowStatus,
  nextStatus: ActivityWorkflowStatus,
): boolean => previousStatus !== 'completed' && nextStatus === 'completed';

