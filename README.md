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

## Running the scripts

### Default Script (Test Authentication)

This is the original script to verify that the GitHub App authentication is working correctly. It authenticates with a specific installation and, if a `TARGET_REPO` is set, it will fetch details for that repository.

**Requires from `.env`:**
- `APP_ID`
- `INSTALLATION_ID`
- `PRIVATE_KEY_PATH`
- `TARGET_REPO` (Optional)

```bash
npm start
```

### List App Installations

This command lists all installations of the GitHub App, along with the repositories accessible to each installation.

**Requires from `.env`:**
- `APP_ID`
- `CLIENT_ID`
- `PRIVATE_KEY_PATH`

```bash
npm run list-installations
```

### List Repository Permissions

This command lists detailed permissions for each repository accessible to the GitHub App across all its installations.

**Requires from `.env`:**
- `APP_ID`
- `CLIENT_ID`
- `PRIVATE_KEY_PATH`

```bash
npm run repository-permissions
```

## Expected Output

If authentication is successful, you'll see information about the repository (if specified) or a list of installations for your GitHub App.
