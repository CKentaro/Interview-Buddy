import { LandingHeader } from "@/components/landing/LandingHeader";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { ClosingCTA } from "@/components/landing/ClosingCTA";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function LandingPage() {
  return (
    <>
      <LandingHeader />
      <main>
        <Hero />
        <Features />
        <ClosingCTA />
      </main>
      <LandingFooter />
    </>
  );
}
