const fs = require('fs');
const path = require('path');

const files = [
  'src/components/Layout.tsx',
  'src/pages/SavedWorksheets.tsx',
  'src/pages/AssignedActivities.tsx',
  'src/pages/AddEditKid.tsx',
  'src/pages/Home.tsx',
  'src/pages/Dashboard.tsx',
  'src/pages/KidsDashboard.tsx',
  'src/pages/CreateSocialStory.tsx',
  'src/pages/Signup.tsx',
  'src/pages/ForgotPassword.tsx',
  'src/pages/SocialStories.tsx',
  'src/pages/WorksheetGenerator.tsx',
  'src/pages/Profile.tsx',
  'src/pages/ViewSocialStory.tsx',
  'src/context/AuthContext.tsx'
];

for (const file of files) {
  const filePath = path.join(process.cwd(), file);
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('apiFetch')) continue;
  
  // Replace fetch( with apiFetch(
  content = content.replace(/fetch\(/g, 'apiFetch(');
  
  // Add import statement at the top
  content = `import { apiFetch } from '../utils/api';\n` + content;
  
  fs.writeFileSync(filePath, content);
}
