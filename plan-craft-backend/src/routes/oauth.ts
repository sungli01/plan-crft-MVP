/**
 * OAuth Routes - Google & GitHub
 */

import { Hono } from 'hono';
import { db } from '../db/index';
import { users } from '../db/schema-pg';
import { eq } from 'drizzle-orm';
import { generateTokenPair } from '../middleware/auth';

const oauthRouter = new Hono();

// ─── Google OAuth ────────────────────────────────────────────

oauthRouter.get('/google', (c) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return c.json({ error: 'Google OAuth가 설정되지 않았습니다' }, 503);
  }

  const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/oauth/google/callback`;
  const scope = 'openid email profile';
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}`;

  return c.redirect(authUrl);
});

oauthRouter.get('/google/callback', async (c) => {
  const code = c.req.query('code');
  if (!code) return c.json({ error: 'Authorization code missing' }, 400);

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/oauth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = (await tokenRes.json()) as Record<string, any>;

    // Get user info
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const googleUser = (await userRes.json()) as Record<string, any>;

    // Find or create user
    let [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, googleUser.email))
      .limit(1);

    if (!existingUser) {
      // Create a new user (no password for OAuth users)
      const [newUser] = await db
        .insert(users)
        .values({
          email: googleUser.email,
          passwordHash: '', // OAuth users have no password
          name: googleUser.name || null,
          plan: 'free',
          oauthProvider: 'google',
          oauthId: String(googleUser.id),
        })
        .returning();
      existingUser = newUser;
    } else if (!existingUser.oauthProvider) {
      // Link OAuth to existing account
      await db
        .update(users)
        .set({ oauthProvider: 'google', oauthId: String(googleUser.id), updatedAt: new Date() })
        .where(eq(users.id, existingUser.id));
    }

    // Issue JWT tokens
    const jwtTokens = generateTokenPair(existingUser.id, existingUser.email);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return c.redirect(
      `${frontendUrl}/oauth-callback?provider=google&accessToken=${jwtTokens.accessToken}&refreshToken=${jwtTokens.refreshToken}`
    );
  } catch (e) {
    console.error('Google OAuth error:', e);
    return c.json({ error: 'OAuth failed' }, 500);
  }
});

// ─── GitHub OAuth ────────────────────────────────────────────

oauthRouter.get('/github', (c) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return c.json({ error: 'GitHub OAuth가 설정되지 않았습니다' }, 503);
  }

  const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/oauth/github/callback`;
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email`;

  return c.redirect(authUrl);
});

oauthRouter.get('/github/callback', async (c) => {
  const code = c.req.query('code');
  if (!code) return c.json({ error: 'Authorization code missing' }, 400);

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const { access_token } = (await tokenRes.json()) as Record<string, any>;

    const userRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const githubUser = (await userRes.json()) as Record<string, any>;

    // Get primary email
    const emailRes = await fetch('https://api.github.com/user/emails', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const emails = (await emailRes.json()) as Array<{ email: string; primary: boolean }>;
    const primaryEmail = emails.find((e) => e.primary)?.email || githubUser.email;

    if (!primaryEmail) {
      return c.json({ error: 'GitHub 계정에 이메일이 없습니다' }, 400);
    }

    // Find or create user
    let [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, primaryEmail))
      .limit(1);

    if (!existingUser) {
      const [newUser] = await db
        .insert(users)
        .values({
          email: primaryEmail,
          passwordHash: '', // OAuth users have no password
          name: githubUser.name || githubUser.login || null,
          plan: 'free',
          oauthProvider: 'github',
          oauthId: String(githubUser.id),
        })
        .returning();
      existingUser = newUser;
    } else if (!existingUser.oauthProvider) {
      await db
        .update(users)
        .set({ oauthProvider: 'github', oauthId: String(githubUser.id), updatedAt: new Date() })
        .where(eq(users.id, existingUser.id));
    }

    // Issue JWT tokens
    const jwtTokens = generateTokenPair(existingUser.id, existingUser.email);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return c.redirect(
      `${frontendUrl}/oauth-callback?provider=github&accessToken=${jwtTokens.accessToken}&refreshToken=${jwtTokens.refreshToken}`
    );
  } catch (e) {
    console.error('GitHub OAuth error:', e);
    return c.json({ error: 'OAuth failed' }, 500);
  }
});

// ─── Provider status ─────────────────────────────────────────

oauthRouter.get('/providers', (c) => {
  return c.json({
    google: !!process.env.GOOGLE_CLIENT_ID,
    github: !!process.env.GITHUB_CLIENT_ID,
  });
});

export default oauthRouter;
