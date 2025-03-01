const fs = require('fs');
const path = require('path');

// Path to the package.json file
const packageJsonPath = path.join(__dirname, 'package.json');

// Get production AI key from command line arguments
if (process.argv.length < 3) {
  console.error('Error: Production AI key not provided');
  console.error('Usage: node updateAiKey.js <production-ai-key>');
  process.exit(1);
}
const prodAiKey = process.argv[2];


// Read the package.json file
fs.readFile(packageJsonPath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading package.json:', err);
    return;
  }

  // Parse the JSON data
  let packageJson;
  try {
    packageJson = JSON.parse(data);
  } catch (parseErr) {
    console.error('Error parsing package.json:', parseErr);
    return;
  }

  // Update the aiKey
  packageJson.aiKey = prodAiKey;

  // Convert the JSON object back to a string
  const updatedPackageJson = JSON.stringify(packageJson, null, 2);

  // Write the updated package.json back to the file
  fs.writeFile(packageJsonPath, updatedPackageJson, 'utf8', (writeErr) => {
    if (writeErr) {
      console.error('Error writing package.json:', writeErr);
      return;
    }

    console.log('Successfully updated aiKey in package.json');
  });
});