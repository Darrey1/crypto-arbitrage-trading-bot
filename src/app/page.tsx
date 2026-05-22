'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, CheckCircle2, TrendingUp, Shield, BarChart3, Globe, Bell, Cpu, Activity } from 'lucide-react'
import { formatPrice, formatPercent } from '@/lib/utils'
import dynamic from 'next/dynamic'

const ScatterBackground = dynamic(
  () => import('@/components/ScatterBackground').then((m) => m.ScatterBackground),
  { ssr: false }
)

const MOCK_PRICES = [
  { exchange: 'Binance', price: 3245.82, change: +0.34 },
  { exchange: 'Kraken',  price: 3247.10, change: +0.38 },
  { exchange: 'KuCoin',  price: 3244.65, change: +0.31 },
]

const MOCK_OPPORTUNITIES = [
  { pair: 'ETH/USDT', from: 'Binance', to: 'Kraken',  spread: '0.47%', profit: '$4.70' },
  { pair: 'ETH/USDT', from: 'KuCoin',  to: 'Kraken',  spread: '0.38%', profit: '$3.80' },
  { pair: 'BTC/USDT', from: 'Binance', to: 'KuCoin',  spread: '0.29%', profit: '$8.70' },
  { pair: 'ETH/BTC',  from: 'Kraken',  to: 'Binance', spread: '0.52%', profit: '$5.20' },
]

const FEATURES = [
  { icon: TrendingUp, title: 'Real-Time Detection',  desc: 'Sub-second price scanning across all 3 exchanges. Every opportunity, every second.' },
  { icon: Cpu,        title: 'Auto Execution',       desc: 'Trades fire the moment a spread exceeds your threshold. Zero manual intervention.' },
  { icon: Shield,     title: 'Risk Controls',        desc: 'Daily loss limits, slippage protection, and emergency stop protect your capital.' },
  { icon: BarChart3,  title: 'Deep Analytics',       desc: 'P&L curves, win rate, hourly heatmaps, and route performance in one dashboard.' },
  { icon: Globe,      title: '3 CEX Exchanges',      desc: 'Binance, Kraken, and KuCoin — highest liquidity, lowest latency, best APIs.' },
  { icon: Bell,       title: 'Smart Alerts',         desc: 'Push notifications for opportunities, executed trades, and daily P&L summaries.' },
]

const STATS = [
  { value: '3',    suffix: '',  label: 'Exchanges' },
  { value: '0.3',  suffix: 's', label: 'Avg Execution' },
  { value: '12',   suffix: '+', label: 'Pairs Tracked' },
  { value: '99.8', suffix: '%', label: 'Uptime' },
]

function TickerBar() {
  const items = [
    'Binance  ETH/USDT  $3,245.82  +0.34%',
    'Kraken   ETH/USDT  $3,247.10  +0.38%',
    'KuCoin   ETH/USDT  $3,244.65  +0.31%',
    'Binance  BTC/USDT  $67,234.10  +0.82%',
    'Kraken   BTC/USDT  $67,240.50  +0.84%',
    'Spread Alert  ETH/USDT  0.47%  Binance→Kraken',
    'KuCoin   ETH/BTC  0.04823  -0.11%',
  ]

  return (
    <div
      className="overflow-hidden py-2.5"
      style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
    >
      <div className="flex animate-ticker whitespace-nowrap">
        {[...items, ...items].map((item, i) => (
          <span key={i} className="text-[11px] font-mono mx-8" style={{ color: 'var(--text-2)' }}>
            <span style={{ color: 'var(--accent)' }} className="mr-2">◆</span>
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'var(--bg)' }}>
      <ScatterBackground />

      {/* ── Navbar ── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          background: 'var(--header-bg)',
          borderBottom: '1px solid var(--border)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--accent)' }}
            >
              {/* <span className="text-[#070707] font-black text-sm leading-none">A</span> */}
              <Activity className="w-3.5 h-3.5 text-[#070707]" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-base tracking-tight" style={{ color: 'var(--text-1)' }}>
              ArbMatrix
            </span>
          </Link>

          {/* Center badge */}
          <div
            className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium"
            style={{
              background: 'var(--accent-bg)',
              border: '1px solid rgba(236,189,116,0.2)',
              color: 'var(--accent)',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse-dot" />
            CEX Arbitrage Live on 3 Exchanges
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="btn-primary text-sm font-semibold px-5 py-2 rounded-full flex items-center gap-1.5"
            >
              Start Trading
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Ticker */}
      <div className="mt-16 relative z-10">
        <TickerBar />
      </div>

      {/* ── Hero ── */}
      <section className="relative z-10 pt-28 pb-36 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          {/* Label */}
          <p
            className="text-xs font-semibold tracking-[0.2em] uppercase mb-6"
            style={{ color: 'var(--text-2)' }}
          >
            Ethereum · Binance · Kraken · KuCoin
          </p>

          {/* Heading */}
          <h1
            className="font-black leading-[1.05] mb-7"
            style={{
              fontSize: 'clamp(48px, 8vw, 88px)',
              color: 'var(--text-1)',
              letterSpacing: '-0.03em',
            }}
          >
            Arbitrage{' '}
            <span style={{ color: 'var(--accent)' }}>automated.</span>
          </h1>

          {/* Subtext */}
          <p
            className="text-lg leading-relaxed mb-10 max-w-2xl mx-auto"
            style={{ color: 'var(--text-2)' }}
          >
            ArbMatrix scans ETH price gaps across 3 exchanges in real-time and executes
            trades automatically, so you profit from market inefficiencies around the clock.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="btn-primary flex items-center gap-2 px-8 py-3.5 rounded-full font-semibold text-base w-full sm:w-auto justify-center"
              style={{ fontSize: '15px' }}
            >
              Open Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/auth/register"
              className="btn-ghost flex items-center gap-2 px-8 py-3.5 rounded-full font-semibold text-base w-full sm:w-auto justify-center"
              style={{ fontSize: '15px' }}
            >
              Try Paper Trading Free
            </Link>
          </div>
        </div>

        {/* Hero visual + supporting cards (no overlap) */}
        <div className="mt-20 max-w-4xl mx-auto">
          <div
            className="rounded-2xl overflow-hidden shadow-xl"
            style={{ border: '1px solid var(--border)', background: '#060709' }}
          >
            <Image
              src="/cryptotradinghomepage.jpeg"
              alt="Crypto trading dashboard"
              width={1280}
              height={701}
              className="block w-full h-auto object-cover md:h-[520px] md:object-contain"
              priority
            />
         

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 text-left">
            {/* Live prices */}
            <div
              className="rounded-2xl p-5"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: 'var(--text-3)' }}>
                  ETH / USDT
                </span>
                <div className="live-dot" />
              </div>
              {MOCK_PRICES.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2"
                  style={{ borderBottom: i < 2 ? '1px solid var(--border-2)' : 'none' }}
                >
                  <span className="text-xs" style={{ color: 'var(--text-3)' }}>{p.exchange}</span>
                  <span
                    className="text-sm font-mono font-semibold"
                    style={{ color: i === 1 ? '#22c55e' : 'var(--text-1)' }}
                  >
                    ${formatPrice(p.price)}
                  </span>
                  <span className="text-xs font-mono text-emerald-400">{formatPercent(p.change)}</span>
                </div>
              ))}
            </div>

            {/* Live opportunity */}
            <div
              className="rounded-2xl p-5"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderColor: 'rgba(236,189,116,0.2)',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <span
                  className="text-[11px] font-semibold tracking-widest uppercase"
                  style={{ color: 'var(--accent)' }}
                >
                  Live Opportunity
                </span>
                <span className="badge-purple text-[10px] px-2 py-0.5 rounded-full">DETECTED</span>
              </div>
              <div className="text-center py-3">
                <div
                  className="text-4xl font-black font-mono mb-1"
                  style={{ color: 'var(--accent)', letterSpacing: '-0.02em' }}
                >
                  +0.47%
                </div>
                <div className="text-xs" style={{ color: 'var(--text-3)' }}>
                  net spread after fees
                </div>
              </div>
              <div
                className="rounded-xl p-3 mt-2"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border-2)' }}
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="text-center">
                    <div className="mb-1" style={{ color: 'var(--text-3)' }}>Buy on</div>
                    <div className="font-semibold text-amber-400">Binance</div>
                    <div className="font-mono mt-0.5" style={{ color: 'var(--text-2)' }}>$3,245.82</div>
                  </div>
                  <ArrowRight className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                  <div className="text-center">
                    <div className="mb-1" style={{ color: 'var(--text-3)' }}>Sell on</div>
                    <div className="font-semibold" style={{ color: 'var(--text-1)' }}>Kraken</div>
                    <div className="font-mono mt-0.5" style={{ color: 'var(--text-2)' }}>$3,247.10</div>
                  </div>
                </div>
                <div
                  className="mt-3 flex items-center justify-between text-xs pt-2"
                  style={{ borderTop: '1px solid var(--border-2)' }}
                >
                  <span style={{ color: 'var(--text-3)' }}>Est. on $1,000</span>
                  <span className="font-semibold font-mono text-emerald-400">+$4.70</span>
                </div>
              </div>
            </div>

            {/* Today stats */}
            <div
              className="rounded-2xl p-5"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="text-[11px] font-semibold tracking-widest uppercase mb-4" style={{ color: 'var(--text-3)' }}>
                Today&apos;s Performance
              </div>
              {[
                { label: 'Opportunities', value: '47' },
                { label: 'Trades Executed', value: '12' },
                { label: 'Net Profit', value: '+$124.50', gold: true },
                { label: 'Win Rate', value: '91.6%', green: true },
              ].map(({ label, value, gold, green }) => (
                <div
                  key={label}
                  className="flex items-center justify-between py-2"
                  style={{ borderBottom: label !== 'Win Rate' ? '1px solid var(--border-2)' : 'none' }}
                >
                  <span className="text-xs" style={{ color: 'var(--text-3)' }}>{label}</span>
                  <span
                    className="text-sm font-mono font-semibold"
                    style={{ color: gold ? 'var(--accent)' : green ? '#22c55e' : 'var(--text-1)' }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
           </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section
        className="relative z-10 py-14 px-6"
        style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="max-w-3xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {STATS.map(({ value, suffix, label }) => (
            <div key={label}>
              <div
                className="text-5xl font-black font-mono mb-1"
                style={{ color: 'var(--accent)', letterSpacing: '-0.03em' }}
              >
                {value}<span style={{ color: 'var(--text-2)' }}>{suffix}</span>
              </div>
              <div className="text-sm" style={{ color: 'var(--text-3)' }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="relative z-10 py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p
              className="text-xs font-semibold tracking-[0.18em] uppercase mb-4"
              style={{ color: 'var(--accent)' }}
            >
              Simple Process
            </p>
            <h2
              className="font-black mb-4"
              style={{
                fontSize: 'clamp(32px, 5vw, 52px)',
                color: 'var(--text-1)',
                letterSpacing: '-0.02em',
              }}
            >
              Up and running in minutes.
            </h2>
            <p className="text-base max-w-lg mx-auto" style={{ color: 'var(--text-2)' }}>
              Connect your keys. Set your limits. The bot handles the rest.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { n: '01', title: 'Fund Your Account',     desc: 'Deposit funds into your trading account to start arbitraging.' },
              { n: '02', title: 'Configure Strategy',   desc: 'Set minimum spread, trade size, and risk limits. Choose Paper or Live mode.' },
              { n: '03', title: 'Bot Does the Work',    desc: 'The engine scans prices, detects spreads, and executes at machine speed.' },
            ].map(({ n, title, desc }) => (
              <div
                key={n}
                className="rounded-2xl p-7 group transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(236,189,116,0.25)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                <div
                  className="text-4xl font-black font-mono mb-5 leading-none"
                  style={{ color: 'var(--accent)', opacity: 0.7 }}
                >
                  {n}
                </div>
                <h3 className="text-base font-bold mb-2" style={{ color: 'var(--text-1)' }}>
                  {title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section
        id="features"
        className="relative z-10 py-28 px-6"
        style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p
              className="text-xs font-semibold tracking-[0.18em] uppercase mb-4"
              style={{ color: 'var(--text-3)' }}
            >
              Capabilities
            </p>
            <h2
              className="font-black"
              style={{
                fontSize: 'clamp(32px, 5vw, 52px)',
                color: 'var(--text-1)',
                letterSpacing: '-0.02em',
              }}
            >
              Everything you need to arb.
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-2xl p-6 transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(236,189,116,0.2)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: 'var(--accent-bg)' }}
                >
                  <Icon className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                </div>
                <h3 className="font-semibold mb-2" style={{ color: 'var(--text-1)', fontSize: '15px' }}>
                  {title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Exchanges ── */}
      <section id="exchanges" className="relative z-10 py-28 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p
              className="text-xs font-semibold tracking-[0.18em] uppercase mb-4"
              style={{ color: 'var(--text-3)' }}
            >
              Integrated Exchanges
            </p>
            <h2
              className="font-black mb-4"
              style={{
                fontSize: 'clamp(32px, 5vw, 52px)',
                color: 'var(--text-1)',
                letterSpacing: '-0.02em',
              }}
            >
              3 Exchanges. Maximum coverage.
            </h2>
            <p className="text-base max-w-lg mx-auto" style={{ color: 'var(--text-2)' }}>
              Hand-picked for API reliability, deep liquidity, and Ethereum coverage.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              { name: 'Binance',  letter: 'B', color: '#F0B90B', desc: "World's largest CEX. Deepest ETH/USDT liquidity, lowest fees at 0.1%.", fee: '0.10%' },
              { name: 'Kraken',   letter: 'K', color: '#9945FF', desc: 'Most trusted exchange. No geo-restrictions, comprehensive REST + WebSocket API.', fee: '0.20%' },
              { name: 'KuCoin',   letter: 'K', color: '#23AF91', desc: 'Easiest API onboarding. No KYC for basic access, 0.1% fee with KCS discount.', fee: '0.10%' },
            ].map(({ name, letter, color, desc, fee }) => (
              <div
                key={name}
                className="rounded-2xl p-6 transition-all duration-200 hover:-translate-y-0.5"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = `${color}33`)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-lg font-black"
                    style={{ background: `${color}18`, border: `1px solid ${color}30`, color }}
                  >
                    {letter}
                  </div>
                  <div>
                    <div className="font-semibold" style={{ color: 'var(--text-1)', fontSize: '15px' }}>
                      {name}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-3)' }}>Maker fee: {fee}</div>
                  </div>
                </div>
                <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-2)' }}>{desc}</p>
                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-3)' }}>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  WebSocket + REST API
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Live Demo ── */}
      <section
  className="relative z-10 py-20 px-4 md:py-28 md:px-6"
  style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}
>
  <div className="max-w-4xl mx-auto">
    <div className="text-center mb-12">
      <p
        className="text-xs font-semibold tracking-[0.18em] uppercase mb-4"
        style={{ color: 'var(--text-3)' }}
      >
        Live Demo
      </p>
      <h2
        className="font-black"
        style={{
          fontSize: 'clamp(28px, 5vw, 52px)',
          color: 'var(--text-1)',
          letterSpacing: '-0.02em',
        }}
      >
        See it in action.
      </h2>
    </div>

    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
    >
      {/* Header */}
      <div
        className="px-4 py-3.5 flex items-center gap-3 flex-wrap"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="live-dot" />
        <span className="text-xs font-semibold" style={{ color: 'var(--text-1)' }}>
          Live Opportunity Feed
        </span>
        <span className="ml-auto text-[11px] font-mono" style={{ color: 'var(--text-3)' }}>
          scanning every 800ms
        </span>
      </div>

      {MOCK_OPPORTUNITIES.map((opp, i) => (
        <div
          key={i}
          className="px-4 py-4 transition-colors"
          style={{
            borderBottom: i < MOCK_OPPORTUNITIES.length - 1 ? '1px solid var(--border-2)' : 'none',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          {/* Top row: pair + exchange route + execute button */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-mono font-semibold" style={{ color: 'var(--text-1)' }}>
              {opp.pair}
            </span>
            <div className="flex items-center gap-1.5 text-xs flex-1 px-2" style={{ color: 'var(--text-3)' }}>
              {opp.from}
              <ArrowRight className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--accent)' }} />
              {opp.to}
            </div>
            <Link
              href="/dashboard"
              className="btn-primary text-xs px-3 py-1.5 rounded-lg flex-shrink-0"
            >
              Execute
            </Link>
          </div>

          {/* Bottom row: spread + profit */}
          <div className="flex items-center gap-6">
            <div>
              <div className="text-sm font-mono font-semibold" style={{ color: 'var(--accent)' }}>
                {opp.spread}
              </div>
              <div className="text-[10px]" style={{ color: 'var(--text-3)' }}>net spread</div>
            </div>
            <div>
              <div className="text-sm font-mono font-semibold text-emerald-400">{opp.profit}</div>
              <div className="text-[10px]" style={{ color: 'var(--text-3)' }}>per $1K</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
</section>

      {/* ── CTA ── */}
      <section className="relative z-10 py-28 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <p
            className="text-xs font-semibold tracking-[0.18em] uppercase mb-6"
            style={{ color: 'var(--text-3)' }}
          >
            Get Started Today
          </p>
          <h2
            className="font-black mb-5"
            style={{
              fontSize: 'clamp(32px, 5vw, 56px)',
              color: 'var(--text-1)',
              letterSpacing: '-0.025em',
              lineHeight: 1.1,
            }}
          >
            Start your first arb trade
            <br />
            <span style={{ color: 'var(--accent)' }}>in under 5 minutes.</span>
          </h2>
          <p className="text-base mb-10" style={{ color: 'var(--text-2)' }}>
            Begin in Paper Trading with $10,000 virtual funds.
            Graduate to live trading when you&apos;re ready.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/dashboard"
              className="btn-primary flex items-center justify-center gap-2 px-8 py-3.5 rounded-full font-semibold text-base"
            >
              Open Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/auth/register"
              className="btn-ghost flex items-center justify-center gap-2 px-8 py-3.5 rounded-full font-semibold text-base"
            >
              Create Free Account
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        className="relative z-10 py-12 px-6"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-start gap-10 mb-10">
            <div className="flex-shrink-0">
              <Link href="/" className="flex items-center gap-2.5 mb-3">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--accent)' }}
                >
                  {/* <span className="text-[#070707] font-black text-xs">A</span> */}
                   <Activity className="w-3.5 h-3.5 text-[#070707]" strokeWidth={2.5} />
                </div>
                <span className="font-bold" style={{ color: 'var(--text-1)' }}>ArbMatrix</span>
              </Link>
              <p className="text-sm leading-relaxed max-w-xs" style={{ color: 'var(--text-3)' }}>
                Automated CEX arbitrage for ETH across Binance, Kraken, and KuCoin.
              </p>
            </div>
            <div className="flex-1 grid grid-cols-3 gap-8">
              {[
                { title: 'Product',   links: ['Dashboard', 'Bot Engine', 'Analytics', 'Settings'] },
                { title: 'Exchanges', links: ['Binance', 'Kraken', 'KuCoin'] },
                { title: 'Legal',     links: ['Terms', 'Privacy', 'Risk Disclosure'] },
              ].map(({ title, links }) => (
                <div key={title}>
                  <div
                    className="text-[11px] font-semibold uppercase tracking-wider mb-3"
                    style={{ color: 'var(--text-3)' }}
                  >
                    {title}
                  </div>
                  <ul className="space-y-2">
                    {links.map(l => (
                      <li key={l}>
                        <a
                          href="#"
                          className="text-xs transition-opacity hover:opacity-60"
                          style={{ color: 'var(--text-2)' }}
                        >
                          {l}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <div
            className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4"
            style={{ borderTop: '1px solid var(--border-2)' }}
          >
            <span className="text-xs" style={{ color: 'var(--text-3)' }}>
              © {new Date().getFullYear()} ArbMatrix. Not financial advice. Trade at your own risk.
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
