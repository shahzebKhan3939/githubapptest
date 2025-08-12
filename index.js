// GitHub App Authentication Test Script
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
const requiredEnvVars = ['APP_ID', 'INSTALLATION_ID', 'PRIVATE_KEY_PATH'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(`Error: Missing required environment variables: ${missingVars.join(', ')}`);
  console.error('Please update your .env file with the required values.');
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

async function main() {
  try {
    // Initialize Octokit with app authentication
    const octokit = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: process.env.APP_ID,
        privateKey: privateKey,
        installationId: process.env.INSTALLATION_ID,
      },
    });

    console.log('✅ Successfully authenticated with GitHub API!');
    
    // Make a test API call
    console.log('📊 Fetching data from GitHub API...');
    
    // If a target repo is specified, get its information
    if (process.env.TARGET_REPO) {
      const [owner, repo] = process.env.TARGET_REPO.split('/');
      if (owner && repo) {
        console.log(`🔍 Getting information about repository: ${process.env.TARGET_REPO}`);
        const { data: repoData } = await octokit.repos.get({
          owner,
          repo,
        });
        console.log('Repository Information:');
        console.log(`- Name: ${repoData.name}`);
        console.log(`- Full Name: ${repoData.full_name}`);
        console.log(`- Description: ${repoData.description || 'No description'}`);
        console.log(`- Stars: ${repoData.stargazers_count}`);
        console.log(`- Forks: ${repoData.forks_count}`);
        console.log(`- URL: ${repoData.html_url}`);
      }
    } else {
      // Default: List the installations of this GitHub App
      console.log('🔍 Listing installations for this GitHub App');
      const { data: installations } = await octokit.apps.listInstallations();
      console.log(`Found ${installations.length} installation(s):`);
      installations.forEach((installation, i) => {
        console.log(`${i+1}. Installation ID: ${installation.id}`);
        console.log(`   Account: ${installation.account.login}`);
        console.log(`   Type: ${installation.account.type}`);
        console.log(`   Installed at: ${installation.created_at}`);
        console.log('---');
      });
    }
    
    console.log('✅ GitHub API test completed successfully!');
  } catch (error) {
    console.error('❌ Error during GitHub API authentication or data fetch:');
    console.error(error);
    
    // Provide more helpful error messages for common issues
    if (error.message.includes('Bad credentials')) {
      console.error('\nPossible causes:');
      console.error('- Incorrect APP_ID');
      console.error('- Invalid private key');
      console.error('- Expired private key');
    } else if (error.message.includes('Not Found')) {
      console.error('\nPossible causes:');
      console.error('- Incorrect INSTALLATION_ID');
      console.error('- The app is not installed on the specified repository');
      console.error('- The specified repository does not exist');
    }
  }
}

main();
