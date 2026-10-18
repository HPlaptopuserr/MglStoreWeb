import type { BuildingWebsiteContent } from "@mgl/types/building-website";
import { ImageField } from "./ImageField";
export function WebsiteContentFields({
  value,
  onChange,
}: {
  value: BuildingWebsiteContent;
  onChange: (value: BuildingWebsiteContent) => void;
}) {
  function text(
    key: keyof BuildingWebsiteContent,
    label: string,
    multiline = false,
  ) {
    const content = value[key];
    if (typeof content !== "string") return null;
    return (
      <label key={key}>
        {label}
        {multiline ? (
          <textarea
            rows={4}
            value={content}
            onChange={(event) =>
              onChange({ ...value, [key]: event.target.value })
            }
          />
        ) : (
          <input
            value={content}
            onChange={(event) =>
              onChange({ ...value, [key]: event.target.value })
            }
          />
        )}
      </label>
    );
  }
  return (
    <>
      <section className="website-form-section" id="content-hero">
        <h2>Нүүр хэсэг</h2>
        {text("eyebrow", "Товч нэр / уриа")}
        {text("heroTitle", "Том гарчиг")}
        {text("heroSubtitle", "Дэд гарчиг", true)}
        <ImageField
          label="Нүүр зураг"
          value={value.heroImageUrl}
          onChange={(heroImageUrl) => onChange({ ...value, heroImageUrl })}
        />
      </section>
      <section className="website-form-section" id="content-about">
        <h2>Төслийн танилцуулга</h2>
        {text("aboutTitle", "Танилцуулгын гарчиг")}
        {text("aboutText", "Дэлгэрэнгүй танилцуулга", true)}
        {text("completionLabel", "Ашиглалтад орох хугацаа")}
        {text("paymentTerms", "Төлбөрийн нөхцөл", true)}
      </section>
      <section className="website-form-section" id="content-contact">
        <h2>Холбоо барих, байршил</h2>
        <div className="website-field-grid">
          {text("phone", "Борлуулалтын утас")}
          {text("email", "И-мэйл")}
        </div>
        {text("mapUrl", "Газрын зургийн HTTPS холбоос")}
      </section>
      <section className="website-form-section" id="content-amenities">
        <h2>Давуу талууд</h2>
        {value.amenities.map((item, i) => (
          <div key={i} className="website-repeater">
            <label>
              Гарчиг
              <input
                value={item.title}
                onChange={(event) =>
                  onChange({
                    ...value,
                    amenities: value.amenities.map((row, index) =>
                      index === i ? { ...row, title: event.target.value } : row,
                    ),
                  })
                }
              />
            </label>
            <label>
              Тайлбар
              <textarea
                value={item.description}
                onChange={(event) =>
                  onChange({
                    ...value,
                    amenities: value.amenities.map((row, index) =>
                      index === i
                        ? { ...row, description: event.target.value }
                        : row,
                    ),
                  })
                }
              />
            </label>
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...value,
                  amenities: value.amenities.filter((_, index) => index !== i),
                })
              }
            >
              Мөр арилгах
            </button>
          </div>
        ))}
        <button
          type="button"
          disabled={value.amenities.length >= 20}
          onClick={() =>
            onChange({
              ...value,
              amenities: [...value.amenities, { title: "", description: "" }],
            })
          }
        >
          + Давуу тал нэмэх
        </button>
      </section>
      <section className="website-form-section" id="content-gallery">
        <h2>Зургийн цомог</h2>
        {value.gallery.map((item, i) => (
          <div key={i} className="website-repeater">
            <ImageField
              label={`Зураг ${i + 1}`}
              value={item.url}
              onChange={(url) =>
                onChange({
                  ...value,
                  gallery: value.gallery.map((row, index) =>
                    index === i ? { ...row, url } : row,
                  ),
                })
              }
            />
            <label>
              Зургийн тайлбар
              <input
                value={item.caption}
                onChange={(event) =>
                  onChange({
                    ...value,
                    gallery: value.gallery.map((row, index) =>
                      index === i
                        ? { ...row, caption: event.target.value }
                        : row,
                    ),
                  })
                }
              />
            </label>
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...value,
                  gallery: value.gallery.filter((_, index) => index !== i),
                })
              }
            >
              Зураг арилгах
            </button>
          </div>
        ))}
        <button
          type="button"
          disabled={value.gallery.length >= 12}
          onClick={() =>
            onChange({
              ...value,
              gallery: [...value.gallery, { url: "", caption: "" }],
            })
          }
        >
          + Зураг нэмэх
        </button>
      </section>
      <section className="website-form-section" id="content-faq">
        <h2>Түгээмэл асуулт</h2>
        {value.faqs.map((item, i) => (
          <div key={i} className="website-repeater">
            <label>
              Асуулт
              <input
                value={item.question}
                onChange={(event) =>
                  onChange({
                    ...value,
                    faqs: value.faqs.map((row, index) =>
                      index === i
                        ? { ...row, question: event.target.value }
                        : row,
                    ),
                  })
                }
              />
            </label>
            <label>
              Хариулт
              <textarea
                rows={3}
                value={item.answer}
                onChange={(event) =>
                  onChange({
                    ...value,
                    faqs: value.faqs.map((row, index) =>
                      index === i
                        ? { ...row, answer: event.target.value }
                        : row,
                    ),
                  })
                }
              />
            </label>
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...value,
                  faqs: value.faqs.filter((_, index) => index !== i),
                })
              }
            >
              Мөр арилгах
            </button>
          </div>
        ))}
        <button
          type="button"
          disabled={value.faqs.length >= 20}
          onClick={() =>
            onChange({
              ...value,
              faqs: [...value.faqs, { question: "", answer: "" }],
            })
          }
        >
          + Асуулт нэмэх
        </button>
      </section>
    </>
  );
}
