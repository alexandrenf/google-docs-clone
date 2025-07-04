// This is a temporary script to share the document with the second user
// Run this once to grant access

import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function shareDocument() {
  try {
    // Document ID from the logs
    const documentId = "j576dnwwcycgzn9n1w5dxy0cmh7k3w6h";
    
    // User ID that needs access
    const userIdToGrantAccess = "user_2zPwBT5Thc6nEgi2HLUJ3lxyizC";
    
    // Grant editor access
    const result = await convex.mutation(api.documentPermissions.share, {
      documentId: documentId as any,
      userId: userIdToGrantAccess,
      role: "editor"
    });
    
    console.log("Document shared successfully:", result);
  } catch (error) {
    console.error("Error sharing document:", error);
  }
}

shareDocument();
