"use client";

import { useState, type FormEvent } from "react";
import { ArrowUpRight } from "lucide-react";

export function ContactForm() {
  const [ready, setReady] = useState(false);
  function prepareEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const body = [
      `Байгууллага: ${String(values.get("company") ?? "")}`,
      `Холбоо барих хүн: ${String(values.get("name") ?? "")}`,
      `Имэйл / утас: ${String(values.get("contact") ?? "")}`,
      `Сонирхож буй үйлчилгээ: ${String(values.get("service") ?? "")}`,
      "",
      String(values.get("message") ?? ""),
    ].join("\n");
    window.location.href = `mailto:info@mglstore.mn?subject=${encodeURIComponent("MGL Business — Үйлчилгээний хүсэлт")}&body=${encodeURIComponent(body)}`;
    setReady(true);
  }
  return (
    <form className="contact-form" onSubmit={prepareEmail}>
      <h3>Хэрэгцээгээ бидэнтэй хуваалцаарай.</h3>
      <p>Мэдээллээ бөглөөд имэйлийн аппдаа нээж илгээнэ.</p>
      <label>
        Байгууллагын нэр
        <input
          name="company"
          required
          maxLength={150}
          autoComplete="organization"
          placeholder="Байгууллагын нэр"
        />
      </label>
      <div className="contact-fields">
        <label>
          Таны нэр
          <input
            name="name"
            required
            maxLength={100}
            autoComplete="name"
            placeholder="Холбоо барих хүн"
          />
        </label>
        <label>
          Имэйл эсвэл утас
          <input
            name="contact"
            required
            maxLength={150}
            placeholder="Холбоо барих мэдээлэл"
          />
        </label>
      </div>
      <label>
        Сонирхож буй үйлчилгээ
        <select name="service" defaultValue="Цаг бүртгэл ба багийн удирдлага">
          <option>Цаг бүртгэл ба багийн удирдлага</option>
          <option>Борлуулалт, POS ба бараа</option>
          <option>Захиалга ба хүргэлт</option>
          <option>Барилгын төслүүд</option>
          <option>Бусад / Нэгдсэн шийдэл</option>
        </select>
      </label>
      <label>
        Тайлбар
        <textarea
          name="message"
          rows={3}
          maxLength={2000}
          placeholder="Танай багт ямар шийдэл хэрэгтэй байна вэ?"
        />
      </label>
      <button className="intro-button" type="submit">
        Имэйлээр холбогдох <ArrowUpRight size={17} aria-hidden="true" />
      </button>
      <p className="contact-form-note" role="status">
        {ready
          ? "Имэйлийн аппдаа хүсэлтээ шалгаад илгээнэ үү. Нээгдээгүй бол info@mglstore.mn хаягаар шууд бичээрэй."
          : "Энэ форм имэйлийн аппыг нээнэ. Мэдээлэл автоматаар илгээгдэхгүй."}
      </p>
    </form>
  );
}
