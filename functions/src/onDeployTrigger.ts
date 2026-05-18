import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

/**
 * Triggered when a new document is created in 'deploy_triggers' collection.
 * This function orchestrates the rebuild and redeploy of the static marketing site.
 */
export const onDeployTrigger = functions.firestore
  .document("deploy_triggers/{triggerId}")
  .onCreate(async (snap, context) => {
    const trigger = snap.data();
    const triggerRef = snap.ref;

    try {
      // 1. Update status to 'building'
      await triggerRef.update({
        status: "building",
        startedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`Starting build for ${trigger.changedCollection}/${trigger.changedDocId}`);

      // TODO: IMPLEMENT ACTUAL REBUILD LOGIC
      // 1. Fetch all published data from Firestore
      // 2. Feed data into a Static Site Generator (e.g., Next.js, Hugo, Jekyll)
      // 3. Generate HTML/CSS/JS files
      // 4. Upload files to Firebase Hosting using the Firebase Hosting REST API
      //    or a CI/CD integration.
      
      // Simulating build time
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // 2. Update status to 'deployed'
      await triggerRef.update({
        status: "deployed",
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log("Deploy successful");
    } catch (error) {
      console.error("Deploy failed:", error);
      
      // 3. Update status to 'failed'
      await triggerRef.update({
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });

/**
 * Manual trigger for rebuild (e.g., from settings change)
 */
export const manualDeploy = functions.https.onCall(async (data, context) => {
  // Verify admin role 
  if (!context.auth?.token.admin) {
    throw new functions.https.HttpsError("permission-denied", "Only admins can trigger deploys.");
  }

  const triggerRef = admin.firestore().collection("deploy_triggers").doc();
  await triggerRef.set({
    triggeredAt: admin.firestore.FieldValue.serverTimestamp(),
    triggeredBy: context.auth.token.email,
    status: "queued",
    changedCollection: "manual",
    changedDocId: "manual-rebuild"
  });

  return { triggerId: triggerRef.id };
});
