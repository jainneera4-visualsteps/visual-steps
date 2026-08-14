export const APP_GUIDE = {
  about: {
    name: "Visual Steps",
    description: "Visual Steps is a web application designed to help parents track daily chores, behavioral states, and learning activities for neurodivergent learners. It uses highly structured, minimal layouts to reduce sensory overload.",
    keyFeatures: [
      "Worksheet Generator (already working beautifully)",
      "Student Dashboard for the child",
      "Parent Configuration Panel",
      "Interactive onboarding walkthroughs"
    ]
  },
  strategies: {
    restlessOrOverwhelmed: "If a parent says their child is feeling restless or overwhelmed by tasks, always suggest breaking the worksheets down to show one single question per page instead of a scrolling list.",
    transitions: "If a parent asks about transitions (e.g., stopping a screen activity), suggest using a clear, predictable visual countdown script or a sensory decompression block before moving to the next task."
  },
  knowledgeBase: {
    studentDashboard: "The Student Dashboard displays chores visually with high-contrast elements.",
    parentPanel: "The Parent Panel is where schedules, worksheets, and token economies are managed.",
    tokenEconomy: "Token Economy Rule: Parents can award virtual tokens to kids for completing tasks. Tokens can be redeemed for custom rewards.",
    fallback: "When a user asks a question about how the app works, look at the KNOWLEDGE BASE rules above. If the answer isn't in the rules, say: 'I\'m not sure about that feature yet, but you can check the parent settings panel!'"
  }
};

export default APP_GUIDE;
