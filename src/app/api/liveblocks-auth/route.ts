import { auth, currentUser } from "@clerk/nextjs/server";
import { Liveblocks } from "@liveblocks/node";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

// Function to sanitize IDs for Liveblocks
function sanitizeId(id: string): string {
  // Remove or replace characters that Liveblocks doesn't accept
  // Liveblocks accepts: letters, numbers, hyphens, and underscores
  return id.replace(/[^a-zA-Z0-9_-]/g, '_');
}

export async function POST(req: Request) {
  try {
    const { sessionClaims } = await auth();

    if (!sessionClaims) return new Response("Unauthorized", { status: 401 });

    const user = await currentUser();

    if (!user) return new Response("Unauthorized", { status: 401 });

    const { room } = await req.json();

    // Debug logging
    console.log("Authentication Debug:");
    console.log("User ID:", user.id);
    console.log("Sanitized User ID:", sanitizeId(user.id));
    console.log("Room ID:", room);
    console.log("Session claims org_id:", sessionClaims.org_id);

    const document = await convex.query(api.documents.getById, { id: room });

    if (!document) return new Response("Not found", { status: 404 });

    // Debug document ownership
    console.log("Document Debug:");
    console.log("Document owner ID:", document.ownerId);
    console.log("Document organization ID:", document.organizationId);
    console.log("User ID matches owner:", document.ownerId === user.id);

    const isOwner = document.ownerId === user.id;
    const isOrganizationMember = !!(
      document.organizationId && document.organizationId === sessionClaims.org_id
    );

    // Check if user has shared access to the document
    const sharedPermission = await convex.query(api.documentPermissions.getUserPermission, {
      documentId: room,
      userId: user.id,
    });

    const hasSharedAccess = !!sharedPermission;

    console.log("Authorization Check:");
    console.log("Is owner:", isOwner);
    console.log("Is organization member:", isOrganizationMember);
    console.log("Has shared access:", hasSharedAccess);
    console.log("Shared permission role:", sharedPermission?.role);
    console.log("Has access:", isOwner || isOrganizationMember || hasSharedAccess);

    if (!isOwner && !isOrganizationMember && !hasSharedAccess) {
      console.log("Authorization failed - returning 401");
      return new Response("Unauthorized", { status: 401 });
    }

    const name =
      user.fullName ?? user.primaryEmailAddress?.emailAddress ?? "Anônimo";
    const nameToNumber = name
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue = Math.abs(nameToNumber % 360);
    const color = `hsl(${hue}, 70%, 50%)`;

    // Sanitize the user ID for Liveblocks
    const sanitizedUserId = sanitizeId(user.id);

    console.log("Preparing Liveblocks session with sanitized user ID:", sanitizedUserId);

    const session = liveblocks.prepareSession(sanitizedUserId, {
      userInfo: {
        name,
        color,
        avatar: user.imageUrl,
      },
    });

    // Use the room ID as-is since it's already a valid Convex ID
    session.allow(room, session.FULL_ACCESS);

    const { body, status } = await session.authorize();

    console.log("Liveblocks authorization successful");

    return new Response(body, { status });
  } catch (error) {
    console.error("Liveblocks authentication error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
