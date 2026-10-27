import { IntroHeader } from "./components/IntroHeader";
import { IntroHero } from "./components/IntroHero";
import { ServiceCatalog } from "./components/ServiceCatalog";
import { GettingStarted } from "./components/GettingStarted";
import { IntroContact } from "./components/IntroContact";
import { IntroFaq } from "./components/IntroFaq";
import { RoleSection } from "./components/RoleSection";
import { ProductShowcase } from "./components/ProductShowcase";
import { IntroFooter } from "./components/IntroFooter";
import "./styles/intro.css";

interface BusinessLivePageProps {
  maintenance?: boolean;
}

export function BusinessLivePage({
  maintenance = false,
}: BusinessLivePageProps) {
  return (
    <div className="business-intro">
      <a className="intro-skip" href="#main-content">
        Үндсэн агуулга руу очих
      </a>
      <div className="intro-container">
        <IntroHeader />
        {maintenance && (
          <p className="intro-availability" role="status">
            Аппын үйлчилгээнүүд болон вэб цаг удирдлагын орчинтой танилцаарай.
            Бусад вэб үйлчилгээ үе шаттай нээгдэнэ.
          </p>
        )}
        <main id="main-content">
          <IntroHero />
          <ProductShowcase />
          <ServiceCatalog />
          <RoleSection />
          <GettingStarted />
          <IntroFaq />
          <IntroContact />
        </main>
        <IntroFooter />
      </div>
    </div>
  );
}
