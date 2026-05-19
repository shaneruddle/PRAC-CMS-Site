/**
 * Cloud Functions entry point for PRAC CMS.
 *
 * Exports:
 *   onVehicleGuideWrite  - Firestore trigger on vehicle_guides/{slug}
 *   onLocationWrite      - Firestore trigger on locations/{slug}
 *   manualDeploy         - HTTPS callable for "Deploy Now" button in CMS
 *
 * All functions dispatch a repository_dispatch event to PRAC-Marketing-Site
 * via the GitHub API, triggering a marketing site rebuild.
 *
 * Secret required: GITHUB_PAT (Firebase secret, already provisioned)
 * Region: asia-southeast1
 */

export { onVehicleGuideWrite, onLocationWrite } from "./onDeployTrigger";
export { manualDeploy } from "./manualDeploy";
