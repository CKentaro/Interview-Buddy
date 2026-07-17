import { LandingHeader } from "@/components/landing/LandingHeader";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { ClosingCTA } from "@/components/landing/ClosingCTA";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <LandingHeader />
      <main style={{ flex: 1 }}>
        <Hero />
        <div className="hr" style={{ maxWidth: 1120, margin: "0 auto" }} />
        <Features />
        <ClosingCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
