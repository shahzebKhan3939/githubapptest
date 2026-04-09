// GitHub App Repository Permissions Lister
// This script lists permissions for each repository accessible via a GitHub App

import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// Get directory name in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Validate required environment variables
const requiredEnvVars = ['APP_ID', 'CLIENT_ID', 'PRIVATE_KEY_PATH'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(`Error: Missing required environment variables: ${missingVars.join(', ')}`);
  console.error('Please ensure your .env file contains:');
  console.error('APP_ID=your_app_id');
  console.error('CLIENT_ID=your_client_id');
  console.error('PRIVATE_KEY_PATH=path_to_your_private_key.pem');
  process.exit(1);
}

// Read the private key
let privateKey;
try {
  privateKey = fs.readFileSync(
    path.resolve(__dirname, process.env.PRIVATE_KEY_PATH),
    'utf8'
  );
} catch (error) {
  console.error(`Error reading private key file: ${error.message}`);
  process.exit(1);
}

/**
 * Helper function to convert permission levels to human-readable descriptions
 */
function getPermissionDescription(level) {
  switch (level) {
    case 'read':
      return 'Read-only access';
    case 'write':
      return 'Read and write access';
    case 'admin':
      return 'Admin access (full control)';
    case 'none':
      return 'No access';
    default:
      return `${level} access`;
  }
}

/**
 * Format permissions for better readability
 */
function formatPermissions(permissions) {
  const result = {};
  
  for (const [key, value] of Object.entries(permissions)) {
    result[key] = {
      level: value,
      description: getPermissionDescription(value)
    };
  }
  
  return result;
}

/**
 * Helper function to categorize permissions
 */
function categorizePermissions(permissions) {
  // Define permission categories
  const categories = {
    'Repository Content': ['contents', 'packages', 'pages', 'code', 'metadata'],
    'Pull Requests': ['pull_requests', 'merge_queues'],
    'Issues': ['issues', 'discussions'],
    'Checks & Actions': ['checks', 'actions', 'workflows', 'statuses'],
    'Security': ['vulnerability_alerts', 'security_events', 'secret_scanning_alerts', 'secrets', 'dependabot_secrets'],
    'Administration': ['administration', 'environments', 'repository_hooks'],
    'Other': []
  };
  
  const categorized = {};
  const allPermissions = Object.keys(permissions);
  
  // First, add permissions to their specific categories
  for (const category in categories) {
    categorized[category] = {};
    for (const perm of categories[category]) {
      if (permissions[perm]) {
        categorized[category][perm] = permissions[perm];
        // Remove from allPermissions to track what's left
        const index = allPermissions.indexOf(perm);
        if (index > -1) {
          allPermissions.splice(index, 1);
        }
      }
    }
    // Remove empty categories
    if (Object.keys(categorized[category]).length === 0) {
      delete categorized[category];
    }
  }
  
  // Add remaining permissions to "Other" category
  if (allPermissions.length > 0) {
    categorized['Other'] = {};
    for (const perm of allPermissions) {
      categorized['Other'][perm] = permissions[perm];
    }
  }
  
  return categorized;
}

/**
 * Main function to list repository permissions
 */
async function listRepositoryPermissions() {
  try {
    console.log('🔑 Authenticating as GitHub App...');
    
    // Initialize Octokit with app authentication
    const appOctokit = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: process.env.APP_ID,
        clientId: process.env.CLIENT_ID,
        privateKey: privateKey,
      },
    });

    console.log('✅ Successfully authenticated as GitHub App!');
    
    // Get GitHub App information
    try {
      console.log('🔍 Fetching GitHub App information...');
      const { data: appInfo } = await appOctokit.apps.getAuthenticated();
      
      console.log('\n=== GITHUB APP INFORMATION ===');
      console.log(`App Name: ${appInfo.name}`);
      console.log(`App ID: ${appInfo.id}`);
      console.log(`Description: ${appInfo.description || 'No description'}`);
    } catch (appError) {
      console.error(`❌ Error fetching GitHub App information: ${appError.message}`);
      console.error('Continuing with installation listing...');
    }
    
    // Fetch all installations
    console.log('🔍 Fetching installations for this GitHub App...');
    const { data: installations } = await appOctokit.apps.listInstallations();
    
    if (installations.length === 0) {
      console.log('⚠️ No installations found. The GitHub App needs to be installed on at least one account or organization.');
      return;
    }
    
    console.log(`\n=== FOUND ${installations.length} INSTALLATIONS ===`);
    
    // Process each installation
    for (let i = 0; i < installations.length; i++) {
      const installation = installations[i];
      console.log(`\n${i+1}. Installation: ${installation.account.login} (${installation.account.type})`);
      console.log(`   Installation ID: ${installation.id}`);
      
      try {
        // Create installation-specific Octokit instance
        const installationOctokit = new Octokit({
          authStrategy: createAppAuth,
          auth: {
            appId: process.env.APP_ID,
            privateKey: privateKey,
            installationId: installation.id,
          },
        });
        
        // Fetch repositories for this installation
        // Fetch all repositories for this installation using pagination
        const accessibleRepos = await installationOctokit.paginate(installationOctokit.apps.listReposAccessibleToInstallation);
        
        console.log(`   Total repositories: ${accessibleRepos.length}`);
        
        if (accessibleRepos.length === 0) {
          console.log('   No repositories accessible to this installation.');
          continue;
        }
        
        // Process each repository
        for (let j = 0; j < accessibleRepos.length; j++) {
          const repo = accessibleRepos[j];
          console.log(`\n   📁 Repository ${j+1}: ${repo.full_name}`);
          console.log(`      URL: ${repo.html_url}`);
          console.log(`      Visibility: ${repo.visibility || (repo.private ? 'private' : 'public')}`);
          
          try {
            // Get repository-specific permissions
            // First try to get repository-specific permissions
            console.log('      Fetching repository-specific permissions...');
            
            // Get the installation's access to this specific repository
            const { data: repoInstallation } = await appOctokit.apps.getRepoInstallation({
              owner: repo.owner.login,
              repo: repo.name
            });
            
            // Check if this installation has the same permissions as the app-wide permissions
            // or if there are repository-specific permissions
            console.log('\n      === REPOSITORY PERMISSIONS ===');
            
            // Format and display permissions in a categorized way
            const categorizedPermissions = categorizePermissions(repoInstallation.permissions);
            
            for (const category in categorizedPermissions) {
              console.log(`\n      ${category}:`);
              for (const [perm, level] of Object.entries(categorizedPermissions[category])) {
                console.log(`        - ${perm}: ${level} (${getPermissionDescription(level)})`);
              }
            }
            
            // Check if the repository has any specific permission settings that differ from installation defaults
            if (repoInstallation.repository_selection === 'selected') {
              console.log('\n      Note: This repository was specifically selected for this installation.');
            }
            
          } catch (repoPermError) {
            console.error(`      ❌ Error fetching repository permissions: ${repoPermError.message}`);
            console.log('      Using installation-wide permissions instead:');
            
            // Display installation-wide permissions as fallback
            const categorizedPermissions = categorizePermissions(installation.permissions);
            
            for (const category in categorizedPermissions) {
              console.log(`\n      ${category}:`);
              for (const [perm, level] of Object.entries(categorizedPermissions[category])) {
                console.log(`        - ${perm}: ${level} (${getPermissionDescription(level)})`);
              }
            }
          }
          
          console.log('\n      ---');
        }
        
      } catch (installationError) {
        console.error(`   ❌ Error processing installation: ${installationError.message}`);
      }
      
      console.log('\n' + '-'.repeat(80));
    }
    
    console.log('\n✅ Repository permissions listing completed successfully!');
  } catch (error) {
    console.error('❌ Error during GitHub App authentication or fetching installations:');
    console.error(error);
    
    if (error.message.includes('Bad credentials')) {
      console.error('\nPossible causes:');
      console.error('- Incorrect APP_ID');
      console.error('- Invalid CLIENT_ID');
      console.error('- Invalid or expired private key');
    } else if (error.message.includes('Resource not accessible by integration')) {
      console.error('\nPossible cause:');
      console.error('- The GitHub App may not have the necessary permissions');
    }
  }
}

// Execute the function
listRepositoryPermissions();
