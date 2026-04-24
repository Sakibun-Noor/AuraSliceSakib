import TopNav from "@/components/TopNav";
import LeaderboardView from "@/components/LeaderboardView";

export const metadata = {
  title: "Leaderboard · Aura Slice",
};

export default function LeaderboardPage() {
  return (
    <>
      <TopNav />
      <LeaderboardView />
    </>
  );
}
