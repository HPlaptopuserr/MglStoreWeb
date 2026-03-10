"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  User,
  Mail,
  Save,
  Loader2,
  CheckCircle2,
  Shield,
  Bell,
  KeySquare,
  Settings,
} from "lucide-react";

export default function ProfilePage() {
  const [displayName, setDisplayName] = useState("Vendor User");
  const [email, setEmail] = useState("admin@example.com");
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // энд дараа нь API call холбоно
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to update profile:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: "general", label: "General Information", icon: User },
    { id: "security", label: "Security (Coming Soon)", icon: Shield },
    { id: "notifications", label: "Notifications (Coming Soon)", icon: Bell },
    { id: "api", label: "API Keys (Coming Soon)", icon: KeySquare },
    { id: "preferences", label: "Preferences (Coming Soon)", icon: Settings },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-4">
      <div className="relative h-64 w-full overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-900 via-black to-slate-800 shadow-2xl">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay"></div>
        <div className="absolute top-0 right-0 -mr-20 -mt-20 h-96 w-96 rounded-full bg-[#FFAD02] blur-[100px] opacity-20"></div>

        <div className="absolute bottom-0 left-0 flex w-full items-end gap-6 bg-gradient-to-t from-black/80 to-transparent p-8">
          <div className="relative group">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-[#FFAD02] to-amber-600 blur opacity-70 transition duration-500 group-hover:opacity-100"></div>
            <div className="relative flex h-28 w-28 items-center justify-center rounded-full border-4 border-black bg-black text-white shadow-2xl">
              <span className="bg-gradient-to-br from-[#FFAD02] to-amber-500 bg-clip-text text-5xl font-black text-transparent">
                {displayName ? displayName.charAt(0).toUpperCase() : "U"}
              </span>
            </div>
          </div>

          <div className="mb-2">
            <h1 className="text-4xl font-black tracking-tight text-white drop-shadow-md">
              {displayName || "User Profile"}
            </h1>
            <p className="mt-1 flex items-center gap-2 text-lg font-medium text-slate-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]"></span>
              Vendor Manager
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
        <div className="space-y-2 lg:col-span-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() =>
                  tab.id === "general" ? setActiveTab(tab.id) : null
                }
                className={`w-full flex items-center gap-3 rounded-2xl px-5 py-4 font-bold transition-all duration-300 ${
                  isActive
                    ? "scale-[1.02] bg-black text-white shadow-xl shadow-black/10"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                } ${
                  tab.id !== "general"
                    ? "cursor-not-allowed opacity-50 hover:scale-100 hover:bg-transparent hover:text-slate-500"
                    : ""
                }`}
              >
                <tab.icon
                  className={`h-5 w-5 ${isActive ? "text-[#FFAD02]" : ""}`}
                />
                <span className="text-sm">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-3">
          {activeTab === "general" && (
            <div className="animate-in slide-in-from-right-8 fade-in rounded-[2rem] border border-slate-100 bg-white p-8 shadow-2xl shadow-slate-200/50 duration-500">
              <div className="mb-8 border-b border-slate-100 pb-6">
                <h2 className="text-2xl font-black text-slate-900">
                  General Information
                </h2>
                <p className="mt-1 font-medium text-slate-500">
                  Update your photo and personal details here.
                </p>
              </div>

              <form onSubmit={handleSave} className="max-w-2xl space-y-8">
                <div className="group space-y-3">
                  <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 transition-colors group-focus-within:text-black">
                    <User className="h-4 w-4" />
                    Display Name
                  </label>

                  <Input
                    className="h-14 rounded-2xl border-slate-200 bg-slate-50/50 px-5 text-lg font-medium shadow-sm transition-all group-hover:shadow-md focus:border-black focus:bg-white focus:ring-4 focus:ring-black/5"
                    placeholder="Enter your name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                  />

                  <p className="text-xs font-medium text-slate-400">
                    This will be displayed on your vendor dashboard and public
                    interactions.
                  </p>
                </div>

                <div className="group space-y-3">
                  <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 transition-colors group-focus-within:text-black">
                    <Mail className="h-4 w-4" />
                    Email Address
                  </label>

                  <Input
                    type="email"
                    className="h-14 rounded-2xl border-slate-200 bg-slate-50/50 px-5 text-lg font-medium shadow-sm transition-all group-hover:shadow-md focus:border-black focus:bg-white focus:ring-4 focus:ring-black/5"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />

                  <p className="text-xs font-medium text-slate-400">
                    We'll use this to send you account notifications.
                  </p>
                </div>

                <div className="flex flex-col items-center justify-between gap-6 border-t border-slate-100 pt-8 sm:flex-row">
                  <div className="w-full flex-1 text-center sm:text-left">
                    {showSuccess && (
                      <div className="animate-in slide-in-from-bottom-2 fade-in inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-green-700 duration-300">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <span className="text-sm font-bold">
                          Profile updated successfully!
                        </span>
                      </div>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={isSaving}
                    className="h-14 w-full rounded-2xl bg-black px-10 text-lg font-bold text-white shadow-xl shadow-black/20 transition-all hover:scale-105 hover:bg-slate-800 focus:ring-4 focus:ring-slate-200 sm:w-auto"
                  >
                    {isSaving ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <>
                        <Save className="mr-2 h-5 w-5 text-[#FFAD02]" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
