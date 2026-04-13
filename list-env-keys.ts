console.log('Environment Variable Names:');
Object.keys(process.env).forEach(key => {
  if (key.includes('API') || key.includes('KEY') || key.includes('GEMINI') || key.includes('GOOGLE')) {
    const value = process.env[key] || '';
    const masked = value.length > 4 ? value.substring(0, 4) + '...' : value;
    console.log(`- ${key}: ${value ? 'set (length ' + value.length + ', starts with: ' + masked + ')' : 'not set'}`);
  }
});
