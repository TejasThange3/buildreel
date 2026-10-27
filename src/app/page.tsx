import { Closing } from "@/ui/landing/Closing";
import { Hero } from "@/ui/landing/Hero";
import { HowItWorks } from "@/ui/landing/HowItWorks";
import { SteerSection } from "@/ui/landing/SteerSection";

export default function Home() {
  return (
    <main>
      <Hero />
      <HowItWorks />
      <SteerSection />
      <Closing />
    </main>
  );
}
