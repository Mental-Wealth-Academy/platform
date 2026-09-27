/**
 * POST /api/avatars/custom
 *
 * Set the signed-in user's avatar to a custom image they uploaded via
 * /api/upload. Only accepts URLs in the app's Supabase upload bucket, so
 * avatar_url cannot be turned into a link to off-site content.
 */
import { NextResponse } from 'next/server';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { isDbConfigured, sqlQuery } from '@/lib/db';
import { isOwnStorageUrl, uploadBucket } from '@/lib/supabase-storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'Database is not configured on the server.' }, { status: 503 });
  }

  const user = await getCurrentUserFromRequestCookie();
  if (!user) {
    return NextResponse.json({ error: 'Not signed in. Please authenticate first.' }, { status: 401 });
  }

  let body: { url?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const url = body.url;
  if (typeof url !== 'string' || !url.trim()) {
    return NextResponse.json({ error: 'Missing image URL.' }, { status: 400 });
  }

  // Validate allowed storage destinations (Supabase, Pinata/IPFS, local uploads, or safe image data)
  const isStorage = Boolean(isOwnStorageUrl(url, uploadBucket()));
  const isAllowed =
    isStorage ||
    url.startsWith('/uploads/') ||
    url.startsWith('https://gateway.pinata.cloud/ipfs/') ||
    url.startsWith('https://peach-impossible-chicken-451.mypinata.cloud/ipfs/') ||
    url.startsWith('ipfs://') ||
    url.startsWith('https://ipfs.io/ipfs/') ||
    url.startsWith('https://cloudflare-ipfs.com/ipfs/') ||
    /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(url) ||
    /\.(png|jpe?g|gif|webp)(\?.*)?$/i.test(url);

  if (!isAllowed) {
    return NextResponse.json(
      { error: 'Invalid image URL. Upload a PNG, JPEG, GIF, or WebP image.' },
      { status: 400 },
    );
  }

  try {
    await sqlQuery(
      `UPDATE users SET avatar_url = :avatarUrl, selected_avatar_id = 'custom' WHERE id = :userId`,
      { avatarUrl: url, userId: user.id },
    );
    return NextResponse.json({ ok: true, avatar_url: url });
  } catch (error) {
    console.error('Error setting custom avatar:', error);
    return NextResponse.json({ error: 'Failed to save your photo.' }, { status: 500 });
  }
}
