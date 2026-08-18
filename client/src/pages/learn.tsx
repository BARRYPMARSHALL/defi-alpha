import { Link } from "wouter";
import { ArrowLeft, TrendingUp, Shield, Zap, Calculator, BookOpen, Trophy, Share2, Gift, ExternalLink, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { CourseModule, CourseProgress } from "@/components/CourseModule";
import { SiX, SiFacebook, SiReddit, SiTelegram } from "react-icons/si";
import { FaLinkedin } from "react-icons/fa";
import logoImage from "@assets/33_1775959909661.png";
import heroBanner from "@assets/x1_1768343977535.png";

export default function Learn() {
  return (
    <div className="min-h-screen bg-background pb-24 sm:pb-0">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="relative overflow-hidden rounded-xl mb-8" data-testid="hero-banner-learn">
          <img 
            src={heroBanner} 
            alt="DeFi Alpha Agent - Real-time risk-adjusted DeFi Alpha across 100+ chains" 
            className="w-full h-auto object-cover rounded-xl"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 space-y-6">
            <div className="mb-8">
              <Badge className="mb-3 bg-chart-2 text-white">
                <Trophy className="h-3 w-3 mr-1" />
                100% Free
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight mb-2">
                DeFi Yield Farming Masterclass
              </h2>
              <p className="text-muted-foreground text-lg mb-4">
                Learn how to find, evaluate, and safely earn yields in DeFi. From basics to advanced strategies.
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Share2 className="h-4 w-4" />
                  Share this course:
                </span>
                <div className="flex items-center gap-2">
                  <a
                    href="https://twitter.com/intent/tweet?text=Check%20out%20this%20free%20DeFi%20yield%20farming%20course!%20Learn%20how%20to%20find%20the%20best%20yields%20safely.&url=https://defialphaagent.com/learn"
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="link-share-twitter"
                  >
                    <Button size="icon" variant="outline" className="h-8 w-8">
                      <SiX className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                  <a
                    href="https://www.facebook.com/sharer/sharer.php?u=https://defialphaagent.com/learn"
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="link-share-facebook"
                  >
                    <Button size="icon" variant="outline" className="h-8 w-8">
                      <SiFacebook className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                  <a
                    href="https://www.linkedin.com/shareArticle?mini=true&url=https://defialphaagent.com/learn&title=Free%20DeFi%20Yield%20Farming%20Course&summary=Learn%20how%20to%20find%20the%20best%20yields%20in%20DeFi%20safely"
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="link-share-linkedin"
                  >
                    <Button size="icon" variant="outline" className="h-8 w-8">
                      <FaLinkedin className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                  <a
                    href="https://reddit.com/submit?url=https://defialphaagent.com/learn&title=Free%20DeFi%20Yield%20Farming%20Course"
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="link-share-reddit"
                  >
                    <Button size="icon" variant="outline" className="h-8 w-8">
                      <SiReddit className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                  <a
                    href="https://t.me/share/url?url=https://defialphaagent.com/learn&text=Check%20out%20this%20free%20DeFi%20yield%20farming%20course!"
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="link-share-telegram"
                  >
                    <Button size="icon" variant="outline" className="h-8 w-8">
                      <SiTelegram className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                </div>
              </div>
            </div>

            <CourseModule
              id="defi-basics"
              title="Module 1: DeFi Basics"
              description="What is DeFi, wallets, and how to stay safe"
              duration="6 min"
              defaultOpen={true}
            >
              <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                What is DeFi?
              </h4>
              <p className="mb-6 text-base leading-relaxed">
                <strong>Decentralized Finance (DeFi)</strong> refers to financial applications built on blockchain networks that operate without traditional intermediaries like banks. Instead of trusting a company, you trust code (smart contracts) that runs exactly as programmed. This opens up incredible opportunities to earn yields that traditional finance simply cannot offer.
              </p>
              
              <h5 className="font-medium mb-3 text-base">Key DeFi Concepts:</h5>
              <ul className="list-disc pl-6 space-y-3 mb-6">
                <li><strong>Smart Contracts</strong> - Self-executing code on the blockchain that handles your funds automatically. Once deployed, these contracts run 24/7 without any human intervention.</li>
                <li><strong>Liquidity Pools</strong> - Pools of tokens locked in smart contracts that enable trading. When you add liquidity, you become a market maker and earn fees.</li>
                <li><strong>Yield Farming</strong> - Earning rewards by providing liquidity or staking tokens. Returns can range from 5% to over 100% APY depending on risk.</li>
                <li><strong>TVL (Total Value Locked)</strong> - The total amount of assets deposited in a protocol. Higher TVL generally indicates more trust and stability.</li>
                <li><strong>APY vs APR</strong> - APY includes compound interest while APR doesn't. A 10% APY with daily compounding yields more than 10% APR.</li>
              </ul>

              <h5 className="font-medium mb-3 text-base">The Challenge: Finding Good Opportunities</h5>
              <p className="mb-6 text-base leading-relaxed">
                There are thousands of yield farming opportunities across dozens of blockchains. Manually checking each protocol, comparing APYs, evaluating risks, and monitoring changes is incredibly time-consuming. Most farmers spend hours each day just trying to find where to put their money.
              </p>

              <div className="bg-primary/10 border border-primary/30 rounded-lg p-5 mb-6">
                <h6 className="font-semibold mb-2 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  How DeFi Alpha Agent Saves You Time
                </h6>
                <p className="text-sm mb-3">
                  Instead of manually checking 50+ protocols across 20+ chains, DeFi Alpha Agent aggregates everything into one dashboard. We pull real-time data from DeFiLlama covering thousands of pools and present only the best opportunities.
                </p>
                <ul className="text-sm space-y-1">
                  <li>• <strong>One dashboard</strong> instead of 50 browser tabs</li>
                  <li>• <strong>Real-time APY data</strong> updated every 5 minutes</li>
                  <li>• <strong>Risk-adjusted scores</strong> so you see quality, not just high numbers</li>
                  <li>• <strong>Filter by chain, TVL, and pool type</strong> instantly</li>
                </ul>
              </div>
              
              <h5 className="font-medium mb-3 text-base">Wallet Security Basics:</h5>
              <p className="mb-4 text-base leading-relaxed">
                Your wallet is your gateway to DeFi. Protecting it is critical - there's no customer support to recover lost funds:
              </p>
              <ul className="list-disc pl-6 space-y-3 mb-6">
                <li><strong>Never share your seed phrase</strong> - Anyone with your 12/24 words owns your funds</li>
                <li><strong>Use a hardware wallet for large amounts</strong> - Physical devices keep keys offline and safe from hackers</li>
                <li><strong>Verify contract addresses</strong> - Always double-check you're interacting with the real protocol</li>
                <li><strong>Start with small amounts</strong> - Test new protocols with money you can afford to lose</li>
                <li><strong>Revoke unused approvals</strong> - Old token approvals can be exploited if a protocol is compromised</li>
              </ul>
            </CourseModule>

            <CourseModule
              id="yield-farming-101"
              title="Module 2: Yield Farming 101"
              description="APY vs APR, liquidity pools, and how yields work"
              duration="7 min"
            >
              <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Understanding Yields
              </h4>
              
              <h5 className="font-medium mb-3 text-base">APY vs APR - The Critical Difference:</h5>
              <ul className="list-disc pl-6 space-y-3 mb-6">
                <li><strong>APR (Annual Percentage Rate)</strong> - Simple interest without compounding. 10% APR means you earn exactly 10% per year on your principal, paid out in regular intervals.</li>
                <li><strong>APY (Annual Percentage Yield)</strong> - Includes compound interest. The more frequently rewards compound, the higher the effective return. Daily compounding beats monthly which beats annual.</li>
              </ul>
              <div className="bg-muted rounded-lg p-5 mb-6">
                <p className="text-sm font-mono leading-relaxed">
                  <strong>Real Example:</strong><br/>
                  $10,000 at 10% APR = $11,000 after 1 year<br/>
                  $10,000 at 10% APY (daily compound) = $11,051.56 after 1 year<br/>
                  <br/>
                  <strong>At 50% rates, the difference is huge:</strong><br/>
                  $10,000 at 50% APR = $15,000 after 1 year<br/>
                  $10,000 at 50% APY (daily compound) = $16,487.21 after 1 year
                </p>
              </div>

              <h5 className="font-medium mb-3 text-base">How Liquidity Pools Work:</h5>
              <p className="mb-4 text-base leading-relaxed">
                When you provide liquidity to a pool (e.g., ETH-USDC), you deposit both tokens in equal value. Traders swap between these tokens and pay fees, which go to liquidity providers (LPs). The more trading volume a pool has, the more fees you earn.
              </p>
              <p className="mb-6 text-base leading-relaxed">
                Different pool types exist: traditional 50/50 pools, concentrated liquidity pools (like Uniswap V3), and single-sided staking. Each has different risk/reward profiles.
              </p>

              <h5 className="font-medium mb-3 text-base">Where Yields Come From:</h5>
              <ul className="list-disc pl-6 space-y-3 mb-6">
                <li><strong>Trading Fees</strong> - Your share of swap fees (usually 0.05% to 1% per trade depending on pool)</li>
                <li><strong>Token Rewards</strong> - Protocols distribute their native tokens to attract liquidity (often the biggest source of APY)</li>
                <li><strong>Lending Interest</strong> - On lending platforms, borrowers pay interest on loans you provide</li>
                <li><strong>Protocol Revenue Sharing</strong> - Some protocols share actual revenue with stakers</li>
              </ul>

              <div className="bg-primary/10 border border-primary/30 rounded-lg p-5 mb-6">
                <h6 className="font-semibold mb-2 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  How DeFi Alpha Agent Helps You Compare Yields
                </h6>
                <p className="text-sm mb-3">
                  Comparing yields across protocols is confusing - some show APR, others show APY, and reward tokens fluctuate in value. DeFi Alpha Agent normalizes everything:
                </p>
                <ul className="text-sm space-y-1">
                  <li>• <strong>Standardized APY display</strong> across all pools for fair comparison</li>
                  <li>• <strong>Base APY vs Reward APY</strong> breakdown so you know what's sustainable</li>
                  <li>• <strong>7-day and 30-day trend indicators</strong> show if yields are rising or falling</li>
                  <li>• <strong>Sort by APY, TVL, or our risk-adjusted score</strong> to find your ideal opportunities</li>
                </ul>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-5 mb-6">
                <p className="text-sm leading-relaxed">
                  <strong>Pro Tip:</strong> High APYs often come from token rewards that can lose value. A 500% APY means nothing if the reward token drops 90%. DeFi Alpha Agent shows you sustainability warnings when APY is declining rapidly.
                </p>
              </div>
            </CourseModule>

            <CourseModule
              id="risk-management"
              title="Module 3: Risk Management"
              description="Rug pulls, smart contract risk, and how to protect yourself"
              duration="8 min"
            >
              <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Understanding DeFi Risks
              </h4>
              <p className="mb-6 text-base leading-relaxed">
                DeFi offers incredible opportunities, but also significant risks. Understanding these risks is essential for protecting your capital. Many investors have lost everything by ignoring risk management.
              </p>

              <h5 className="font-medium mb-3 text-base">Common DeFi Risks:</h5>
              <ul className="list-disc pl-6 space-y-3 mb-6">
                <li><strong>Smart Contract Risk</strong> - Bugs in code can be exploited, leading to loss of funds. Even audited protocols have been hacked. In 2022-2023, billions were lost to exploits.</li>
                <li><strong>Impermanent Loss (IL)</strong> - When token prices diverge significantly, LPs can lose value compared to just holding. Volatile pairs like ETH-SHIB can see 50%+ IL in extreme moves.</li>
                <li><strong>Rug Pulls</strong> - Malicious projects where developers drain liquidity. Usually happens with new, unverified tokens promising unrealistic returns.</li>
                <li><strong>Oracle Manipulation</strong> - Price feed attacks that drain protocols by manipulating the price oracles that DeFi relies on.</li>
                <li><strong>Regulatory Risk</strong> - Governments may restrict access to certain protocols or tokens, affecting your positions.</li>
                <li><strong>Liquidity Risk</strong> - Low liquidity pools can trap your funds or cause massive slippage when exiting.</li>
              </ul>

              <h5 className="font-medium mb-3 text-base">Understanding Impermanent Loss:</h5>
              <div className="bg-muted rounded-lg p-5 mb-6">
                <p className="text-sm font-mono leading-relaxed">
                  <strong>Example: ETH-USDC Pool</strong><br/><br/>
                  You deposit: $5,000 ETH + $5,000 USDC = $10,000 total<br/>
                  ETH price doubles: Your pool is now ~$7,071 ETH + ~$7,071 USDC<br/>
                  Pool value: $14,142<br/>
                  If you just held: $10,000 + $5,000 = $15,000<br/>
                  <strong>Impermanent Loss: ~5.7% ($858)</strong><br/><br/>
                  This loss is "impermanent" because it reverses if prices return to your entry point.
                </p>
              </div>

              <h5 className="font-medium mb-3 text-base">How to Minimize Risk:</h5>
              <ul className="list-disc pl-6 space-y-3 mb-6">
                <li><strong>Stick to audited protocols</strong> - Multiple audits from reputable firms like Trail of Bits, OpenZeppelin, or Certik</li>
                <li><strong>Check TVL</strong> - Higher TVL usually means more trust and battle-testing. $100M+ TVL protocols are generally safer.</li>
                <li><strong>Diversify</strong> - Spread across multiple protocols, chains, and pool types. Never put everything in one pool.</li>
                <li><strong>Use DeFi insurance</strong> - Platforms like Nexus Mutual offer cover for smart contract failures</li>
                <li><strong>Avoid anonymous teams</strong> - Doxxed teams with reputations to protect are less likely to rug</li>
                <li><strong>Start small</strong> - Test with 5-10% of what you plan to invest before going all in</li>
              </ul>

              <div className="bg-primary/10 border border-primary/30 rounded-lg p-5 mb-6">
                <h6 className="font-semibold mb-2 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  How DeFi Alpha Agent Helps You Manage Risk
                </h6>
                <p className="text-sm mb-3">
                  Evaluating risk across thousands of pools manually is impossible. DeFi Alpha Agent does the heavy lifting:
                </p>
                <ul className="text-sm space-y-2">
                  <li>• <strong>Risk-Adjusted Scores</strong> - We calculate scores using APY, TVL, and IL risk factors. Higher scores = better risk/reward.</li>
                  <li>• <strong>TVL Filters</strong> - Instantly filter out low-liquidity pools (under $100K or $1M)</li>
                  <li>• <strong>IL Risk Indicators</strong> - We flag high IL risk pools (volatile pairs) so you know what you're getting into</li>
                  <li>• <strong>APY Trend Warnings</strong> - Red indicators show when APY is declining rapidly</li>
                  <li>• <strong>Stablecoin Pool Filters</strong> - Find low-risk stable pairs with minimal IL exposure</li>
                </ul>
              </div>

              <h5 className="font-medium mb-3 text-base">Reading Our Risk Scores:</h5>
              <p className="mb-6 text-base leading-relaxed">
                On DeFi Alpha Agent, we calculate risk-adjusted scores using this formula: <strong>APY × (TVL Factor) × (1 - IL Risk)</strong>. This means a pool needs good APY, sufficient TVL, AND low impermanent loss risk to score well. A 1000% APY pool with $50K TVL and volatile assets will score lower than a 20% APY pool with $50M TVL in stablecoins.
              </p>
            </CourseModule>

            <CourseModule
              id="auto-compounding"
              title="Module 4: Auto-Compounding Vaults"
              description="Why Beefy and Yearn vaults can boost your returns"
              duration="6 min"
            >
              <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                The Power of Auto-Compounding
              </h4>
              <p className="mb-6 text-base leading-relaxed">
                Manual compounding requires you to claim rewards and re-deposit them regularly - often daily or weekly. This is time-consuming and expensive in gas fees. Auto-compounding vaults like <strong>Beefy</strong>, <strong>Yearn</strong>, <strong>Convex</strong>, and <strong>Gamma</strong> do this automatically, often multiple times per day, dramatically increasing your effective APY.
              </p>

              <h5 className="font-medium mb-3 text-base">The Math Behind Compounding:</h5>
              <div className="bg-muted rounded-lg p-5 mb-6">
                <p className="text-sm font-mono leading-relaxed">
                  <strong>$10,000 at 50% APR with different compounding:</strong><br/><br/>
                  No compounding (claim at year end): $15,000<br/>
                  Monthly compounding: $16,386<br/>
                  Daily compounding: $16,487<br/>
                  Hourly compounding (auto-vault): $16,494<br/><br/>
                  <strong>Auto-compounding = $1,494 more per year!</strong>
                </p>
              </div>

              <h5 className="font-medium mb-3 text-base">How Auto-Compound Vaults Work:</h5>
              <ol className="list-decimal pl-6 space-y-3 mb-6">
                <li><strong>Deposit</strong> - You deposit LP tokens or single assets into the vault</li>
                <li><strong>Harvest</strong> - The vault automatically claims rewards (often every few hours)</li>
                <li><strong>Swap</strong> - Rewards are sold for the underlying assets</li>
                <li><strong>Reinvest</strong> - Assets are re-deposited to increase your position</li>
                <li><strong>Repeat</strong> - This happens automatically, 24/7, without any action from you</li>
              </ol>

              <h5 className="font-medium mb-3 text-base">Benefits of Auto-Compounding:</h5>
              <ul className="list-disc pl-6 space-y-3 mb-6">
                <li><strong>Higher Effective APY</strong> - Frequent compounding can add 10-30% to your returns vs manual claiming</li>
                <li><strong>Massive Gas Savings</strong> - Instead of paying $5-50 per claim, costs are shared across thousands of vault users</li>
                <li><strong>Set and Forget</strong> - No need to manually claim and reinvest. Your money works while you sleep.</li>
                <li><strong>Professional Management</strong> - Vault strategies are optimized by experienced DeFi developers</li>
                <li><strong>Reduced Tax Complexity</strong> - Fewer manual transactions to track (consult your tax advisor)</li>
              </ul>

              <h5 className="font-medium mb-3 text-base">Popular Auto-Compound Platforms:</h5>
              <ul className="list-disc pl-6 space-y-3 mb-6">
                <li><strong>Beefy Finance</strong> - Multi-chain yield optimizer with 1000+ vaults. The largest and most trusted.</li>
                <li><strong>Yearn Finance</strong> - The original yield aggregator on Ethereum, known for sophisticated strategies.</li>
                <li><strong>Convex Finance</strong> - Specializes in boosting Curve LP yields.</li>
                <li><strong>Gamma Strategies</strong> - Automated concentrated liquidity management.</li>
              </ul>

              <div className="bg-primary/10 border border-primary/30 rounded-lg p-5 mb-6">
                <h6 className="font-semibold mb-2 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  How DeFi Alpha Agent Identifies Auto-Compound Opportunities
                </h6>
                <p className="text-sm mb-3">
                  Finding auto-compound vaults for your favorite pools used to require checking multiple sites. DeFi Alpha Agent does this automatically:
                </p>
                <ul className="text-sm space-y-2">
                  <li>• <strong>Green Checkmark Badge</strong> - Pools with available Beefy vaults show a checkmark so you know you can auto-compound</li>
                  <li>• <strong>10% Score Boost</strong> - Auto-compound pools get a risk score boost because of their efficiency</li>
                  <li>• <strong>"Zap In" Links</strong> - Click directly to the protocol's vault page to deposit</li>
                  <li>• <strong>Filter by Auto-Compound</strong> - See only pools where auto-compounding is available</li>
                </ul>
              </div>

              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-5 mb-6">
                <p className="text-sm leading-relaxed">
                  <strong>DeFi Alpha Agent Pro Tip:</strong> When comparing two similar pools, always prefer the one with auto-compounding available. The gas savings and higher effective APY compound over time to make a significant difference!
                </p>
              </div>
            </CourseModule>

            <CourseModule
              id="advanced-strategies"
              title="Module 5: Advanced Strategies"
              description="Leveraged farming, delta-neutral, and CeFi alternatives"
              duration="8 min"
            >
              <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Going Beyond Basic Farming
              </h4>
              <p className="mb-6 text-base leading-relaxed">
                Once you've mastered the basics, advanced strategies can significantly boost your returns - but they also come with increased complexity and risk. Only use these after you're comfortable with standard yield farming.
              </p>

              <h5 className="font-medium mb-3 text-base">Leveraged Farming:</h5>
              <p className="mb-4 text-base leading-relaxed">
                Platforms like Alpaca Finance, Francium, and Gearbox let you borrow funds to amplify your farming position. A 2x leverage means double the exposure - and double the risk.
              </p>
              <div className="bg-muted rounded-lg p-5 mb-6">
                <p className="text-sm font-mono leading-relaxed">
                  <strong>Example: 2x Leveraged ETH-USDC Farming</strong><br/><br/>
                  Your deposit: $5,000<br/>
                  Borrowed: $5,000 (2x leverage)<br/>
                  Total farming position: $10,000<br/>
                  Pool APY: 30%<br/>
                  Annual yield (before costs): $3,000<br/>
                  Borrow interest: -$500<br/>
                  Net yield: $2,500 = 50% on your $5,000<br/><br/>
                  <strong>But if ETH drops 25%: You may get liquidated and lose most of your deposit!</strong>
                </p>
              </div>
              <ul className="list-disc pl-6 space-y-3 mb-6">
                <li><strong>Higher potential returns</strong> - Multiply your yield by your leverage factor</li>
                <li><strong>Liquidation risk</strong> - If prices move against you, you can lose everything</li>
                <li><strong>Borrowing costs</strong> - Interest rates eat into your profits</li>
                <li><strong>Amplified IL</strong> - Impermanent loss is also multiplied by leverage</li>
              </ul>

              <h5 className="font-medium mb-3 text-base">Delta-Neutral Strategies:</h5>
              <p className="mb-4 text-base leading-relaxed">
                These strategies aim to earn yield while minimizing price exposure. You capture the APY without caring whether tokens go up or down.
              </p>
              <ul className="list-disc pl-6 space-y-3 mb-6">
                <li><strong>Stablecoin pairs</strong> - Provide liquidity in USDC-USDT, DAI-USDC, or similar pairs. Minimal IL since prices stay pegged.</li>
                <li><strong>Hedged LP positions</strong> - Farm ETH-USDC while shorting ETH on a perp DEX to neutralize price exposure</li>
                <li><strong>Funding rate arbitrage</strong> - Earn funding payments by holding spot and shorting perps when funding is positive</li>
                <li><strong>Basis trading</strong> - Exploit price differences between spot and futures markets</li>
              </ul>

              <div className="bg-primary/10 border border-primary/30 rounded-lg p-5 mb-6">
                <h6 className="font-semibold mb-2 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  How DeFi Alpha Agent Helps With Advanced Strategies
                </h6>
                <p className="text-sm mb-3">
                  Finding safe delta-neutral opportunities requires filtering through thousands of pools. DeFi Alpha Agent makes it easy:
                </p>
                <ul className="text-sm space-y-2">
                  <li>• <strong>Stablecoin Filter</strong> - One click to see only stable-stable pairs with near-zero IL</li>
                  <li>• <strong>IL Risk Indicators</strong> - Quickly identify low-risk vs high-risk pairs</li>
                  <li>• <strong>APY Sustainability</strong> - See if yields are stable or declining (important for hedged positions)</li>
                  <li>• <strong>Multi-Chain View</strong> - Compare stable yields across Ethereum, Arbitrum, Polygon, and more</li>
                </ul>
              </div>

              <h5 className="font-medium mb-3 text-base">CeFi Alternative: When Simpler is Better</h5>
              <p className="mb-6 text-base leading-relaxed">
                Sometimes the best strategy is the simplest. CeFi (Centralized Finance) platforms offer predictable yields without smart contract risk, impermanent loss, or complex strategies. You give up some upside for peace of mind and simplicity.
              </p>
              <ul className="list-disc pl-6 space-y-3 mb-6">
                <li><strong>No smart contract risk</strong> - Your funds are custodied by regulated companies</li>
                <li><strong>Fixed, predictable rates</strong> - Know exactly what you'll earn</li>
                <li><strong>No impermanent loss</strong> - Just deposit and earn</li>
                <li><strong>Fiat on/off ramps</strong> - Easy to move money in and out</li>
              </ul>
            </CourseModule>

            <CourseModule
              id="tax-tracking"
              title="Module 6: Tax & Portfolio Tracking"
              description="Track your yields and stay compliant"
              duration="6 min"
            >
              <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                Managing Your DeFi Taxes
              </h4>
              <p className="mb-6 text-base leading-relaxed">
                DeFi makes earning yield easy, but tracking taxes can be a nightmare. Unlike traditional finance where brokers send you tax forms, in DeFi you're responsible for tracking everything yourself. The complexity scales with every swap, claim, and deposit.
              </p>

              <h5 className="font-medium mb-3 text-base">Taxable Events in DeFi:</h5>
              <p className="mb-4 text-base leading-relaxed">
                In most jurisdictions (US, UK, EU, Australia, etc.), you may owe taxes on:
              </p>
              <ul className="list-disc pl-6 space-y-3 mb-6">
                <li><strong>Claiming reward tokens</strong> - Often taxed as income at the value when claimed</li>
                <li><strong>Selling or swapping tokens</strong> - Capital gains/losses on the difference from your cost basis</li>
                <li><strong>Withdrawing from LPs</strong> - Complex calculation based on the tokens you receive vs deposited</li>
                <li><strong>Token airdrops</strong> - Usually taxed as income when received</li>
                <li><strong>Bridging tokens</strong> - May trigger taxable events in some jurisdictions</li>
              </ul>

              <h5 className="font-medium mb-3 text-base">The DeFi Tax Nightmare:</h5>
              <div className="bg-muted rounded-lg p-5 mb-6">
                <p className="text-sm leading-relaxed">
                  <strong>A typical DeFi farmer's year might include:</strong><br/><br/>
                  • 500+ token swaps across DEXs<br/>
                  • 50+ reward claims from various protocols<br/>
                  • 20+ LP deposits and withdrawals<br/>
                  • Transactions across 5+ different blockchains<br/>
                  • Airdrops, rebases, and auto-compounds<br/><br/>
                  <strong>Manually tracking all this? Impossible.</strong>
                </p>
              </div>

              <h5 className="font-medium mb-3 text-base">Why Use a Crypto Tax Tool:</h5>
              <ul className="list-disc pl-6 space-y-3 mb-6">
                <li><strong>Automatic import</strong> - Connect wallets and exchanges to pull all transactions automatically</li>
                <li><strong>Multi-chain support</strong> - Track Ethereum, BSC, Polygon, Arbitrum, Solana, and 100+ more</li>
                <li><strong>Cost basis calculation</strong> - FIFO, LIFO, HIFO, and other methods calculated automatically</li>
                <li><strong>DeFi-specific support</strong> - LP deposits, farming rewards, and complex DeFi events handled correctly</li>
                <li><strong>Tax reports</strong> - Generate reports for TurboTax, your accountant, or direct to tax authorities</li>
                <li><strong>Year-round tracking</strong> - Not just at tax time - monitor your unrealized gains throughout the year</li>
              </ul>

              <div className="bg-primary/10 border border-primary/30 rounded-lg p-5 mb-6">
                <h6 className="font-semibold mb-2 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  How DeFi Alpha Agent Complements Tax Tracking
                </h6>
                <p className="text-sm mb-3">
                  While DeFi Alpha Agent helps you find opportunities, you'll want to track everything you do for tax purposes:
                </p>
                <ul className="text-sm space-y-2">
                  <li>• <strong>Find pools on DeFi Alpha Agent</strong> → Track deposits in your tax tool</li>
                  <li>• <strong>Use our APY data</strong> → Estimate your taxable income from farming</li>
                  <li>• <strong>Multi-chain visibility</strong> → Know which chains you've used (and need to import)</li>
                  <li>• <strong>Protocol links</strong> → Easy access to protocols for transaction history</li>
                </ul>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-5 mb-6">
                <p className="text-sm leading-relaxed">
                  <strong>Pro Tip:</strong> Start tracking from day one! Trying to reconstruct your DeFi history at tax time is painful and expensive. Connect your wallets to a tax tool before you start farming, not after.
                </p>
              </div>
            </CourseModule>

            <CourseModule
              id="airdrop-farming"
              title="Module 7: Airdrop Farming"
              description="Earn free tokens with minimal capital"
              duration="8 min"
            >
              <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Gift className="h-5 w-5 text-purple-500" />
                What are Crypto Airdrops?
              </h4>
              <p className="mb-6 text-base leading-relaxed">
                <strong>Airdrops</strong> are free token distributions from blockchain projects to early users, community members, or people who complete specific tasks. They're one of the best ways to earn in crypto with minimal upfront capital - making DeFi accessible to everyone, not just "rich people."
              </p>

              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-5 mb-6">
                <h6 className="font-semibold mb-2 flex items-center gap-2">
                  <Gift className="h-4 w-4 text-purple-400" />
                  Why Airdrops Matter
                </h6>
                <p className="text-sm leading-relaxed">
                  Unlike yield farming where you need capital to earn, airdrops reward you for <strong>using protocols early</strong>. Many crypto success stories started with receiving free tokens that later became worth thousands of dollars. The Uniswap airdrop gave users $1,200+ just for having used the DEX!
                </p>
              </div>

              <h5 className="font-medium mb-3 text-base">Types of Airdrops:</h5>
              <ul className="list-disc pl-6 space-y-3 mb-6">
                <li><strong>Retroactive Airdrops</strong> - Rewards for past usage of a protocol (e.g., Uniswap, Optimism, Arbitrum). The most valuable but unpredictable.</li>
                <li><strong>Testnet Airdrops</strong> - Use protocols on test networks before mainnet launch. Low cost, just requires time.</li>
                <li><strong>Social/Task Airdrops</strong> - Follow accounts, join Discord, complete quests. Easy but usually smaller rewards.</li>
                <li><strong>Holder Airdrops</strong> - Hold specific tokens to receive new ones. Snapshot-based distributions.</li>
                <li><strong>Liquidity Provider Airdrops</strong> - Provide liquidity to earn future tokens. Combines yield + airdrop potential.</li>
              </ul>

              <h5 className="font-medium mb-3 text-base">How to Farm Airdrops Effectively:</h5>
              <div className="bg-muted rounded-lg p-5 mb-6">
                <ol className="list-decimal pl-5 space-y-3 text-sm">
                  <li><strong>Find "Tokenless" Protocols</strong> - Projects without a token yet are prime airdrop candidates. DeFiLlama tracks these!</li>
                  <li><strong>Use Protocols Regularly</strong> - Don't just make one transaction. Regular activity often earns more rewards.</li>
                  <li><strong>Bridge & Try New Chains</strong> - Early users of new L2s often receive airdrops (Optimism, Arbitrum, zkSync, etc.)</li>
                  <li><strong>Participate in Governance</strong> - Vote on proposals, join DAOs, be an active community member.</li>
                  <li><strong>Use Testnets</strong> - Many projects reward testnet users when they launch mainnet.</li>
                  <li><strong>Don't Forget Small Chains</strong> - Less competition = higher allocation per user.</li>
                </ol>
              </div>

              <h5 className="font-medium mb-3 text-base">Top Airdrop Hunting Resources:</h5>
              <ul className="list-disc pl-6 space-y-3 mb-6">
                <li><strong>DeFiLlama Airdrops Page</strong> - Lists tokenless protocols that may airdrop. Check eligibility with their checker tool.</li>
                <li><strong>Layer3, Galxe, Zealy</strong> - Quest platforms where completing tasks earns you points/tokens.</li>
                <li><strong>Twitter/X Crypto Communities</strong> - Follow airdrop hunters who share opportunities.</li>
                <li><strong>Protocol Discords</strong> - Join early, participate in discussions, learn about upcoming snapshots.</li>
              </ul>

              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-5 mb-6">
                <h6 className="font-semibold mb-2 text-red-400">Airdrop Safety Tips</h6>
                <ul className="text-sm space-y-2">
                  <li>• <strong>Never share your seed phrase</strong> - Legitimate airdrops will NEVER ask for it</li>
                  <li>• <strong>Use a dedicated wallet</strong> - Don't airdrop farm with your main holdings wallet</li>
                  <li>• <strong>Verify official links</strong> - Scammers create fake airdrop sites. Always verify on official Discord/Twitter</li>
                  <li>• <strong>Be wary of "claim" sites</strong> - Many phishing sites pretend to be airdrop claims</li>
                  <li>• <strong>Revoke approvals</strong> - Regularly check and revoke unnecessary token approvals</li>
                </ul>
              </div>

              <div className="bg-primary/10 border border-primary/30 rounded-lg p-5 mb-6">
                <h6 className="font-semibold mb-2 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Check Your Airdrop Eligibility
                </h6>
                <p className="text-sm mb-4">
                  DeFiLlama offers a free tool to check if your wallet is eligible for any claimable airdrops. We've added a quick link in our header!
                </p>
                <a href="https://defillama.com/airdrops" target="_blank" rel="noopener noreferrer">
                  <Button className="bg-purple-600 hover:bg-purple-700 w-full sm:w-auto text-sm" size="sm" data-testid="button-defillama-airdrops">
                    <Gift className="h-4 w-4 mr-2 shrink-0" />
                    <span className="truncate">Check Airdrops on DeFiLlama</span>
                    <ExternalLink className="h-4 w-4 ml-2 shrink-0" />
                  </Button>
                </a>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-5 mb-6">
                <p className="text-sm leading-relaxed">
                  <strong>Pro Tip:</strong> The best airdrop farmers combine strategies - they provide liquidity on new DEXs (earning yield + potential airdrop), use bridges to new chains early, and actively participate in protocol governance. It's not just about clicking around; genuine protocol usage is usually rewarded more.
                </p>
              </div>
            </CourseModule>

            <div className="mt-8 p-6 bg-gradient-to-r from-primary/10 to-chart-2/10 rounded-lg border">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold mb-1">Ready to Find Alpha?</h3>
                  <p className="text-muted-foreground">Apply what you learned and discover high-yield opportunities.</p>
                </div>
                <Link href="/">
                  <Button size="lg" data-testid="button-go-to-dashboard">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Go to Dashboard
                  </Button>
                </Link>
              </div>
            </div>

            <div className="mt-6 p-5 rounded-lg bg-gradient-to-r from-pink-500/10 via-rose-500/10 to-orange-500/10 border border-pink-500/20">
              <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 shrink-0">
                  <Trophy className="h-7 w-7 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-lg mb-1">
                    <span className="bg-gradient-to-r from-pink-400 to-orange-400 bg-clip-text text-transparent">
                      Congrats on Completing the Course!
                    </span>
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    You now have the knowledge to navigate DeFi safely. Take the next step — get live AI guidance on the safest yields.
                  </p>
                  <Link href="/">
                    <Button variant="default" className="gap-2">
                      <Crown className="h-4 w-4" />
                      Explore live yields with Alpha Brain
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="lg:sticky lg:top-24 space-y-6">
              <CourseProgress />
              
              </div>
          </div>
        </div>
      </main>

      <footer className="border-t mt-8">
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Follow</span>
              <a
                href="https://x.com/defialphaagent"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-medium text-foreground hover:text-primary transition-colors"
                data-testid="link-follow-twitter-learn"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                @DefiAlphaAgent
              </a>
              <span>for daily alerts</span>
            </div>
            <span className="hidden sm:inline text-muted-foreground/50">|</span>
            <div className="flex items-center gap-2">
              <span>Business Inquiries & Advertising:</span>
              <a
                href="https://x.com/defialphaagent"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-medium text-foreground hover:text-primary transition-colors"
                data-testid="link-contact-twitter-learn"
              >
                DM @DefiAlphaAgent
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
