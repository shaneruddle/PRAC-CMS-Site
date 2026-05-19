import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { dispatchGitHubBuild } from "./githubDispatch";

const githubPat = defineSecret("GITHUB_PAT");

// Ensure Admin SDK is initialized (idempotent)
if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Callable function invoked by the CMS "Deploy Now" button.
 * Requires an authenticated user.
 * Dispatches a cms_publish event to the PRAC-Marketing-Site repo.
 */
export const manualDeploy = onCall(
  {
    region: "asia-southeast1",
    secrets: [githubPat],
  },
  async (request) => {
    // Require authentication
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be logged in to trigger a deploy."
      );
    }

    const uid = request.auth.uid;
    const email = request.auth.token.email ?? uid;

    logger.info(`[manualDeploy] Triggered by user`, { uid, email });

    const pat = githubPat.value();
    if (!pat) {
      logger.error("[manualDeploy] GITHUB_PAT secret is not set");
      throw new HttpsError(
        "internal",
        "Server configuration error: missing GitHub PAT."
      );
    }

    const result = await dispatchGitHubBuild(
      {
        source: "manual",
        triggeredBy: email,
      },
      pat
    );

    if (!result.success) {
      logger.error("[manualDeploy] Dispatch failed", { error: result.error });
      throw new HttpsError(
        "internal",
        `Deploy dispatch failed: ${result.error}`
      );
    }

    logger.info("[manualDeploy] Dispatch succeeded", { docId: result.docId });
    return { success: true, docId: result.docId };
  }
);
