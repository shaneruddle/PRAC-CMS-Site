import { onDocumentWritten } from "firebase-functions/v2/firestore";
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
 * Determines whether a Firestore document write should trigger a marketing site rebuild.
 *
 * Dispatch conditions:
 *   - Newly created with status='published'
 *   - Status changed to 'published' (draft -> published)
 *   - Edit to an already-published doc (published -> published)
 *   - Unpublish of a published doc (published -> draft)
 *   - Delete of a published doc (published -> nothing)
 *
 * No dispatch for:
 *   - Draft saves (draft -> draft, new as draft)
 *   - Delete of a draft doc
 */
function shouldDispatch(
  before: admin.firestore.DocumentSnapshot | undefined,
  after: admin.firestore.DocumentSnapshot | undefined
): boolean {
  const beforePublished = before?.exists && before.data()?.status === "published";
  const afterPublished = after?.exists && after.data()?.status === "published";

  if (beforePublished && afterPublished) {
    // Edit to an already-published doc — dispatch on any field change
    return true;
  }
  if (beforePublished || afterPublished) {
    // One side is published: covers publish, unpublish, delete-of-published, create-as-published
    return true;
  }
  // Both draft/missing — no dispatch
  return false;
}

/**
 * Firestore trigger: fires when a vehicle_guides document is written.
 * Dispatches a cms_publish event to the marketing site repo when status transitions
 * affect published content.
 */
export const onVehicleGuideWrite = onDocumentWritten(
  {
    document: "vehicle_guides/{slug}",
    region: "asia-southeast1",
    secrets: [githubPat],
  },
  async (event) => {
    const slug = event.params.slug;
    const before = event.data?.before;
    const after = event.data?.after;

    logger.info(`[onVehicleGuideWrite] Write detected`, {
      slug,
      beforeStatus: before?.data()?.status ?? "(none)",
      afterStatus: after?.data()?.status ?? "(deleted)",
    });

    if (!shouldDispatch(before, after)) {
      logger.info(`[onVehicleGuideWrite] No dispatch needed (draft-only change)`, { slug });
      return;
    }

    const pat = githubPat.value();
    if (!pat) {
      logger.error("[onVehicleGuideWrite] GITHUB_PAT secret is not set");
      return;
    }

    await dispatchGitHubBuild(
      {
        source: `vehicle_guides/${slug}`,
        triggeredBy: "auto",
      },
      pat
    );
  }
);

/**
 * Firestore trigger: fires when a locations document is written.
 * Same dispatch logic as onVehicleGuideWrite.
 */
export const onLocationWrite = onDocumentWritten(
  {
    document: "locations/{slug}",
    region: "asia-southeast1",
    secrets: [githubPat],
  },
  async (event) => {
    const slug = event.params.slug;
    const before = event.data?.before;
    const after = event.data?.after;

    logger.info(`[onLocationWrite] Write detected`, {
      slug,
      beforeStatus: before?.data()?.status ?? "(none)",
      afterStatus: after?.data()?.status ?? "(deleted)",
    });

    if (!shouldDispatch(before, after)) {
      logger.info(`[onLocationWrite] No dispatch needed (draft-only change)`, { slug });
      return;
    }

    const pat = githubPat.value();
    if (!pat) {
      logger.error("[onLocationWrite] GITHUB_PAT secret is not set");
      return;
    }

    await dispatchGitHubBuild(
      {
        source: `locations/${slug}`,
        triggeredBy: "auto",
      },
      pat
    );
  }
);
