import { Header } from "@/components/landing/header";
import { PlayfulHeroSection } from "@/components/heros/playful-hero-section";
import WithProductScreenshot from "@/components/feature-sections/with-product-screenshot";
import { TestimonialsGridWithCenteredCarousel } from "@/components/testimonials/testimonials-grid-with-centered-carousel";
import SimpleCenteredWithGradient from "@/components/ctas/simple-centered-with-gradients";
import { SimpleFooterWithFourGrids } from "@/components/footers/simple-footer-with-four-grids";

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <Header />
      <PlayfulHeroSection />
      <section id="how-it-works">
        <WithProductScreenshot />
      </section>
      {/* <section id="testimonials">
        <TestimonialsGridWithCenteredCarousel />
      </section> */}
      <SimpleCenteredWithGradient />
      <SimpleFooterWithFourGrids />
    </main>
  );
}
