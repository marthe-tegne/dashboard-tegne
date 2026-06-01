// Netlify serverless function — proxy for Mailchimp API
// Legg til MAILCHIMP_API_KEY og MAILCHIMP_SERVER_PREFIX i Netlify dashboard
// MAILCHIMP_SERVER_PREFIX er f.eks. "us1", "us14" — finnes i Mailchimp-URLen din

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  const apiKey = process.env.MAILCHIMP_API_KEY;
  const server = process.env.MAILCHIMP_SERVER_PREFIX;

  if (!apiKey || !server) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'MAILCHIMP_API_KEY eller MAILCHIMP_SERVER_PREFIX er ikke satt i Netlify-miljøvariablene' }),
    };
  }

  // year og month sendes som query params, f.eks. ?year=2026&month=5
  const { year, month } = event.queryStringParameters || {};
  if (!year || !month) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Mangler year og month' }) };
  }

  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const sinceTime = new Date(y, m - 1, 1).toISOString();
  const beforeTime = new Date(y, m, 1).toISOString();

  const base = `https://${server}.api.mailchimp.com/3.0`;
  const auth = Buffer.from(`anystring:${apiKey}`).toString('base64');
  const authHeader = { Authorization: `Basic ${auth}` };

  try {
    // Hent kampanjer sendt i gitt måned (maks 100)
    const campRes = await fetch(
      `${base}/campaigns?status=sent&since_send_time=${sinceTime}&before_send_time=${beforeTime}&count=100&fields=campaigns.id,campaigns.settings.subject_line,campaigns.emails_sent,campaigns.report_summary`,
      { headers: authHeader }
    );

    if (!campRes.ok) {
      const err = await campRes.json().catch(() => ({}));
      return { statusCode: campRes.status, headers, body: JSON.stringify({ error: err.detail || 'Mailchimp API-feil' }) };
    }

    const campData = await campRes.json();
    const campaigns = campData.campaigns || [];

    // Summer totaltall
    let totalSent = 0;
    let totalOpens = 0;
    let totalClicks = 0;

    const mapped = campaigns.map(c => {
      const r = c.report_summary || {};
      const sent = c.emails_sent || 0;
      const opens = r.unique_opens || 0;
      const clicks = r.unique_subscriber_clicks || 0;
      const openRate = sent > 0 ? opens / sent : 0;
      const clickRate = sent > 0 ? clicks / sent : 0;
      totalSent += sent;
      totalOpens += opens;
      totalClicks += clicks;
      return {
        id: c.id,
        subject: c.settings?.subject_line || '(uten emnelinje)',
        sent,
        opens,
        clicks,
        openRate,
        clickRate,
      };
    });

    // Sorter etter opens, ta topp 5
    const top5 = [...mapped]
      .sort((a, b) => b.opens - a.opens)
      .slice(0, 5);

    const overallOpenRate  = totalSent > 0 ? totalOpens  / totalSent : 0;
    const overallClickRate = totalSent > 0 ? totalClicks / totalSent : 0;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        totalSent,
        openRate:  overallOpenRate,
        clickRate: overallClickRate,
        top5,
      }),
    };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: `Serverfeil: ${err.message}` }) };
  }
};
