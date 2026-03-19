"use client";
import { CareersPhone } from "@/components/organisms/careers/CareersPhone";
import { API } from "@/lib/api";
import { useEffect, useState } from "react";
import {
  User,
  Phone,
  MapPin,
  Briefcase,
  ArrowRight,
  Banknote,
  Star,
  Languages,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  Heart,
} from "lucide-react";

interface JobPosition {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
}

export default function CareersForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [professionalSkills, setProfessionalSkills] = useState("");
  const [personalSkills, setPersonalSkills] = useState("");
  const [registerNumber, setRegisterNumber] = useState("");
  const [derivedAge, setDerivedAge] = useState<number | null>(null);
  const [derivedGender, setDerivedGender] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [jobPositionId, setJobPositionId] = useState("");
  const [education, setEducation] = useState("");
  const [salaryExpect, setSalaryExpect] = useState("");
  const [experience, setExperience] = useState("");
  const [languages, setLanguages] = useState("");

  const [jobPositions, setJobPositions] = useState<JobPosition[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  const professionalSkillSuggestions = [
    "Дүрэм журам баримтлах",
    "Компьютерийн мэдлэг",
    "Хурдан суралцах чадвар",
    "Ачаалал даах чадвар",
    "Зохион байгуулалт сайтай",
  ];

  const personalSkillSuggestions = [
    "Хариуцлагатай",
    "Цаг баримталдаг",
    "Нээлттэй",
    "Үнэнч шударга",
    "Эерэг хандлагатай",
    "Тууштай",
  ];

  useEffect(() => {
    const fetchJobPositions = async () => {
      try {
        setLoadingJobs(true);

        const res = await fetch(`${API}/job-positions`, {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error("Ажлын байр авахад алдаа гарлаа");
        }

        const data = await res.json();
        setJobPositions(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("fetch job positions error", error);
        setJobPositions([]);
      } finally {
        setLoadingJobs(false);
      }
    };

    fetchJobPositions();
  }, []);

  const addProfessionalSkill = (skill: string) => {
    setProfessionalSkills((prev) => {
      if (prev.includes(skill)) return prev;
      return prev ? `${prev}, ${skill}` : skill;
    });
  };

  const addPersonalSkill = (skill: string) => {
    setPersonalSkills((prev) => {
      if (prev.includes(skill)) return prev;
      return prev ? `${prev}, ${skill}` : skill;
    });
  };

  const parseRegisterNumber = (value: string) => {
    setRegisterNumber(value);

    const numericPart = value.slice(-8);

    if (value.length >= 10 && /^\d+$/.test(numericPart)) {
      const yy = parseInt(numericPart.substring(0, 2), 10);
      const mm = parseInt(numericPart.substring(2, 4), 10);
      const dd = parseInt(numericPart.substring(4, 6), 10);
      const g = parseInt(numericPart.substring(6, 7), 10);

      let birthYear = 0;
      let birthMonth = 0;

      if (mm >= 1 && mm <= 12) {
        birthYear = 1900 + yy;
        birthMonth = mm;
      } else if (mm >= 21 && mm <= 32) {
        birthYear = 2000 + yy;
        birthMonth = mm - 20;
      } else {
        setDerivedAge(null);
        setDerivedGender(null);
        return;
      }

      const today = new Date();
      let age = today.getFullYear() - birthYear;
      const m = today.getMonth() + 1 - birthMonth;
      if (m < 0 || (m === 0 && today.getDate() < dd)) {
        age--;
      }

      setDerivedAge(age);
      setDerivedGender(g % 2 !== 0 ? "Эрэгтэй" : "Эмэгтэй");
    } else {
      setDerivedAge(null);
      setDerivedGender(null);
    }
  };

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, 3));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError("");

    const payload = {
      firstName,
      lastName,
      phone,
      registerNumber: registerNumber || null,
      age: derivedAge,
      gender: derivedGender || null,
      address: address || null,
      jobPositionId: jobPositionId || null,
      education: education || null,
      salaryExpect: salaryExpect || null,
      experience: experience || null,
      professionalSkills: professionalSkills || null,
      personalSkills: personalSkills || null,
      languages: languages || null,
    };

    try {
      const res = await fetch(`${API}/job-applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || "Илгээхэд алдаа гарлаа");
      }

      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Алдаа гарлаа");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      id="job-form"
      className="w-full bg-linear-to-br from-[#FFB700] to-[#FF9500] pt-24 px-4 md:px-6 lg:px-8 font-sans overflow-hidden relative"
    >
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-600/20 rounded-full blur-3xl"></div>
      </div>

      <div className="mx-auto max-w-7xl relative z-10">
        <div className="text-center mb-16 text-white">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight drop-shadow-sm">
            Бидэнтэй Нэгдээрэй
          </h2>
          <p className="text-white/90 text-lg md:text-xl max-w-2xl mx-auto font-medium leading-relaxed">
            Таны ирээдүй, таны гарт. Мөрөөдлийн ажлаа өнөөдөр эхлүүлээрэй.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          <div className="lg:col-span-7 relative">
            <div className="bg-white rounded-4xl shadow-2xl p-8 md:p-10 border border-white/20 backdrop-blur-sm min-h-150 flex flex-col">
              <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    Анкет бөглөх
                  </h3>
                  <div className="flex items-center gap-2 mt-2">
                    {[1, 2, 3].map((step) => (
                      <div
                        key={step}
                        className={`h-2 w-8 rounded-full transition-colors ${step <= currentStep ? "bg-[#FFB700]" : "bg-gray-200"
                          }`}
                      />
                    ))}
                    <span className="text-xs text-gray-400 font-medium ml-2">
                      Алхам {currentStep}/3
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-green-700 bg-green-50 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide shadow-sm border border-green-100">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                  </span>
                  Нээлттэй
                </div>
              </div>

              <form
                className="flex-1 flex flex-col"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (currentStep < 3) {
                    nextStep();
                  } else {
                    handleSubmit();
                  }
                }}
              >
                {submitted ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                    <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      Амжилттай илгээгдлээ!
                    </h3>
                    <p className="text-gray-500 max-w-sm">
                      Таны анкет амжилттай хүлээн авлаа. Бид тантай удахгүй
                      холбогдох болно.
                    </p>
                  </div>
                ) : (
                  <>
                    {submitError && (
                      <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {submitError}
                      </div>
                    )}

                    {currentStep === 1 && (
                      <div className="space-y-6">
                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                          <User className="w-4 h-4" /> Хувийн мэдээлэл
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700 ml-1">
                              Нэр
                            </label>
                            <input
                              type="text"
                              value={firstName}
                              onChange={(e) => setFirstName(e.target.value)}
                              placeholder="Нэр"
                              className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-[#FFB700] focus:border-transparent block p-3.5 transition-all outline-none hover:bg-white"
                              required
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700 ml-1">
                              Овог
                            </label>
                            <input
                              type="text"
                              value={lastName}
                              onChange={(e) => setLastName(e.target.value)}
                              placeholder="Овог"
                              className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-[#FFB700] focus:border-transparent block p-3.5 transition-all outline-none hover:bg-white"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700 ml-1">
                              Утасны дугаар
                            </label>
                            <div className="relative">
                              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                              <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="9952xxxx"
                                className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-[#FFB700] focus:border-transparent block pl-11 p-3.5 transition-all outline-none hover:bg-white"
                                required
                              />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700 ml-1">
                              Регистрийн дугаар
                            </label>
                            <input
                              type="text"
                              value={registerNumber}
                              onChange={(e) =>
                                parseRegisterNumber(e.target.value)
                              }
                              placeholder="УБ90010112"
                              className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-[#FFB700] focus:border-transparent block p-3.5 transition-all outline-none uppercase hover:bg-white"
                              maxLength={10}
                              required
                            />
                            {(derivedAge !== null ||
                              derivedGender !== null) && (
                                <div className="flex gap-2 mt-2">
                                  {derivedAge !== null && (
                                    <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-md border border-gray-200">
                                      {derivedAge} нас
                                    </span>
                                  )}
                                  {derivedGender !== null && (
                                    <span
                                      className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${derivedGender === "Эрэгтэй"
                                          ? "text-blue-700 bg-blue-50 border-blue-100"
                                          : "text-pink-700 bg-pink-50 border-pink-100"
                                        }`}
                                    >
                                      {derivedGender}
                                    </span>
                                  )}
                                </div>
                              )}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-sm font-semibold text-gray-700 ml-1">
                            Гэрийн хаяг
                          </label>
                          <div className="relative">
                            <MapPin className="absolute left-3.5 top-4 h-5 w-5 text-gray-400" />
                            <textarea
                              value={address}
                              onChange={(e) => setAddress(e.target.value)}
                              placeholder="Дүүрэг, хороо, байр, тоот..."
                              className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-[#FFB700] focus:border-transparent block pl-11 p-3.5 transition-all outline-none min-h-25 hover:bg-white"
                              required
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {currentStep === 2 && (
                      <div className="space-y-6">
                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                          <Briefcase className="w-4 h-4" /> Ажлын мэдээлэл
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700 ml-1">
                              Сонирхож буй ажил
                            </label>
                            <div className="relative">
                              <select
                                value={jobPositionId}
                                onChange={(e) =>
                                  setJobPositionId(e.target.value)
                                }
                                className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-[#FFB700] focus:border-transparent block p-3.5 transition-all outline-none appearance-none hover:bg-white disabled:opacity-60"
                                required
                                disabled={loadingJobs}
                              >
                                <option value="" disabled>
                                  {loadingJobs
                                    ? "Ажлын байр ачааллаж байна..."
                                    : "Ажлын байр сонгох"}
                                </option>
                                {jobPositions.map((job) => (
                                  <option key={job.id} value={job.id}>
                                    {job.name}
                                  </option>
                                ))}
                              </select>
                              <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 rotate-90 pointer-events-none" />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700 ml-1">
                              Боловсрол
                            </label>
                            <div className="relative">
                              <select
                                value={education}
                                onChange={(e) => setEducation(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-[#FFB700] focus:border-transparent block p-3.5 transition-all outline-none appearance-none hover:bg-white"
                              >
                                <option value="" disabled>
                                  Боловсролын түвшин
                                </option>
                                <option value="incomplete_secondary">
                                  Бүрэн бус дунд
                                </option>
                                <option value="high_school">Бүрэн дунд</option>
                                <option value="vocational">
                                  МСҮТ / Коллеж
                                </option>
                                <option value="student">Оюутан</option>
                                <option value="bachelor">Бакалавр</option>
                                <option value="master">Магистр</option>
                                <option value="doctor">Доктор</option>
                              </select>
                              <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 rotate-90 pointer-events-none" />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-sm font-semibold text-gray-700 ml-1">
                            Цалингийн хүлээлт
                          </label>
                          <div className="relative">
                            <Banknote className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                              type="text"
                              value={salaryExpect}
                              onChange={(e) => setSalaryExpect(e.target.value)}
                              placeholder="Жишээ: 1,500,000"
                              className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-[#FFB700] focus:border-transparent block pl-11 p-3.5 transition-all outline-none hover:bg-white"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-sm font-semibold text-gray-700 ml-1">
                            Ажлын туршлага
                          </label>
                          <textarea
                            value={experience}
                            onChange={(e) => setExperience(e.target.value)}
                            placeholder="Өмнө нь ажиллаж байсан туршлагаа бичнэ үү..."
                            className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-[#FFB700] focus:border-transparent block p-3.5 transition-all outline-none min-h-30 hover:bg-white"
                          />
                        </div>
                      </div>
                    )}

                    {currentStep === 3 && (
                      <div className="space-y-6">
                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                          <Star className="w-4 h-4" /> Ур чадвар
                        </h4>

                        <div className="space-y-1.5">
                          <label className="text-sm font-semibold text-gray-700 ml-1">
                            Мэргэжлийн ур чадвар
                          </label>
                          <textarea
                            value={professionalSkills}
                            onChange={(e) =>
                              setProfessionalSkills(e.target.value)
                            }
                            placeholder="Таны эзэмшсэн ур чадварууд..."
                            className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-[#FFB700] focus:border-transparent block p-3.5 transition-all outline-none min-h-20 hover:bg-white"
                          />
                          <div className="flex flex-wrap gap-2 mt-2">
                            {professionalSkillSuggestions.map((skill) => (
                              <button
                                key={skill}
                                type="button"
                                onClick={() => addProfessionalSkill(skill)}
                                className="text-xs bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-full transition-all hover:bg-[#FFB700] hover:text-white hover:border-[#FFB700] active:scale-95"
                              >
                                + {skill}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-sm font-semibold text-gray-700 ml-1">
                            Хувь хүний ур чадвар
                          </label>
                          <div className="relative">
                            <Heart className="absolute left-3.5 top-4 h-5 w-5 text-gray-400" />
                            <textarea
                              value={personalSkills}
                              onChange={(e) => setPersonalSkills(e.target.value)}
                              placeholder="Таны хувийн зан чанарууд..."
                              className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-[#FFB700] focus:border-transparent block pl-11 p-3.5 transition-all outline-none min-h-20 hover:bg-white"
                            />
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {personalSkillSuggestions.map((skill) => (
                              <button
                                key={skill}
                                type="button"
                                onClick={() => addPersonalSkill(skill)}
                                className="text-xs bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-full transition-all hover:bg-[#FFB700] hover:text-white hover:border-[#FFB700] active:scale-95"
                              >
                                + {skill}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-sm font-semibold text-gray-700 ml-1">
                            Гадаад хэлний мэдлэг
                          </label>
                          <div className="relative">
                            <Languages className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                              type="text"
                              value={languages}
                              onChange={(e) => setLanguages(e.target.value)}
                              placeholder="Англи, Орос гэх мэт..."
                              className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-[#FFB700] focus:border-transparent block pl-11 p-3.5 transition-all outline-none hover:bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mt-auto pt-8 flex gap-4">
                      {currentStep > 1 && (
                        <button
                          type="button"
                          onClick={prevStep}
                          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-4 rounded-xl transition-all transform active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                          <ArrowLeft className="h-5 w-5" />
                          <span>Буцах</span>
                        </button>
                      )}

                      {currentStep < 3 ? (
                        <button
                          type="submit"
                          className="w-full bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-xl shadow-xl shadow-gray-200 transition-all transform hover:-translate-y-1 active:scale-[0.99] flex items-center justify-center gap-3 text-lg"
                        >
                          <span>Үргэлжлүүлэх</span>
                          <ArrowRight className="h-5 w-5" />
                        </button>
                      ) : (
                        <button
                          type="submit"
                          disabled={submitting}
                          className="flex-2 bg-[#FFB700] hover:bg-[#e6a600] text-white font-bold py-4 rounded-xl shadow-xl shadow-orange-200 transition-all transform hover:-translate-y-1 active:scale-[0.99] flex items-center justify-center gap-3 text-lg disabled:opacity-60 disabled:pointer-events-none"
                        >
                          <span>
                            {submitting ? "Илгээж байна..." : "Илгээх"}
                          </span>
                          <CheckCircle2 className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </form>
            </div>
          </div>

          <div className="md:pl-20">
            <CareersPhone />
          </div>
        </div>
      </div>
    </section>
  );
}