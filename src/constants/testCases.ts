export const testCases = [
  {
    id: 'TC-001',
    title: 'Parent Registration & Login',
    description: 'Verify that a new parent can register and log in successfully.',
    steps: [
      'Navigate to the registration page.',
      'Enter a unique email, name, password, and secret question/answer.',
      'Click "Create Account".',
      'Verify redirection to the Dashboard.',
      'Log out and log back in with the same credentials.'
    ],
    expected: 'User is successfully registered and can access the dashboard after login.'
  },
  {
    id: 'TC-002',
    title: 'Add a Kid Profile',
    description: 'Verify that a parent can add a child profile to their account.',
    steps: [
      'From the Dashboard, click "Add Kid".',
      'Enter kid name, age, gender, and reward preferences.',
      'Click "Save Profile".'
    ],
    expected: 'The kid profile is created and displayed on the parent dashboard.'
  },
  {
    id: 'TC-003',
    title: 'Assign a One-time Activity',
    description: 'Verify that a parent can assign a single activity to a kid.',
    steps: [
      'Click "Assigned Activities" on a kid card.',
      'Click "Add Activity".',
      'Enter activity type, category, and set due date to today.',
      'Add at least two steps with descriptions.',
      'Click "Save Activity".'
    ],
    expected: 'The activity appears in the kid\'s pending list for today.'
  },
  {
    id: 'TC-004',
    title: 'Assign a Repeating Activity',
    description: 'Verify that a repeating activity creates a new instance upon completion.',
    steps: [
      'Create a new activity.',
      'Set "Repeat Frequency" to "Daily".',
      'Set "Repeats Till" to 7 days from now.',
      'Save the activity.'
    ],
    expected: 'The activity is saved with repeat metadata.'
  },
  {
    id: 'TC-005',
    title: 'Kid Login & Dashboard Access',
    description: 'Verify that a kid can log in using the parent\'s email and their own name.',
    steps: [
      'Navigate to the login page.',
      'Select "Kid" role.',
      'Enter parent\'s email and kid\'s name.',
      'Click "Login".'
    ],
    expected: 'Kid is logged into their personalized dashboard with their assigned activities.'
  },
  {
    id: 'TC-006',
    title: 'Activity Completion (Kid)',
    description: 'Verify that a kid can complete an activity and earn rewards.',
    steps: [
      'On the Kid Dashboard, click an activity card.',
      'View the steps and click "Next Step" until finished.',
      'Click "Complete Activity".'
    ],
    expected: 'Activity status changes to "completed", reward balance increases, and if repeating, a new instance is created for tomorrow.'
  },
  {
    id: 'TC-007',
    title: 'Reward Purchase',
    description: 'Verify that a kid can buy items with their earned reward points.',
    steps: [
      'On the Kid Dashboard, navigate to the "Rewards" tab.',
      'Select a reward item that costs less than or equal to the current balance.',
      'Click "Buy".'
    ],
    expected: 'Reward balance decreases by the item cost, and the item is marked as purchased.'
  },
  {
    id: 'TC-008',
    title: 'Chatbot Assistance',
    description: 'Verify that the AI chatbot provides relevant information to the kid.',
    steps: [
      'Click the chatbot icon on the Kid Dashboard.',
      'Ask "What should I do today?".',
      'Ask "How many points do I have?".'
    ],
    expected: 'Chatbot correctly lists pending activities and current reward balance.'
  },
  {
    id: 'TC-009',
    title: 'Overdue Activity Auto-Move',
    description: 'Verify that activities not completed by the end of the day move to the next day.',
    steps: [
      'As a parent, assign an activity with yesterday\'s due date.',
      'Log in as the kid today.',
      'Check the activity list.'
    ],
    expected: 'The activity\'s due date is automatically updated to today.'
  }
];
