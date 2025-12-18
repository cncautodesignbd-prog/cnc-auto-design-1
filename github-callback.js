// Netlify Function: GitHub OAuth callback
// Exchanges ?code for access_token, fetches basic profile and primary email,
// then redirects back to the site with a compact base64 payload in the URL hash.

export async function handler(event) {
  try {
    const params = new URLSearchParams(event.rawQuery || event.queryStringParameters);
    const code = params.get('code');
    const state = params.get('state') || '';

    if (!code) {
      return {
        statusCode: 400,
        body: 'Missing code'
      };
    }

    const client_id = process.env.GITHUB_CLIENT_ID;
    const client_secret = process.env.GITHUB_CLIENT_SECRET;
    const site_origin = process.env.SITE_ORIGIN || (event.headers['x-forwarded-proto'] && event.headers.host ? `${event.headers['x-forwarded-proto']}://${event.headers.host}` : '');

    if (!client_id || !client_secret) {
      return { statusCode: 500, body: 'Server not configured: missing GitHub client credentials' };
    }

    // Exchange code for access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id, client_secret, code })
    });
    const tokenJson = await tokenRes.json();
    const access_token = tokenJson.access_token;
    if (!access_token) {
      return { statusCode: 400, body: 'Could not obtain access token' };
    }

    // Fetch user profile
    const userRes = await fetch('https://api.github.com/user', {
      headers: { 'Authorization': `Bearer ${access_token}`, 'User-Agent': 'cnc-autodesign-oauth' }
    });
    const user = await userRes.json();

    // Fetch emails to find primary
    let email = '';
    try {
      const emRes = await fetch('https://api.github.com/user/emails', {
        headers: { 'Authorization': `Bearer ${access_token}`, 'User-Agent': 'cnc-autodesign-oauth', 'Accept': 'application/vnd.github+json' }
      });
      const emails = await emRes.json();
      const primary = Array.isArray(emails) ? emails.find(e => e.primary && e.verified) || emails.find(e => e.verified) || emails[0] : null;
      email = (primary && primary.email) || '';
    } catch (e) {}

    const profile = {
      provider: 'github',
      id: user && user.id,
      name: user && (user.name || user.login) || '',
      email,
      avatar: user && user.avatar_url || ''
    };

    const payload = Buffer.from(JSON.stringify(profile)).toString('base64url');
    const redirect = `${site_origin || ''}/web/login/index.html#gh=${encodeURIComponent(payload)}${state ? `&state=${encodeURIComponent(state)}` : ''}`;

    return {
      statusCode: 302,
      headers: { Location: redirect }
    };
  } catch (err) {
    return { statusCode: 500, body: 'OAuth error' };
  }
}
