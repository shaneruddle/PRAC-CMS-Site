import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

const GITHUB_OWNER = "shaneruddle";
const GITHUB_REPO = "PRAC-Marketing-Site";
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/dispatches`;

export interface DispatchOptions {
  source: string;        // e.g. "vehicle_guides/honda-city" or "manual"
  triggeredBy: string;   // e.g. "auto" or auth uid
}

export interface DispatchResult {
  success: boolean;
  error?: string;
  docId?: string;        // ID of the deploy_triggers record written
}

/**
 * Calls the GitHub repository_dispatch API to trigger a marketing site rebuild.
 * Writes a record to deploy_triggers with status 'queued' -> 'deployed'/'failed'.
 *
 * Returns the deploy_triggers document ID so callers can surface it if needed.
 */
export async function dispatchGitHubBuild(
  options: DispatchOptions,
  githubPat: string
): Promise<DispatchResult> {
  const { source, triggeredBy } = options;
  const timestamp = new Date().toISOString();

  // Derive changedCollection and changedDocId from source string
  // source format: "collection/slug" or "manual"
  const parts = source.split("/");
  const changedCollection = parts[0] ?? source;
  const changedDocId = parts[1] ?? source;

  // 1. Write 'queued' record to deploy_triggers
  const db = admin.firestore();
  const triggerRef = db.collection("deploy_triggers").doc();
  await triggerRef.set({
    triggeredAt: admin.firestore.FieldValue.serverTimestamp(),
    triggeredBy,
    changedCollection,
    changedDocId,
    status: "queued",
  });

  logger.info(`[dispatchGitHubBuild] Attempting dispatch`, {
    source,
    triggeredBy,
    docId: triggerRef.id,
    timestamp,
  });

  try {
    // 2. Call GitHub API
    const response = await fetch(GITHUB_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `token ${githubPat}`,
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        event_type: "cms_publish",
        client_payload: {
          triggered_by: triggeredBy,
          source,
          timestamp,
        },
      }),
    });

    if (!response.ok) {
      // GitHub returns 204 No Content on success — any other 2xx or non-2xx is unexpected
      const responseText = await response.text().catch(() => "(no body)");
      throw new Error(
        `GitHub API responded with ${response.status} ${response.statusText}: ${responseText}`
      );
    }

    // 3. Update record to 'deployed'
    await triggerRef.update({
      status: "deployed",
      dispatchedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info(`[dispatchGitHubBuild] Dispatch succeeded`, {
      source,
      triggeredBy,
      docId: triggerRef.id,
      httpStatus: response.status,
    });

    return { success: true, docId: triggerRef.id };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);

    logger.error(`[dispatchGitHubBuild] Dispatch failed`, {
      source,
      triggeredBy,
      docId: triggerRef.id,
      error: errorMsg,
    });

    // 4. Update record to 'failed'
    await triggerRef.update({
      status: "failed",
      error: errorMsg,
      dispatchedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: false, error: errorMsg, docId: triggerRef.id };
  }
}
