const fs = require('fs');
const path = require('path');

// Path to the package.json file
const packageJsonPath = path.join(__dirname, 'package.json');

// development AI key: a8c3bee3-1c76-4c07-9b4f-ea1e937816cb
// The production AI key. only replace in release pipeline.
const prodAiKey = '0c6ae279ed8443289764825290e4f9e2-1a736e7c-1324-4338-be46-fc2a58ae4d14-7255';

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