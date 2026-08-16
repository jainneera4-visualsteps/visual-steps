export interface AuthenticationUserUpdates {
  email?: string;
  password?: string;
}

interface AdminAuthClient {
  auth: {
    admin: {
      updateUserById: (
        userId: string,
        updates: AuthenticationUserUpdates,
      ) => Promise<{ error: { message: string } | null }>;
    };
  };
}

export const updateAuthenticationUser = async (
  client: AdminAuthClient,
  userId: string,
  updates: AuthenticationUserUpdates,
) => {
  if (!userId) throw new Error('Authentication user id is required');
  if (!updates.email && !updates.password) return null;

  const { error } = await client.auth.admin.updateUserById(userId, updates);
  return error;
};
