# GitHub App API Test

A simple script to verify GitHub App authentication and make API calls.

## Setup

1. Make sure you have Node.js installed
2. Update the `.env` file with your GitHub App credentials:
   - `APP_ID`: Found on your GitHub App's settings page
   - `INSTALLATION_ID`: Obtained when the app is installed on a repository/organization
   - `PRIVATE_KEY_PATH`: Path to your private key file (default: ./devex-prod.2025-07-31.private-key.pem)
   - `TARGET_REPO`: (Optional) Repository to fetch information about (format: owner/repo)

## Installation

```bash
npm install
```

## Running the script

```bash
npm start
```

## Expected Output

If authentication is successful, you'll see information about the repository (if specified) or a list of installations for your GitHub App.
