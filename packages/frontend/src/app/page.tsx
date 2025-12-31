import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🏏</span>
            <span className="text-2xl font-bold text-green-700 dark:text-green-400">
              Bidzr
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/auth/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/auth/register">
              <Button className="gradient-cricket text-white">Get Started</Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Sports Auction
            <span className="text-green-600 dark:text-green-400"> Made Simple</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Create and manage real-time sports auctions. Perfect for cricket leagues,
            fantasy sports, and team drafts. Built for speed and excitement.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/register">
              <Button size="lg" className="gradient-cricket text-white px-8">
                Start Your Auction
              </Button>
            </Link>
            <Link href="/auctions">
              <Button size="lg" variant="outline" className="px-8">
                Browse Auctions
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-24 grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <FeatureCard
            icon="⚡"
            title="Real-time Bidding"
            description="Live bidding with instant updates. Every bid is broadcast to all participants in real-time."
          />
          <FeatureCard
            icon="🎯"
            title="Smart Timer"
            description="30-second countdown resets on each bid. No more waiting - action-packed auctions."
          />
          <FeatureCard
            icon="📊"
            title="Budget Tracking"
            description="Automatic budget management for teams. Track spending and remaining purse instantly."
          />
        </div>

        {/* Sports Support */}
        <div className="mt-24 text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
            Multiple Sports Supported
          </h2>
          <div className="flex flex-wrap justify-center gap-6">
            <SportBadge emoji="🏏" name="Cricket" active />
            <SportBadge emoji="⚽" name="Football" />
            <SportBadge emoji="🏀" name="Basketball" />
            <SportBadge emoji="🤼" name="Kabaddi" />
          </div>
        </div>

        {/* User Roles */}
        <div className="mt-24 max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-12">
            Designed for Everyone
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <RoleCard
              title="Admin"
              description="Create auctions, set budgets, define player roles and base prices. Full control over the auction flow."
              icon="👑"
            />
            <RoleCard
              title="Team Owner"
              description="Register your team, participate in real-time bidding, and build your dream squad within budget."
              icon="🏆"
            />
            <RoleCard
              title="Player"
              description="Register for auctions, choose your role and base price. Get picked by the best teams."
              icon="⭐"
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-16 border-t">
        <div className="flex flex-col md:flex-row items-center justify-between text-gray-600 dark:text-gray-400">
          <p>© 2024 Bidzr. All rights reserved.</p>
          <div className="flex items-center space-x-6 mt-4 md:mt-0">
            <Link href="/privacy" className="hover:text-green-600">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-green-600">
              Terms
            </Link>
            <Link href="/contact" className="hover:text-green-600">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-300">{description}</p>
    </div>
  );
}

function SportBadge({
  emoji,
  name,
  active = false,
}: {
  emoji: string;
  name: string;
  active?: boolean;
}) {
  return (
    <div
      className={`flex items-center space-x-2 px-4 py-2 rounded-full ${
        active
          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
      }`}
    >
      <span className="text-xl">{emoji}</span>
      <span className="font-medium">{name}</span>
      {active && (
        <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">
          Live
        </span>
      )}
    </div>
  );
}

function RoleCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border-t-4 border-green-500">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-300">{description}</p>
    </div>
  );
}
