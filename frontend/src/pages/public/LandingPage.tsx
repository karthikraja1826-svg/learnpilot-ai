import { AIPlanningSection } from '../../components/landing/AIPlanningSection';
import { AnalyticsShowcase } from '../../components/landing/AnalyticsShowcase';
import { FeatureSection } from '../../components/landing/FeatureSection';
import { FinalCTA } from '../../components/landing/FinalCTA';
import { FocusShowcase } from '../../components/landing/FocusShowcase';
import { Footer } from '../../components/landing/Footer';
import { HeroSection } from '../../components/landing/HeroSection';
import { HowItWorks } from '../../components/landing/HowItWorks';
import { Navbar } from '../../components/landing/Navbar';
import { StudyPlanShowcase } from '../../components/landing/StudyPlanShowcase';
import { ValueStrip } from '../../components/landing/ValueStrip';

export function LandingPage() {
  return (
    <>
      <Navbar />
      <HeroSection />
      <ValueStrip />
      <FeatureSection />
      <HowItWorks />
      <StudyPlanShowcase />
      <AIPlanningSection />
      <FocusShowcase />
      <AnalyticsShowcase />
      <FinalCTA />
      <Footer />
    </>
  );
}
