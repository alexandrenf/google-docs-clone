import { query } from "./_generated/server";
import { ConvexError } from "convex/values";

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.auth.getUserIdentity();
    
    if (!user) {
      throw new ConvexError("Usuário não autenticado!");
    }

    // For now, we'll return an empty array since we don't store users in Convex
    // In a real app, you might want to store user profiles in Convex
    // or fetch them from Clerk's API
    
    // This is a placeholder - you'll need to implement actual user fetching
    // based on your authentication system
    return [];
  },
});

export const getCurrent = query({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.auth.getUserIdentity();
    
    if (!user) {
      return null;
    }

    return {
      id: user.subject,
      name: user.name ?? user.email ?? "Usuário",
      email: user.email,
      avatar: user.picture ?? "",
    };
  },
});
