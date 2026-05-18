# Pattaya Rent A Car - CMS Dashboard

This is the standalone administrative dashboard for managing content on `pattayarentacar.com`.

## Setup Instructions

### 1. Firebase Configuration
Ensure your `firebase-applet-config.json` is correctly populated with the credentials from your Firebase project.

### 2. Hosting Setup
This app is designed to run on a separate Firebase Hosting site.
```bash
firebase hosting:sites:create admin-pattayarentacar
```
Then map your custom domain `admin.pattayarentacar.com` in the Firebase Console.

### 3. Admin User Creation
1. Go to Firebase Console > Authentication and create an email/password user for yourself.
2. To grant admin access, you can either:
   - Use the Firebase CLI to set a custom claim: `firebase functions:shell` then `admin.auth().setCustomUserClaims('UID', {admin: true})`
   - Or manually create a document in the `admin_users` collection with ID matching your `UID` and field `role: "admin"`.

### 4. Development & Build
```bash
# Install dependencies
npm install

# Run locally
npm run dev

# Build for production
npm run build

# Deploy to Hosting
firebase deploy --only hosting:admin-pattayarentacar

# Deploy Security Rules
firebase deploy --only firestore:rules,storage:rules

# Deploy Cloud Functions
firebase deploy --only functions
```

## Features
- **Blog Management**: Multi-language support with TipTap rich text editor.
- **Fleet Management**: Manage car specs, availability and image galleries.
- **Location Pages**: SEO-optimized landing pages for 13 pre-defined area clusters.
- **FAQ Management**: Grouped QA sections with easy ordering.
- **Media Library**: Direct access to Firebase Storage folders.
- **Deploy Tracking**: Real-time monitoring of site rebuilds triggered by content changes.

## Security
- All admin actions are protected by Firestore security rules.
- Public site only sees "published" documents.
- Admin role is verified server-side.
