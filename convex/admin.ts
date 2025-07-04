import { v } from "convex/values";
import { mutation } from "./_generated/server";

// Admin function to share a document - use this from the Convex dashboard for testing
export const shareDocumentAdmin = mutation({
  args: {
    documentId: v.id("documents"),
    userId: v.string(),
    role: v.union(v.literal("viewer"), v.literal("editor")),
  },
  handler: async (ctx, { documentId, userId, role }) => {
    // Check if permission already exists
    const existingPermission = await ctx.db
      .query("documentPermissions")
      .withIndex("by_document_and_user", (q) =>
        q.eq("documentId", documentId).eq("userId", userId)
      )
      .first();

    if (existingPermission) {
      // Update existing permission
      return await ctx.db.patch(existingPermission._id, { role });
    } else {
      // Create new permission
      return await ctx.db.insert("documentPermissions", {
        documentId,
        userId,
        role,
      });
    }
  },
});

// Admin function to list all document permissions
export const listAllPermissions = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("documentPermissions").collect();
  },
});

// Admin function to remove all permissions for a user
export const removeAllUserPermissions = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, { userId }) => {
    const permissions = await ctx.db
      .query("documentPermissions")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .collect();

    for (const permission of permissions) {
      await ctx.db.delete(permission._id);
    }

    return `Removed ${permissions.length} permissions for user ${userId}`;
  },
});
