const revokedTokens = new Map<string, number>();

// Clean up expired tokens periodically
setInterval(
  () => {
    const now = Date.now();
    for (const [token, expiresAt] of revokedTokens.entries()) {
      if (expiresAt <= now) {
        revokedTokens.delete(token);
      }
    }
  },
  10 * 60 * 1000
);

export const TokenBlacklist = {
  revoke(token: string, expiresInMs: number = 7 * 24 * 60 * 60 * 1000) {
    if (!token) return;
    revokedTokens.set(token, Date.now() + expiresInMs);
  },

  isRevoked(token: string): boolean {
    if (!token) return false;
    const expiresAt = revokedTokens.get(token);
    if (!expiresAt) return false;
    if (expiresAt <= Date.now()) {
      revokedTokens.delete(token);
      return false;
    }
    return true;
  },
};
