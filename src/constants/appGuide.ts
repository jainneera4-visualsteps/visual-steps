export const APP_GUIDE = {
  about: {
    name: "Visual Steps",
    description: "Visual Steps helps families manage child profiles, assigned activities, social stories, quizzes, worksheets, rewards, and progress reporting through a parent-facing dashboard and a child-facing dashboard.",
    keyFeatures: [
      "Dashboard",
      "Add Child / Edit Profile",
      "Assigned Activities",
      "Social Stories",
      "Quiz Generator and Saved Quizzes",
      "Worksheet Generator and Saved Worksheets",
      "Progress Report and Summary Report",
      "Kids Dashboard"
    ]
  },
  strategies: {
    restlessOrOverwhelmed: "If a parent says their child is overwhelmed, guide them to reduce load using Max Activities in Profile Details and assign a shorter list from the Activities tab.",
    transitions: "If a parent asks about transitions, guide them to set predictable Start Time and End Time in the child profile and use simple, consistent activity sequencing in Assigned Activities."
  },
  knowledgeBase: {
    screens: [
      { route: "/", title: "Home / Login", purpose: "Public landing page with Parent Login and Kid Login tabs, and marketing sections about Visual Steps." },
      { route: "/signup", title: "Sign Up", purpose: "Public account creation page for new parents." },
      { route: "/forgot-password", title: "Reset Password", purpose: "Public password recovery flow using a security question." },
      { route: "/about", title: "About Visual Steps", purpose: "Public marketing page describing app features like Parental Planning Tools, Visual Step-by-Step Learning, and AI-Powered Personalization." },
      { route: "/dashboard", title: "Dashboard", purpose: "Parent Dashboard home for selecting a child, messaging, and opening Activities." },
      { route: "/profile", title: "Account Settings", purpose: "Parent account page for Profile Information, Security Question, Change Password, and Parent Messaging retention settings." },
      { route: "/add-kid", title: "New Profile", purpose: "Create a new child profile with Profile Details." },
      { route: "/edit-kid/:id", title: "Edit Profile", purpose: "Edit an existing child profile's Profile Details." },
      { route: "/assigned-activities/:kidId", title: "Assigned Activities", purpose: "Visual Schedules and Token Economy management with Activities, Completed, History, and Rewards tabs." },
      { route: "/social-stories", title: "Social Stories", purpose: "List of saved social stories with New Story, View, Print, Edit, and Delete actions." },
      { route: "/social-stories/create", title: "Create Social Story", purpose: "AI Story Assistant to generate and edit a new social story." },
      { route: "/social-stories/edit/:id", title: "Edit Social Story", purpose: "Edit an existing social story's pages and settings." },
      { route: "/social-stories/view/:id", title: "View Social Story", purpose: "Standalone reading view of a social story with Listen and Print controls." },
      { route: "/quiz-generator", title: "Quiz Generator", purpose: "Generate a new quiz using AI based on Subject, Topic, Grade Level, Question Type, and Difficulty." },
      { route: "/saved-quizzes", title: "Saved Quizzes", purpose: "List of saved quizzes with New Quiz, View, Edit, and Delete actions." },
      { route: "/edit-quiz/:id", title: "Edit Quiz", purpose: "Edit questions and answers of an existing saved quiz." },
      { route: "/play-quiz/:id", title: "Play Quiz", purpose: "Interactive quiz-taking view with Listen Question and feedback per question." },
      { route: "/worksheet-generator", title: "Worksheet Generator", purpose: "Generate a new worksheet using AI based on Subject, Topic, Grade Level, Worksheet Type, and Difficulty." },
      { route: "/saved-worksheets", title: "Saved Worksheets", purpose: "List of saved worksheets with New Worksheet, View, Edit, Print, and Delete actions." },
      { route: "/activity-library", title: "Activity Library", purpose: "Reusable activity templates parents can create and assign to children." },
      { route: "/progress-report/:kidId", title: "Progress Report", purpose: "Detailed analytics on activities, reward purchases, and quiz results for a child." },
      { route: "/summary-report/:kidId", title: "Summary Report", purpose: "Consolidated same-day activity summary table across quizzes, worksheets, social stories, and parent bonuses." },
      { route: "/kids-dashboard/:kidId", title: "Kids Dashboard", purpose: "Child-facing dashboard with 📝 To Be Done, ✅ Completed, and 🎁 Rewards tabs." }
    ],
    canonicalTerms: [
      "Use Parent Dashboard as the canonical parent workspace term.",
      "Use Child Profile for profile setup and edits.",
      "Use Visual Schedules for Assigned Activities planning.",
      "Use Token Economy for Rewards tab and reward item management."
    ],
    routes: {
      parentDashboard: "/dashboard",
      addChildProfile: "/add-kid",
      editChildProfile: "/edit-kid/:id",
      assignedActivities: "/assigned-activities/:kidId",
      socialStoriesList: "/social-stories",
      createSocialStory: "/social-stories/create",
      editSocialStory: "/social-stories/edit/:id",
      quizGenerator: "/quiz-generator",
      savedQuizzes: "/saved-quizzes",
      worksheetGenerator: "/worksheet-generator",
      savedWorksheets: "/saved-worksheets",
      progressReport: "/progress-report/:kidId",
      summaryReport: "/summary-report/:kidId",
      kidsDashboard: "/kids-dashboard/:kidId"
    },
    navigationLabels: {
      topNavigation: ["Dashboard", "Activities", "Analytics", "About", "Sign out"],
      activitiesDropdown: ["Quizzes", "Social Stories", "Worksheets"],
      analyticsDropdown: ["Progress Report", "Summary Report"],
      dashboardActions: ["Select Child", "Add Child", "Activities"],
      assignedActivitiesTabs: ["Activities", "Completed", "History", "Rewards"],
      assignedActivitiesViewToggle: ["List", "Calendar"],
      kidsDashboardTabs: ["📝 To Be Done", "✅ Completed", "🎁 Rewards"]
    },
    parentFeatures: {
      parentDashboard: {
        route: "/dashboard",
        menus: ["Dashboard", "Activities", "Analytics", "About"],
        buttons: ["Select Child", "Add Child", "Activities"],
        steps: [
          "1. Click Dashboard in the top navigation.",
          "2. Use Select Child to choose the child profile.",
          "3. Use Add Child to open New Profile.",
          "4. In the child card, click Activities to open Assigned Activities."
        ]
      },
      childProfiles: {
        routes: ["/add-kid", "/edit-kid/:id"],
        screens: ["New Profile", "Edit Profile", "Profile Details", "Edit Profile Details"],
        fields: ["Name", "Date of Birth", "Grade Level", "Kid Code", "Start Time", "End Time", "Max Activities", "Reward Qty", "Reward Type", "Dashboard Theme", "Timezone"],
        buttons: ["Create Profile", "Save Changes", "Cancel", "Upload"],
        steps: [
          "1. On Dashboard, click Add Child.",
          "2. On New Profile, complete Profile Details fields.",
          "3. Set Start Time, End Time, and Max Activities.",
          "4. Set Reward Qty and choose Reward Type.",
          "5. Choose Dashboard Theme.",
          "6. Fill optional Additional Details and Timezone as needed.",
          "7. Optionally enable Allow child to print activity steps.",
          "8. Click Create Profile, or Save Changes when editing."
        ]
      },
      visualSchedules: {
        route: "/assigned-activities/:kidId",
        tabs: ["Activities", "Completed", "History", "Rewards"],
        viewToggle: ["List", "Calendar"],
        actions: ["Add Activity", "Add First Activity", "View Activity Details", "Edit Activity Details", "Delete Activity"],
        calendarViews: ["Activities Calendar", "Completed Activities Calendar", "Activity History Calendar"],
        steps: [
          "1. Open Dashboard, then click Activities on the child card.",
          "2. In Assigned Activities, switch between Activities, Completed, History, and Rewards.",
          "3. In Activities, click Add Activity to create a schedule item.",
          "4. Use List or Calendar to change the schedule view.",
          "5. In List view, use View Activity Details, Edit Activity Details, and Delete Activity as needed."
        ]
      },
      tokenEconomy: {
        route: "/assigned-activities/:kidId",
        tab: "Rewards",
        labels: ["Add Item", "New Reward Item", "Reward Details", "Item Name", "Cost ({reward type plural})", "Image URL (Optional)", "Available At (Optional)", "Select a place...", "+ Add new location...", "Active", "Save Changes"],
        steps: [
          "1. Open Assigned Activities and click the Rewards tab.",
          "2. Click Add Item to open New Reward Item.",
          "3. In Reward Details, fill Item Name and Cost ({reward type plural}).",
          "4. Optionally set Image URL (Optional) and Available At (Optional).",
          "5. Keep Active checked for visible rewards.",
          "6. Click Add Item for new rewards or Save Changes for edits."
        ]
      },
      socialStories: {
        routes: ["/social-stories", "/social-stories/create", "/social-stories/edit/:id"],
        menuPath: ["Activities", "Social Stories"],
        listActions: ["New Story", "View", "Print", "Edit", "Delete"],
        editorLabels: ["AI Story Assistant", "Select Kid", "Language", "Tone", "Number of Pages", "Sentences per Page", "What is the story about?", "Generate Story", "Story Details", "Story Title", "Page Text", "Image URL (Optional)", "AI Art", "Generate All Illustrations", "Add Page", "Save Story", "Update Story"],
        steps: [
          "1. Open Activities, then choose Social Stories.",
          "2. Click New Story.",
          "3. In AI Story Assistant, set Select Kid, Language, Tone, Number of Pages, and Sentences per Page.",
          "4. Enter What is the story about? and click Generate Story.",
          "5. In Story Details, complete Story Title, Page Text, and optional Image URL (Optional).",
          "6. Use AI Art or Generate All Illustrations for images.",
          "7. Click Save Story or Update Story."
        ]
      },
      quizzes: {
        routes: ["/saved-quizzes", "/quiz-generator", "/edit-quiz/:id"],
        menuPath: ["Activities", "Quizzes"],
        listLabels: ["Saved Quizzes", "New Quiz", "View", "Edit", "Delete"],
        generatorLabels: ["Select Kid", "Subject", "Describe a topic / Explain the problem", "Grade Level", "Question Type", "Difficulty", "Number of Questions", "Generate Quiz", "Save Quiz", "Saved Quizzes"],
        steps: [
          "1. Open Activities, then choose Quizzes.",
          "2. On Saved Quizzes, click New Quiz.",
          "3. In Quiz Generator, set Select Kid, Subject, Describe a topic / Explain the problem, Grade Level, Question Type, Difficulty, and Number of Questions.",
          "4. Click Generate Quiz.",
          "5. Review content and click Save Quiz.",
          "6. Return to Saved Quizzes to View, Edit, or Delete."
        ]
      },
      worksheets: {
        routes: ["/saved-worksheets", "/worksheet-generator"],
        menuPath: ["Activities", "Worksheets"],
        listLabels: ["Saved Worksheets", "New Worksheet", "View", "Edit", "Delete"],
        generatorLabels: ["Select Kid", "Subject", "Describe a topic / Explain the problem", "Grade Level", "Worksheet Type", "Difficulty", "Number of Worksheets", "Generate Worksheet", "Save Worksheet", "Show Answers", "Hide Answers", "Saved Worksheets"],
        steps: [
          "1. Open Activities, then choose Worksheets.",
          "2. On Saved Worksheets, click New Worksheet.",
          "3. In Worksheet Generator, set Select Kid, Subject, Describe a topic / Explain the problem, Grade Level, Worksheet Type, Difficulty, and Number of Worksheets.",
          "4. Click Generate Worksheet.",
          "5. Review output, optionally use Show Answers or Hide Answers, then click Save Worksheet.",
          "6. Return to Saved Worksheets to View, Edit, Print, or Delete."
        ]
      },
      analytics: {
        menuPath: ["Analytics", "Progress Report", "Summary Report"],
        routes: ["/progress-report/:kidId", "/summary-report/:kidId"],
        steps: [
          "1. Open Analytics in the top navigation.",
          "2. Click Progress Report to review activity, reward purchase, and quiz performance details.",
          "3. Click Summary Report to review consolidated trend summaries.",
          "4. Use filters and pagination controls on report pages to inspect date ranges and records."
        ]
      },
      accountSettings: {
        route: "/profile",
        screen: "Account Settings",
        sections: ["Profile Information", "Security Question", "Change Password", "Parent Messaging"],
        fields: ["Full Name", "Email", "Select a Question", "Answer", "New Password", "Days to Keep Messages"],
        buttons: ["Resend Welcome Email"],
        steps: [
          "1. Click the parent name in the top-right corner, then open Account Settings.",
          "2. Update Full Name and Email under Profile Information.",
          "3. Choose a Select a Question option and set an Answer under Security Question.",
          "4. Enter a New Password under Change Password if changing it.",
          "5. Set Days to Keep Messages under Parent Messaging to control message retention.",
          "6. Click Save to apply changes, or use Resend Welcome Email if needed."
        ]
      },
      quizzesPlayAndEdit: {
        routes: ["/play-quiz/:id", "/edit-quiz/:id"],
        playLabels: ["Listen Question", "Check Answer", "Next Question"],
        editLabels: ["Question {n}", "Save Changes"],
        steps: [
          "1. From Saved Quizzes, click View to open Play Quiz.",
          "2. Use Listen Question for audio playback, answer, then Check Answer.",
          "3. Move to the next question until the quiz is finished.",
          "4. From Saved Quizzes, click Edit to open Edit Quiz and update Question {n} entries.",
          "5. Click Save Changes to update the saved quiz."
        ]
      },
      socialStoryViewing: {
        routes: ["/social-stories/view/:id"],
        labels: ["Listen", "Stop", "Print"],
        steps: [
          "1. From Social Stories, click View to open the story.",
          "2. Use Listen to hear the story read aloud, or Stop to end playback.",
          "3. Use Print to print the story pages.",
          "4. Use the page navigation arrows to move between pages."
        ]
      },
      publicAuth: {
        routes: ["/", "/signup", "/forgot-password"],
        homeLabels: ["Parent Login", "Sign In", "Sign up", "1. Parent's Email", "3. Your Kid Code"],
        signupLabels: ["Create Account", "Already have an account?"],
        forgotPasswordLabels: ["Reset Password", "Security Question"],
        steps: [
          "1. On the Home page, choose Parent Login or the kid login tab.",
          "2. For parents, enter email and password, then click Sign In.",
          "3. New parents click Sign up to open the Sign Up page and create an account.",
          "4. Use Reset Password on the Forgot Password page if a password reset is needed, answering the Security Question."
        ]
      }
    },
    workflows: {
      parentDashboard: [
        "1. Click Dashboard in the top navigation.",
        "2. On Dashboard, use Select Child to choose a profile.",
        "3. Use Add Child to open New Profile.",
        "4. In the child card, use Activities to open Assigned Activities.",
        "5. Use Send Message to {child name} and Send message to communicate."
      ],
      childProfile: [
        "1. Open Dashboard and click Add Child.",
        "2. On New Profile, complete Profile Details.",
        "3. Fill Name, Date of Birth, Grade Level, and Kid Code.",
        "4. Set Start Time, End Time, and Max Activities.",
        "5. Set Reward Qty and choose Reward Type.",
        "6. Choose Dashboard Theme.",
        "7. Add optional fields in Additional Details including Therapies Needed, Hobbies, Interests, Strengths, Weaknesses, Sensory Issues, Behavioral Issues, and Timezone.",
        "8. Enable Allow child to print activity steps if needed.",
        "9. Click Create Profile.",
        "10. For updates, open Edit Profile and click Save Changes."
      ],
      visualSchedules: [
        "1. Open Dashboard and click Activities on a child card.",
        "2. In Assigned Activities, use tabs Activities, Completed, History, and Rewards.",
        "3. In Activities, click Add Activity to create a schedule item.",
        "4. Switch between List and Calendar views.",
        "5. Use Activities Calendar, Completed Activities Calendar, or Activity History Calendar in calendar mode.",
        "6. In list mode, use row actions such as View Activity Details, Edit Activity Details, and Delete Activity.",
        "7. Use Rewards to manage reward inventory tied to activity completion."
      ],
      tokenEconomy: [
        "1. Open Assigned Activities from Dashboard.",
        "2. Click the Rewards tab.",
        "3. Click Add Item to open New Reward Item.",
        "4. In Reward Details, complete Item Name and Cost ({reward type plural}).",
        "5. Optionally add Image URL (Optional) or use Upload.",
        "6. Optionally set Available At (Optional) with Select a place... or + Add new location...",
        "7. Set Active status using the Active checkbox.",
        "8. Click Add Item or Save Changes."
      ],
      socialStories: [
        "1. Open Activities in top navigation and choose Social Stories.",
        "2. On Social Stories, click New Story.",
        "3. In AI Story Assistant, set Select Kid, Language, Tone, Number of Pages, and Sentences per Page.",
        "4. Fill What is the story about? and click Generate Story.",
        "5. In Story Details, fill Story Title and each Page Text.",
        "6. Optionally fill Image URL (Optional) or use AI Art / Generate All Illustrations.",
        "7. Use Add Page for additional pages.",
        "8. Click Save Story or Update Story.",
        "9. In the Social Stories list, use View, Print, Edit, and Delete."
      ],
      quizzes: [
        "1. Open Activities in top navigation and choose Quizzes.",
        "2. In Saved Quizzes, click New Quiz.",
        "3. In Quiz Generator, set Select Kid, Subject, Describe a topic / Explain the problem, Grade Level, Question Type, Difficulty, and Number of Questions.",
        "4. Click Generate Quiz.",
        "5. Review generated questions and optional images.",
        "6. Click Save Quiz.",
        "7. Return to Saved Quizzes to View, Edit, or Delete saved entries."
      ],
      worksheets: [
        "1. Open Activities in top navigation and choose Worksheets.",
        "2. In Saved Worksheets, click New Worksheet.",
        "3. In Worksheet Generator, set Select Kid, Subject, Describe a topic / Explain the problem, Grade Level, Worksheet Type, Difficulty, and Number of Worksheets.",
        "4. Click Generate Worksheet.",
        "5. Review content and use Show Answers / Hide Answers if needed.",
        "6. Click Save Worksheet.",
        "7. Return to Saved Worksheets to View, Edit, Print, or Delete."
      ],
      analytics: [
        "1. Open Analytics in top navigation.",
        "2. Select Progress Report to review activities, purchases, and quiz results.",
        "3. Select Summary Report to review consolidated trend data.",
        "4. Use report duration and list controls to filter details."
      ],
      studentView: [
        "1. Open the child dashboard route after child login.",
        "2. Use tabs 📝 To Be Done, ✅ Completed, and 🎁 Rewards.",
        "3. In Rewards, review Available Rewards and purchase options.",
        "4. In To Be Done, open activity cards and complete steps."
      ]
    },
    studentDashboard: "Kids Dashboard shows child-facing tabs: 📝 To Be Done, ✅ Completed, and 🎁 Rewards, with activity cards and reward access.",
    parentDashboard: "Parent Dashboard is the central parent workspace for child selection, messaging, profile management, assigned activities, rewards, quizzes, worksheets, and analytics.",
    tokenEconomy: "Token Economy is managed in Assigned Activities under the Rewards tab using Add Item, Item Name, Cost, Available At (Optional), Active, and Save Changes/Add Item.",
    fallback: "If a requested feature is unavailable, provide numbered steps for the closest supported in-app flow using exact UI labels."
  }
};

export default APP_GUIDE;
