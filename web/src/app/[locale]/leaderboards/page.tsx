import { permanentRedirect } from "@/i18n/navigation";

// The leaderboards start with the top scorers.
export default async function LeaderboardsIndex({ params }: { params: Promise<{ locale: string }> }) {
  permanentRedirect({ href: "/leaderboards/goals", locale: (await params).locale });
}
