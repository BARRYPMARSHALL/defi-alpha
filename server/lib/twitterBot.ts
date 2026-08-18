import { TwitterApi } from 'twitter-api-v2';

interface Pool {
  pool: string;
  chain: string;
  project: string;
  symbol: string;
  apy: number;
  tvlUsd: number;
  riskAdjustedScore: number;
  isAutoCompound?: boolean;
}

const SITE_URL = process.env.SITE_URL || 'https://defialpha.example.com';

function getTwitterClient(): TwitterApi | null {
  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.TWITTER_ACCESS_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    console.log('Twitter API credentials not configured');
    return null;
  }

  return new TwitterApi({
    appKey: apiKey,
    appSecret: apiSecret,
    accessToken: accessToken,
    accessSecret: accessSecret,
  });
}

function formatNumber(num: number): string {
  if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(0)}K`;
  return `$${num.toFixed(0)}`;
}

function formatApy(apy: number): string {
  if (apy >= 100) return `${apy.toFixed(0)}%`;
  if (apy >= 10) return `${apy.toFixed(1)}%`;
  return `${apy.toFixed(2)}%`;
}

export function generateDailyTweet(pools: Pool[]): string {
  // Filter out anomalous APYs (>1000%) for credible tweets
  const top3 = pools
    .filter(p => p.riskAdjustedScore > 0 && p.apy < 1000 && p.tvlUsd >= 1000000)
    .sort((a, b) => b.riskAdjustedScore - a.riskAdjustedScore)
    .slice(0, 3);

  if (top3.length === 0) {
    return "No high-quality yield opportunities found today. Markets might be cooling off. Stay patient! 🔍\n\n#DeFi #YieldFarming #Crypto";
  }

  const lines = ["🔥 Top 3 DeFi Alpha:\n"];

  top3.forEach((pool, i) => {
    const emoji = i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉";
    const autoCompound = pool.isAutoCompound ? "🔄" : "";
    lines.push(`${emoji} ${pool.symbol} (${pool.chain})${autoCompound}`);
    lines.push(`   ${formatApy(pool.apy)} APY | ${formatNumber(pool.tvlUsd)}`);
  });

  lines.push(`\n➡️ ${SITE_URL}`);
  lines.push("#DeFi #Crypto");

  return lines.join("\n");
}

export async function postDailyTweet(pools: Pool[]): Promise<{ success: boolean; tweetId?: string; error?: string }> {
  // Create fresh client each time to pick up any credential changes
  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.TWITTER_ACCESS_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    console.log('Missing Twitter credentials:', {
      hasApiKey: !!apiKey,
      hasApiSecret: !!apiSecret,
      hasAccessToken: !!accessToken,
      hasAccessSecret: !!accessSecret,
    });
    return {
      success: false,
      error: 'Twitter API credentials not configured. Please add TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, and TWITTER_ACCESS_SECRET.',
    };
  }

  const client = new TwitterApi({
    appKey: apiKey,
    appSecret: apiSecret,
    accessToken: accessToken,
    accessSecret: accessSecret,
  });

  const tweetText = generateDailyTweet(pools);

  try {
    // Try v1.1 API first (more reliable with OAuth 1.0a)
    const tweet = await client.v1.tweet(tweetText);
    console.log(`Tweet posted successfully: ${tweet.id_str}`);
    return { success: true, tweetId: tweet.id_str };
  } catch (error: any) {
    console.error('Failed to post tweet:', error);
    if (error.data) {
      console.error('Twitter API error data:', JSON.stringify(error.data));
    }
    if (error.errors) {
      console.error('Twitter API errors:', JSON.stringify(error.errors));
    }
    return {
      success: false,
      error: error.message || 'Failed to post tweet',
    };
  }
}

export function previewTweet(pools: Pool[]): string {
  return generateDailyTweet(pools);
}

// Scheduled posting — enabled via TWITTER_AUTO_POST=true
let scheduledInterval: NodeJS.Timeout | null = null;
let lastPostedAt: string | null = null;
let lastTweetId: string | null = null;
let scheduleEnabled = false;

export function getScheduleStatus() {
  return {
    enabled: scheduleEnabled,
    intervalHours: 24,
    lastPostedAt,
    lastTweetId,
    credentialsConfigured: !!(
      process.env.TWITTER_API_KEY &&
      process.env.TWITTER_API_SECRET &&
      process.env.TWITTER_ACCESS_TOKEN &&
      process.env.TWITTER_ACCESS_SECRET
    ),
  };
}

export function startDailySchedule(fetchPools: () => Promise<Pool[]>) {
  if (scheduledInterval) {
    clearInterval(scheduledInterval);
  }

  scheduleEnabled = true;
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

  const run = async () => {
    try {
      const pools = await fetchPools();
      const result = await postDailyTweet(pools);
      if (result.success) {
        lastPostedAt = new Date().toISOString();
        lastTweetId = result.tweetId || null;
        console.log(`Scheduled tweet posted: ${result.tweetId}`);
      } else {
        console.log(`Scheduled tweet failed: ${result.error}`);
      }
    } catch (err) {
      console.error('Error in scheduled tweet:', err);
    }
  };

  // Initial post after 1 minute (let the server fully start), then every 24h
  setTimeout(run, 60 * 1000);
  scheduledInterval = setInterval(run, TWENTY_FOUR_HOURS);

  console.log('Twitter daily schedule started - will post every 24 hours');
}

export function stopDailySchedule() {
  if (scheduledInterval) {
    clearInterval(scheduledInterval);
    scheduledInterval = null;
  }
  scheduleEnabled = false;
  console.log('Twitter daily schedule stopped');
}

/** Boot-time hook: start the schedule only if explicitly enabled. */
export function maybeStartDailySchedule(fetchPools: () => Promise<Pool[]>) {
  if (process.env.TWITTER_AUTO_POST === "true") {
    startDailySchedule(fetchPools);
  } else {
    console.log('Twitter auto-posting disabled (set TWITTER_AUTO_POST=true to enable)');
  }
}
