// GitHub App Installation Lister
// This script lists all installations of a GitHub App using just:
// - App ID
// - Client ID
// - Private key PEM file

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

async function listInstallations() {
  try {
    console.log('🔑 Authenticating as GitHub App...');
    
    // Initialize Octokit with app authentication (without installation ID)
    const appOctokit = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: process.env.APP_ID,
        clientId: process.env.CLIENT_ID,
        privateKey: privateKey,
      },
    });

    console.log('✅ Successfully authenticated as GitHub App!');
    
    // Fetch information about the GitHub App itself to get its configured permissions
    try {
      console.log('🔍 Fetching GitHub App information...');
      const { data: appInfo } = await appOctokit.apps.getAuthenticated();
      
      console.log('\n=== GITHUB APP INFORMATION ===');
      console.log(`App Name: ${appInfo.name}`);
      console.log(`App ID: ${appInfo.id}`);
      console.log(`Description: ${appInfo.description || 'No description'}`);
      console.log(`Created At: ${new Date(appInfo.created_at).toLocaleString()}`);
      console.log(`Updated At: ${new Date(appInfo.updated_at).toLocaleString()}`);
      
      // Display permissions categorized
      console.log('\n=== APP CONFIGURED PERMISSIONS ===');
      if (appInfo.permissions) {
        // Repository permissions
        console.log('\nRepository Permissions:');
        const repoPermissions = [
          'actions', 'administration', 'checks', 'code', 'codespaces', 'commit_comment', 'contents', 'deployments', 'discussions',
          'environments', 'issues', 'merge_queues', 'metadata', 'packages', 'pages', 'pull_requests', 'repository_hooks',
          'repository_projects', 'secret_scanning_alerts', 'secrets', 'security_events', 'single_file', 'statuses', 'vulnerability_alerts',
          'workflows', 'dependabot_secrets'
        ];
        
        const activeRepoPerms = repoPermissions.filter(perm => appInfo.permissions[perm])
          .map(perm => `${perm}: ${appInfo.permissions[perm]}`);
        
        if (activeRepoPerms.length > 0) {
          activeRepoPerms.forEach(perm => console.log(`  - ${perm}`));
        } else {
          console.log('  No repository permissions configured.');
        }
        
        // Organization permissions
        console.log('\nOrganization Permissions:');
        const orgPermissions = [
          'administration', 'blocking', 'custom_roles', 'events', 'domain_verified_domains', 'members', 'organization_administration',
          'organization_custom_roles', 'organization_announcement_banners', 'organization_hooks', 'organization_personal_access_tokens',
          'organization_plan', 'organization_packages', 'organization_projects', 'organization_secrets', 'organization_self_hosted_runners',
          'organization_user_blocking', 'team_discussions', 'write_packages'
        ];
        
        const activeOrgPerms = orgPermissions.filter(perm => appInfo.permissions[perm])
          .map(perm => `${perm}: ${appInfo.permissions[perm]}`);
        
        if (activeOrgPerms.length > 0) {
          activeOrgPerms.forEach(perm => console.log(`  - ${perm}`));
        } else {
          console.log('  No organization permissions configured.');
        }
        
        // Account permissions
        console.log('\nAccount Permissions:');
        const accountPermissions = [
          'email', 'profile', 'codespaces'
        ];
        
        const activeAccountPerms = accountPermissions.filter(perm => appInfo.permissions[perm])
          .map(perm => `${perm}: ${appInfo.permissions[perm]}`);
        
        if (activeAccountPerms.length > 0) {
          activeAccountPerms.forEach(perm => console.log(`  - ${perm}`));
        } else {
          console.log('  No account permissions configured.');
        }
        
        // Other permissions that don't fit categories above
        const allConfiguredPerms = Object.keys(appInfo.permissions);
        const categorizedPerms = [...repoPermissions, ...orgPermissions, ...accountPermissions];
        const uncategorizedPerms = allConfiguredPerms.filter(perm => !categorizedPerms.includes(perm));
        
        if (uncategorizedPerms.length > 0) {
          console.log('\nOther Permissions:');
          uncategorizedPerms.forEach(perm => {
            console.log(`  - ${perm}: ${appInfo.permissions[perm]}`);
          });
        }
      }
      
      console.log('\n=== APP EVENTS ===');
      if (appInfo.events && appInfo.events.length > 0) {
        appInfo.events.forEach(event => console.log(`  - ${event}`));
      } else {
        console.log('  No events subscribed to.');
      }
      
      console.log('\n' + '-'.repeat(80));
    } catch (appError) {
      console.error(`❌ Error fetching GitHub App information: ${appError.message}`);
      console.error('Continuing with installation listing...');
    }
    
    // List installations of this GitHub App
    console.log('🔍 Fetching installations for this GitHub App...');
    const { data: installations } = await appOctokit.apps.listInstallations();
    
    if (installations.length === 0) {
      console.log('⚠️ No installations found. The GitHub App needs to be installed on at least one account or organization.');
      return;
    }
    
    console.log('\n=== INSTALLATION IDS ===');
    console.log('Total installations found:', installations.length);
    console.log('\nInstallation details:');
    
    // Process each installation one by one
    for (let i = 0; i < installations.length; i++) {
      const installation = installations[i];
      console.log(`\n${i+1}. Installation ID: ${installation.id}`);
      
      // Display basic information with formatting
      console.log('\n   Basic Information:');
      console.log(`   Account: ${installation.account.login}`);
      console.log(`   Account Type: ${installation.account.type}`);
      console.log(`   Installed At: ${new Date(installation.created_at).toLocaleString()}`);
      console.log(`   Updated At: ${new Date(installation.updated_at).toLocaleString()}`);
      console.log(`   Installation URL: ${installation.html_url}`);
      
      // Display status information
      console.log('\n   Status Information:');
      console.log(`   Access Tokens URL: ${installation.access_tokens_url}`);
      console.log(`   Repositories URL: ${installation.repositories_url}`);
      console.log(`   App ID: ${installation.app_id}`);
      console.log(`   Target Type: ${installation.target_type}`);
      console.log(`   Target ID: ${installation.target_id}`);
      console.log(`   Repository Selection: ${installation.repository_selection || 'Not specified'}`);
      console.log(`   Single File Name: ${installation.single_file_name || 'Not specified'}`);
      
      // Display permissions
      console.log('\n   Permissions:');
      console.log('   ' + JSON.stringify(installation.permissions, null, 2).replace(/\n/g, '\n   '));
      
      // Display events
      if (installation.events && installation.events.length > 0) {
        console.log('\n   Events:');
        console.log('   ' + JSON.stringify(installation.events, null, 2).replace(/\n/g, '\n   '));
      }
      
      // Display installation suspend information
      if (installation.suspended_at) {
        console.log('\n   ⚠️ SUSPENSION INFORMATION:');
        console.log(`   Suspended At: ${new Date(installation.suspended_at).toLocaleString()}`);
        console.log(`   Suspension Reason: ${installation.suspended_by?.login || 'Unknown'}`);
      }
      
      // NEW: Fetch and display repositories for this installation
      console.log('\n   📦 Fetching repositories for this installation...');
      
      try {
        // Create a new Octokit instance with this specific installation ID
        const installationOctokit = new Octokit({
          authStrategy: createAppAuth,
          auth: {
            appId: process.env.APP_ID,
            privateKey: privateKey,
            installationId: installation.id,
          },
        });
        
        // Fetch repositories accessible to this installation
        // Fetch all repositories accessible to this installation using pagination
        const accessibleRepos = await installationOctokit.paginate(installationOctokit.apps.listReposAccessibleToInstallation);
        
        console.log(`   Repositories accessible to this installation: ${accessibleRepos.length}`);
        
        if (accessibleRepos.length > 0) {
          console.log('\n   Repository List:');
          accessibleRepos.forEach((repo, repoIndex) => {
            console.log(`   ${repoIndex + 1}. ${repo.full_name}`);
            console.log(`      Description: ${repo.description || 'No description'}`);
            console.log(`      Visibility: ${repo.visibility || repo.private ? 'private' : 'public'}`);
            console.log(`      URL: ${repo.html_url}`);
            console.log(`      Created: ${new Date(repo.created_at).toLocaleString()}`); 
            console.log(`      Last Updated: ${new Date(repo.updated_at).toLocaleString()}`);
            console.log(`      Default Branch: ${repo.default_branch}`);
            console.log('      ---');
          });
        } else {
          console.log('   No repositories accessible to this installation.');
        }
      } catch (repoError) {
        console.log(`   ⚠️ Error fetching repositories: ${repoError.message}`);
        
        if (repoError.message.includes('Resource not accessible by integration')) {
          console.log('   This may be due to permission issues or the installation being suspended.');
        }
      }
      
      // Display the raw JSON for the entire installation object
      console.log('\n   Complete Installation Object (JSON):');
      console.log('   ' + JSON.stringify(installation, null, 2).replace(/\n/g, '\n   '));
      
      console.log('\n' + '-'.repeat(80));
    }
    
    console.log('\n=== CONFIGURATION INFO ===');
    console.log('To use an installation ID in your .env file:');
    console.log('INSTALLATION_ID=<installation_id>');
    
    console.log('\n✅ Installation listing completed successfully!');
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
listInstallations();
