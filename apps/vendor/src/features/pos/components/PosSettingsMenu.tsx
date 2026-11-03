"use client";
import {
  ArrowUpRight,
  Clock3,
  CreditCard,
  Monitor,
  ReceiptText,
  Wallet,
  type LucideIcon,
} from "lucide-react";

interface ActionProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
}
function SettingsAction({
  title,
  description,
  icon: Icon,
  onClick,
  disabled,
}: ActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-haspopup="dialog"
      className="group flex min-h-24 items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-blue-300 hover:bg-blue-50/50 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition group-hover:bg-blue-100 group-hover:text-blue-600">
        <Icon size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-slate-900">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">
          {description}
        </span>
      </span>
      <ArrowUpRight size={15} className="shrink-0 text-slate-400" />
    </button>
  );
}
interface Props {
  branchName: string;
  registerName: string;
  displayOpened: boolean;
  shiftLabel: string;
  ebarimtEnabled: boolean;
  checkingEbarimt: boolean;
  disabled: boolean;
  onDrawer: () => void;
  onDisplay: () => void;
  onShift: () => void;
  onCheckEbarimt: () => void;
  onRecoverCard: () => void;
  recoveryDisabled: boolean;
}
export function PosSettingsMenu(props: Props) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-x-6 gap-y-2 rounded-xl bg-slate-50 px-4 py-3 text-xs">
        <p className="text-slate-500">
          Салбар{" "}
          <span className="ml-2 font-bold text-slate-800">
            {props.branchName}
          </span>
        </p>
        <p className="text-slate-500">
          Касс{" "}
          <span className="ml-2 font-bold text-slate-800">
            {props.registerName}
          </span>
        </p>
      </div>
      <section
        aria-label="Кассын үйлдлүүд"
        className="grid gap-3 sm:grid-cols-2"
      >
        <SettingsAction
          icon={Wallet}
          title="Бэлэн мөнгө"
          description="Орлого, зарлага, үлдэгдэл болон тайлан"
          onClick={props.onDrawer}
          disabled={props.disabled}
        />
        <SettingsAction
          icon={Monitor}
          title="Хэрэглэгчийн дэлгэц"
          description={
            props.displayOpened
              ? "Нээлттэй · Өнгө, дэлгэцийн тохиргоо"
              : "Дэлгэц нээх, харагдах өнгө сонгох"
          }
          onClick={props.onDisplay}
        />
        <SettingsAction
          icon={Clock3}
          title="Ээлж"
          description={props.shiftLabel}
          onClick={props.onShift}
        />
        <SettingsAction
          icon={CreditCard}
          title="Өмнө төлөгдсөн картын гүйлгээтэй холбох"
          description="Minu-с төлбөрийг шалгаж, сагсны борлуулалтыг нөхөн бүртгэх"
          onClick={props.onRecoverCard}
          disabled={props.disabled || props.recoveryDisabled}
        />
      </section>
      <section
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4"
        aria-label="eBarimt холболт"
      >
        <div className="flex items-center gap-3">
          <ReceiptText size={20} className="text-slate-500" />
          <div>
            <p className="text-sm font-bold">eBarimt</p>
            <p className="mt-1 text-xs text-slate-500">
              {props.ebarimtEnabled
                ? "Холболт идэвхтэй"
                : "Энэ касс дээр идэвхгүй"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={props.onCheckEbarimt}
          disabled={props.checkingEbarimt || props.disabled}
          className="min-h-10 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50"
        >
          {props.checkingEbarimt ? "Шалгаж байна…" : "Холболт шалгах"}
        </button>
      </section>
    </div>
  );
}
