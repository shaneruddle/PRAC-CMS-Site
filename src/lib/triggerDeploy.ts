import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function triggerMarketingDeploy(): Promise<void> {
    try {
          const snap = await getDoc(doc(db, "app_settings", "deploy"));
          const pat = snap.data()?.githubPat as string | undefined;
          if (!pat) return;
          await fetch(
                  "https://api.github.com/repos/shaneruddle/PRAC-Marketing-Site/dispatches",
            {
                      method: "POST",
                      headers: { Authorization: `Bearer ${pat}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
                      body: JSON.stringify({ event_type: "cms_publish" }),
            }
                );
    } catch {
          // silent — deploy failure never blocks a save
    }
}
