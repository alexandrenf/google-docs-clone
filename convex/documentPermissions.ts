import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const share = mutation({
  args: {
    documentId: v.id("documents"),
    userId: v.string(),
    role: v.union(v.literal("viewer"), v.literal("editor")),
  },
  handler: async (ctx, { documentId, userId, role }) => {
    const user = await ctx.auth.getUserIdentity();

    if (!user) throw new ConvexError("Usuário não autenticado!");

    const document = await ctx.db.get(documentId);

    if (!document) throw new ConvexError("Documento não encontrado!");

    const organizationId = (user.organization_id ?? undefined) as
      | string
      | undefined;

    const isOwner = document.ownerId === user.subject;
    const isOrganizationMember = !!(
      document.organizationId && document.organizationId === organizationId
    );

    // Check if user has editor access to the document
    const sharedPermission = await ctx.db
      .query("documentPermissions")
      .withIndex("by_document_and_user", (q) =>
        q.eq("documentId", documentId).eq("userId", user.subject)
      )
      .first();

    const hasEditorAccess = sharedPermission?.role === "editor";

    // Allow sharing if user is owner, organization member, or has editor access
    if (!isOwner && !isOrganizationMember && !hasEditorAccess) {
      throw new ConvexError(
        "Você não tem permissão para compartilhar este documento!"
      );
    }
    
    // Prevent users from sharing with themselves
    if (userId === user.subject) {
      throw new ConvexError(
        "Você não pode compartilhar o documento com você mesmo!"
      );
    }

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

export const removeShare = mutation({
  args: {
    documentId: v.id("documents"),
    userId: v.string(),
  },
  handler: async (ctx, { documentId, userId }) => {
    const user = await ctx.auth.getUserIdentity();

    if (!user) throw new ConvexError("Usuário não autenticado!");

    const document = await ctx.db.get(documentId);

    if (!document) throw new ConvexError("Documento não encontrado!");

    const organizationId = (user.organization_id ?? undefined) as
      | string
      | undefined;

    const isOwner = document.ownerId === user.subject;
    const isOrganizationMember = !!(
      document.organizationId && document.organizationId === organizationId
    );

    // Check if user has editor access to the document
    const sharedPermission = await ctx.db
      .query("documentPermissions")
      .withIndex("by_document_and_user", (q) =>
        q.eq("documentId", documentId).eq("userId", user.subject)
      )
      .first();

    const hasEditorAccess = sharedPermission?.role === "editor";

    // Allow removing shares if user is owner, organization member, or has editor access
    if (!isOwner && !isOrganizationMember && !hasEditorAccess) {
      throw new ConvexError(
        "Você não tem permissão para remover o compartilhamento deste documento!"
      );
    }

    const permission = await ctx.db
      .query("documentPermissions")
      .withIndex("by_document_and_user", (q) =>
        q.eq("documentId", documentId).eq("userId", userId)
      )
      .first();

    if (permission) {
      return await ctx.db.delete(permission._id);
    }
  },
});

export const getDocumentPermissions = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, { documentId }) => {
    const user = await ctx.auth.getUserIdentity();

    if (!user) throw new ConvexError("Usuário não autenticado!");

    const document = await ctx.db.get(documentId);

    if (!document) throw new ConvexError("Documento não encontrado!");

    const organizationId = (user.organization_id ?? undefined) as
      | string
      | undefined;

    const isOwner = document.ownerId === user.subject;
    const isOrganizationMember = !!(
      document.organizationId && document.organizationId === organizationId
    );

    // Check if user has shared access to the document
    const sharedPermission = await ctx.db
      .query("documentPermissions")
      .withIndex("by_document_and_user", (q) =>
        q.eq("documentId", documentId).eq("userId", user.subject)
      )
      .first();

    const hasSharedAccess = !!sharedPermission;

    // Allow access if user is owner, organization member, or has shared access
    if (!isOwner && !isOrganizationMember && !hasSharedAccess) {
      throw new ConvexError(
        "Você não tem permissão para acessar este documento!"
      );
    }

    return await ctx.db
      .query("documentPermissions")
      .withIndex("by_document_id", (q) => q.eq("documentId", documentId))
      .collect();
  },
});

export const getUserPermission = query({
  args: {
    documentId: v.id("documents"),
    userId: v.string(),
  },
  handler: async (ctx, { documentId, userId }) => {
    return await ctx.db
      .query("documentPermissions")
      .withIndex("by_document_and_user", (q) =>
        q.eq("documentId", documentId).eq("userId", userId)
      )
      .first();
  },
});
