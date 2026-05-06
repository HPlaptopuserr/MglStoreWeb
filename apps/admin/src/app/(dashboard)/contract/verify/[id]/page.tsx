"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2, XCircle, ShieldAlert, FileText, Fingerprint, Calendar, Building, Clock, History } from "lucide-react";
import { useParams } from "next/navigation";

export default function ContractVerifyPage() {
  const params = useParams();
  const contractId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [verificationData, setVerificationData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // In a real app, this would be a fetch call to /api/contracts/verify/${contractId}
    // Simulating API response based on the new backend architecture
    setTimeout(() => {
      if (contractId === "test-tampered") {
        setVerificationData({
          id: "test-tampered",
          version: "v1.2",
          status: "TAMPERED",
          signer: "Bat-Erdene",
          organization: "Tech MGL LLC",
          hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          signedAt: new Date(Date.now() - 86400000).toISOString(),
          auditTrail: [
            `[${new Date(Date.now() - 86400000).toISOString()}] FORM_SUBMITTED`,
            `[${new Date(Date.now() - 86350000).toISOString()}] OTP_VERIFIED`,
            `[${new Date(Date.now() - 86340000).toISOString()}] PDF_GENERATED`,
            `[${new Date(Date.now() - 86330000).toISOString()}] SIGNATURE_ADDED`,
            `[${new Date(Date.now() - 86320000).toISOString()}] CONTRACT_FINALIZED`
          ]
        });
      } else {
        setVerificationData({
          id: contractId || "550e8400-e29b-41d4-a716-446655440000",
          version: "v1.2",
          status: "VALID",
          signer: "Bat-Erdene",
          organization: "Tech MGL LLC",
          hash: "a4f52968393e506ab1359c381c85d774f71a06df31ea54cd4e2b0c1591f4b3fc",
          signedAt: new Date(Date.now() - 86400000).toISOString(),
          auditTrail: [
            `[${new Date(Date.now() - 86400000).toISOString()}] FORM_SUBMITTED`,
            `[${new Date(Date.now() - 86350000).toISOString()}] OTP_VERIFIED`,
            `[${new Date(Date.now() - 86340000).toISOString()}] PDF_GENERATED`,
            `[${new Date(Date.now() - 86330000).toISOString()}] SIGNATURE_ADDED`,
            `[${new Date(Date.now() - 86320000).toISOString()}] CONTRACT_FINALIZED`
          ]
        });
      }
      setLoading(false);
    }, 1500);
  }, [contractId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-neutral-500 font-medium animate-pulse">Гэрээг шалгаж байна...</p>
      </div>
    );
  }

  if (error || !verificationData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <XCircle className="w-16 h-16 text-red-500" />
        <h2 className="text-2xl font-bold text-neutral-800">Олдсонгүй</h2>
        <p className="text-neutral-500">{error || "Гэрээний мэдээлэл олдсонгүй."}</p>
      </div>
    );
  }

  const isValid = verificationData.status === "VALID" || verificationData.status === "SIGNED";
  const isTampered = verificationData.status === "TAMPERED";

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">Цахим гэрээ баталгаажуулалт</h1>
        <p className="text-neutral-500 mt-2">Энэхүү хуудас нь тухайн гэрээний жинхэнэ эсэхийг баталгаажуулах албан ёсны хуудас болно.</p>
      </div>

      <div className={`rounded-2xl p-8 mb-8 border-2 shadow-sm ${
        isTampered 
          ? 'bg-red-50 border-red-200' 
          : 'bg-green-50 border-green-200'
      }`}>
        <div className="flex items-start gap-6">
          <div className={`p-4 rounded-full ${isTampered ? 'bg-red-100' : 'bg-green-100'}`}>
            {isTampered ? (
              <ShieldAlert className="w-10 h-10 text-red-600" />
            ) : (
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            )}
          </div>
          
          <div>
            <h2 className={`text-2xl font-bold mb-2 ${isTampered ? 'text-red-900' : 'text-green-900'}`}>
              {isTampered ? 'АНХААР: Гэрээ өөрчлөгдсөн байна!' : 'Хүчинтэй гэрээ (Valid)'}
            </h2>
            <p className={isTampered ? 'text-red-700' : 'text-green-700'}>
              {isTampered 
                ? 'Энэхүү гэрээний файл засварлагдсан эсвэл HASH утга зөрсөн байна. Хуулийн хүчингүй!'
                : 'Энэхүү гэрээний SHA-256 Hash утга нь блокчейн болон манай мэдээллийн сантай яг таарч байна. Ямар ч засвар оруулаагүй эх хувь мөн.'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2 border-b pb-4">
            <FileText className="w-5 h-5 text-blue-600" />
            Гэрээний мэдээлэл
          </h3>
          <div className="space-y-4">
            <div className="flex flex-col">
              <span className="text-xs text-neutral-500 uppercase tracking-wider font-semibold mb-1">Гэрээний ID</span>
              <span className="font-mono text-sm bg-neutral-100 px-2 py-1 rounded text-neutral-800 break-all">{verificationData.id}</span>
            </div>
            <div className="flex items-center gap-3">
              <Fingerprint className="w-5 h-5 text-neutral-400" />
              <div>
                <span className="text-xs text-neutral-500 uppercase tracking-wider font-semibold block">Хувилбар (Version)</span>
                <span className="font-medium">{verificationData.version}</span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-neutral-500 uppercase tracking-wider font-semibold mb-1">SHA-256 HASH (Document Signature)</span>
              <span className="font-mono text-xs bg-neutral-100 px-2 py-1.5 rounded text-neutral-800 break-all border border-neutral-200">
                {verificationData.hash}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2 border-b pb-4">
            <CheckCircle2 className="w-5 h-5 text-blue-600" />
            Гарын үсэг зурсан тал
          </h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Building className="w-5 h-5 text-neutral-400" />
              <div>
                <span className="text-xs text-neutral-500 uppercase tracking-wider font-semibold block">Байгууллага</span>
                <span className="font-medium text-lg text-neutral-900">{verificationData.organization}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-neutral-400" />
              <div>
                <span className="text-xs text-neutral-500 uppercase tracking-wider font-semibold block">Гарын үсэг зурсан</span>
                <span className="font-medium">{verificationData.signer}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-neutral-400" />
              <div>
                <span className="text-xs text-neutral-500 uppercase tracking-wider font-semibold block">Баталгаажсан огноо (UTC)</span>
                <span className="font-medium">{new Date(verificationData.signedAt).toLocaleString('mn-MN')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-neutral-200 shadow-sm">
        <h3 className="text-lg font-bold mb-6 flex items-center gap-2 border-b pb-4">
          <History className="w-5 h-5 text-neutral-600" />
          Audit Log (Үйлдэл бүрийн бүртгэл)
        </h3>
        
        <div className="relative border-l-2 border-neutral-200 ml-3 pl-6 space-y-6">
          {verificationData.auditTrail.map((log: string, index: number) => {
            const isLast = index === verificationData.auditTrail.length - 1;
            const logParts = log.match(/\[(.*?)\] (.*)/);
            if (!logParts) return <div key={index}>{log}</div>;
            
            return (
              <div key={index} className="relative">
                <div className={`absolute -left-[33px] p-1 rounded-full bg-white border-2 ${isLast ? 'border-blue-600 text-blue-600' : 'border-neutral-300 text-neutral-400'}`}>
                  <Clock className="w-3 h-3" />
                </div>
                <div>
                  <span className="text-xs text-neutral-500 font-mono bg-neutral-100 px-2 py-0.5 rounded mr-3">
                    {new Date(logParts[1]).toLocaleString('mn-MN')}
                  </span>
                  <span className={`font-medium ${isLast ? 'text-blue-700' : 'text-neutral-700'}`}>
                    {logParts[2]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-8 bg-blue-50 text-blue-800 text-sm p-4 rounded-lg flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>
            Дээрх лог нь өгөгдлийн санд append-only буюу устгах, засах боломжгүйгээр бичигдсэн бөгөөд хуулийн өмнө нотлох баримт болон ашиглагдах бүрэн боломжтой.
          </p>
        </div>
      </div>
    </div>
  );
}
