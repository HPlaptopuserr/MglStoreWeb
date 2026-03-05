import React from "react";
import { Heading } from "../../../../../../../packages/ui/src/atoms/Heading";
import { Text } from "../../../../../../../packages/ui/src/atoms/Text";
import { PartnershipWorkInfoCard } from "../../../../components/PartnershipWorkInfoCard";
import {
  Handshake,
  BarChart3,
  Globe,
  Users,
  ShieldCheck,
  Zap,
  Target,
  Briefcase,
  Award,
} from "lucide-react";

export const PartnershipWorksSection: React.FC = () => {
  const steps = [
    {
      title: "Зах зээлийг тэл",
      description:
        "Улаанбаатар хотын иргэн бүртэй холбогдох, бүтээгдэхүүнээ олон мянган хүнд санал болгох боломжтой.",
      image: "https://picsum.photos/seed/market/200/200",
      icon: Handshake,
    },
    {
      title: "Шонпер карт",
      description:
        "Бид захиалгаа бүрийн төлбөрийг дор бүр нь хядар тул таны бизнесийн хөрвөх чадварыг сайжруулж, мөнгөн урсгалыг нэмэгдүүлнэ.",
      image: "https://picsum.photos/seed/card/200/200",
      icon: Target,
    },
    {
      title: "Маркетинг дэмжлэг",
      description:
        "Борлуулалтыг нэмэгдүүлэхийн тулд хамтарсан маркетинг, тусгай урамшуулал, зорилтот сурталчилгаа зэргийг ашиглах боломжтой. Манай баг таны бүтээгдэхүүнийг хэрэглэгчдэд илүү ойртуулна.",
      image: "https://picsum.photos/seed/marketing/200/200",
      icon: Zap,
    },
    {
      title: "Найдвартай хүргэлтийн үйлчилгээ",
      description:
        "Бид хүргэлтийн бүүхий л үe шатaр хариуцаж, хэрэглэгчдэд хурдан, найдвартай үйлчилгээг үзүүлнэ. Ингэснээр та зөвхөн бизнесийнхээ өсөлтөд төвлөрч болно.",
      image: "https://picsum.photos/seed/delivery/200/200",
      icon: BarChart3,
    },
    {
      title: "Борлуулалтын дүн шинжилгээ",
      description:
        "Зах зээлийг чих хангахад, борлуулалтын анализыг нарийвчилсан цагийн горимд хүлээн авч, бизнесийнхээ стратегийг оновчтой болгоно.",
      image: "https://picsum.photos/seed/analytics/200/200",
      icon: Globe,
    },
    {
      title: "Захиалга удирдлагын платформ",
      description:
        "Ta хүссэн үедээ бүтээгдэхүүн нэмэх, хэсэлж хангах, захиалга удирдах боломжтой түүний FreshPack-тай хамт дижитал шилжилт хийнэ.",
      image: "https://picsum.photos/seed/platform/200/200",
      icon: Users,
    },
    {
      title: "Захиалга удирдлагын платйыбйыбформ",
      description:
        "Ta хүссэн үедээ бүтээгдэхүүн нэмэх, хэсэлж хангах, захиалга удирдах боломжтой түүний FreshPack-тай хамт дижитал шилжилт хийнэ.",
      image: "https://picsum.photos/seed/platform/200/200",
      icon: ShieldCheck,
    },
    {
      title: "Захиалга удирдлагын платфорёячячёям",
      description:
        "Ta хүссэн үедээ бүтээгдэхүүн нэмэх, хэсэлж хангах, захиалга удирдах боломжтой түүний FreshPack-тай хамт дижитал шилжилт хийнэ.",
      image: "https://picsum.photos/seed/platform/200/200",
      icon: Briefcase,
    },
    {
      title: "Захиалга удирдлагын платфойыбыбрм",
      description:
        "Ta хүссэн үедээ бүтээгдэхүүн нэмэх, хэсэлж хангах, захиалга удирдах боломжтой түүний FreshPack-тай хамт дижитал шилжилт хийнэ.",
      image: "https://picsum.photos/seed/platform/200/200",
      icon: Award,
    },
  ];

  return (
    <section className="py-24 px-4 md:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Heading level={2} className="mb-6">
            Бидэнтэй хамтран ажиллахын давуу талууд
          </Heading>
          <Text size="lg" color="muted">
            Энгийн, ил тод, үр дүнтэй үйл явц нь танд туслах зорилготой юм
            бизнес манай экосистемд цэцэглэн хөгжиж байна.
          </Text>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <PartnershipWorkInfoCard
              key={index}
              icon={step.icon}
              title={step.title}
              description={step.description}
              className="h-full"
            />
          ))}
        </div>
      </div>
    </section>
  );
};
