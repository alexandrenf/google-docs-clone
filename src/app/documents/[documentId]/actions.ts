"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function getDocuments(ids: Id<"documents">[]) {
  return await convex.query(api.documents.getByIds, { ids });
}

export async function getUsers() {
  const { sessionClaims } = await auth();
  const clerk = await clerkClient();

  // Fix: Don't pass organizationId as array, pass as string or undefined
  const organizationId = sessionClaims?.org_id as string | undefined;

  console.log("getUsers Debug:");
  console.log("Organization ID:", organizationId);

  const response = await clerk.users.getUserList({
    organizationId: organizationId ? [organizationId] : undefined,
  });

  console.log("Users fetched:", response.data.length);

  return response.data.map((user) => ({
    id: user.id,
    name: user.fullName ?? user.primaryEmailAddress?.emailAddress ?? "Anônimo",
    avatar: user.imageUrl,
    color: "",
  }));
}

export async function getAllUsers() {
  const clerk = await clerkClient();

  try {
    // Fetch all users (you might want to add pagination in production)
    const response = await clerk.users.getUserList({
      limit: 100, // Adjust as needed
    });

    return response.data.map((user) => ({
      id: user.id,
      name: user.fullName ?? user.primaryEmailAddress?.emailAddress ?? "Anônimo",
      avatar: user.imageUrl,
      color: "",
    }));
  } catch (error) {
    console.error("Error fetching all users:", error);
    return [];
  }
}

export async function getShareableUsers(scope: 'organization' | 'all' = 'organization') {
  const { sessionClaims } = await auth();
  const clerk = await clerkClient();
  const organizationId = sessionClaims?.org_id as string | undefined;

  try {
    let response;
    
    if (scope === 'organization' && organizationId) {
      // Fetch users from the same organization
      response = await clerk.users.getUserList({
        organizationId: [organizationId],
        limit: 100,
      });
    } else if (scope === 'organization' && !organizationId) {
      // If user is not in an organization, return empty array
      // or you could return all users - depends on your business logic
      return [];
    } else {
      // Fetch all users
      response = await clerk.users.getUserList({
        limit: 100,
      });
    }

    return response.data.map((user) => ({
      id: user.id,
      name: user.fullName ?? user.primaryEmailAddress?.emailAddress ?? "Anônimo",
      avatar: user.imageUrl,
      color: "",
    }));
  } catch (error) {
    console.error("Error fetching shareable users:", error);
    return [];
  }
}
