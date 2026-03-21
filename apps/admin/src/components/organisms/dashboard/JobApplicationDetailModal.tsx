"use client";

import {
  Banknote,
  Briefcase,
  CalendarDays,
  Clock,
  FileText,
  GraduationCap,
  Heart,
  Languages,
  MapPin,
  Phone,
  Star,
  Users,
  X,
} from "lucide-react";
import { DetailItem } from "../../molecules/DashboardWidgets";
import {
  EDUCATION_LABELS,
  GENDER_LABELS,
  getStatusClass,
  getStatusLabel,
} from "../../../lib/constants";
import type { JobApplication } from "../../../lib/types";

interface JobApplicationDetailModalProps {
  selectedApp: JobApplication | null;
  onClose: () => void;
}

export function JobApplicationDetailModal({
  selectedApp,
  onClose,
}: JobApplicationDetailModalProps) {
  if (!selectedApp) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white rounded-t-3xl border-b border-slate-100 px-5 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {selectedApp.lastName} {selectedApp.firstName}
              </h3>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold mt-0.5 ${getStatusClass(selectedApp.status)}`}
              >
                {getStatusLabel(selectedApp.status)}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-5">
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Хувийн мэдээлэл
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <DetailItem icon={Phone} label="Утас" value={selectedApp.phone} />
              <DetailItem
                icon={FileText}
                label="Регистр"
                value={selectedApp.registerNumber}
              />
              <DetailItem
                icon={Users}
                label="Нас"
                value={selectedApp.age !== null ? `${selectedApp.age} нас` : null}
              />
              <DetailItem
                icon={Users}
                label="Хүйс"
                value={
                  selectedApp.gender
                    ? GENDER_LABELS[selectedApp.gender] || selectedApp.gender
                    : null
                }
              />
              <div className="col-span-2">
                <DetailItem
                  icon={MapPin}
                  label="Хаяг"
                  value={selectedApp.address}
                />
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5" /> Ажлын мэдээлэл
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <DetailItem
                icon={Briefcase}
                label="Албан тушаал"
                value={selectedApp.jobPosition?.name ?? null}
              />
              <DetailItem
                icon={GraduationCap}
                label="Боловсрол"
                value={
                  selectedApp.education
                    ? EDUCATION_LABELS[selectedApp.education] ||
                      selectedApp.education
                    : null
                }
              />
              <DetailItem
                icon={Banknote}
                label="Цалингийн хүлээлт"
                value={selectedApp.salaryExpect}
              />
              <DetailItem
                icon={CalendarDays}
                label="Огноо"
                value={new Date(selectedApp.createdAt).toLocaleDateString("mn-MN")}
              />
              <div className="col-span-2">
                <DetailItem
                  icon={Clock}
                  label="Туршлага"
                  value={selectedApp.experience}
                />
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5" /> Ур чадвар
            </h4>
            <div className="space-y-3">
              <DetailItem
                icon={Star}
                label="Мэргэжлийн ур чадвар"
                value={selectedApp.professionalSkills}
              />
              <DetailItem
                icon={Heart}
                label="Хувь хүний ур чадвар"
                value={selectedApp.personalSkills}
              />
              <DetailItem
                icon={Languages}
                label="Гадаад хэлний мэдлэг"
                value={selectedApp.languages}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}