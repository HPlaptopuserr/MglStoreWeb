import { IntroHeader } from "./business-intro/IntroHeader";
import { IntroHero } from "./business-intro/IntroHero";
import { ServiceCatalog } from "./business-intro/ServiceCatalog";
import { GettingStarted } from "./business-intro/GettingStarted";
import { IntroContact } from "./business-intro/IntroContact";
import { IntroFaq } from "./business-intro/IntroFaq";
import { RoleSection } from "./business-intro/RoleSection";
import { ProductShowcase } from "./business-intro/ProductShowcase";
import { IntroFooter } from "./business-intro/IntroFooter";
import "./business-intro/intro.css";

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
