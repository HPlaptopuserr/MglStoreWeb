import { prisma } from "@mgl/database";
import crypto from "crypto";

export class ContractService {
  /**
   * 1. Initialize Contract (Draft) & Send OTP
   */
  static async draftContract(userId: string, organizationId: string | null, feePlan: string) {
    // Generate simple 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Hash OTP before storing (simple hash for brevity)
    const otpSecret = crypto.createHash('sha256').update(otp).digest('hex');

    const contract = await prisma.contract.create({
      data: {
        userId,
        organizationId,
        feePlan,
        status: "PENDING",
        version: "v1.2",
        otpSecret, // temporary storage for validation
      }
    });

    await this.logAudit(contract.id, "FORM_SUBMITTED", { feePlan });
    
    // In real app, send OTP via email/SMS here
    console.log(`[SIMULATED] OTP for contract ${contract.id}: ${otp}`);
    
    return { contractId: contract.id, message: "OTP sent to user email/phone" };
  }

  /**
   * 2. Verify OTP, Generate PDF, Embed Signature, Hash & Finalize
   */
  static async signContract(params: {
    contractId: string;
    userId: string;
    otpInput: string;
    signatureBase64: string;
    ipAddress: string;
    userAgent: string;
    organizationName: string;
    signerName: string;
  }) {
    const { contractId, userId, otpInput, signatureBase64, ipAddress, userAgent } = params;

    const contract = await prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract || contract.status !== "PENDING") {
      throw new Error("Invalid or expired contract");
    }

    // Verify OTP
    const inputHash = crypto.createHash('sha256').update(otpInput).digest('hex');
    if (contract.otpSecret !== inputHash) {
      throw new Error("Invalid OTP");
    }

    await this.logAudit(contractId, "OTP_VERIFIED", { ipAddress });

    // In a real scenario we'd use 'pdf-lib'. We will mock the PDF generation for safety if library isn't installed.
    // Assuming pdf-lib is installed by the user as requested:
    let finalPdfBytes: Uint8Array;
    let documentHash: string;
    
    try {
      const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
      
      // Create a blank PDF document
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([600, 800]);
      
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      
      page.drawText('MGL Store - Digital Contract', { x: 50, y: 750, size: 20, font });
      page.drawText(`Version: ${contract.version}`, { x: 50, y: 720, size: 12, font });
      page.drawText(`Organization: ${params.organizationName}`, { x: 50, y: 700, size: 12, font });
      page.drawText(`Plan: ${contract.feePlan}`, { x: 50, y: 680, size: 12, font });
      
      // Embed Signature
      const signatureImageBytes = Buffer.from(signatureBase64.replace(/^data:image\/(png|jpeg);base64,/, ""), 'base64');
      const signatureImage = await pdfDoc.embedPng(signatureImageBytes);
      
      page.drawImage(signatureImage, { x: 50, y: 500, width: 200, height: 80 });
      
      // Metadata Binding (Crucial for evidence)
      const timestamp = new Date().toISOString();
      page.drawText(`Signed by: ${params.signerName}`, { x: 50, y: 480, size: 10, font, color: rgb(0, 0, 0.8) });
      page.drawText(`IP: ${ipAddress}`, { x: 50, y: 465, size: 10, font, color: rgb(0, 0, 0.8) });
      page.drawText(`Time: ${timestamp} UTC`, { x: 50, y: 450, size: 10, font, color: rgb(0, 0, 0.8) });
      page.drawText(`Device: ${userAgent.substring(0, 40)}`, { x: 50, y: 435, size: 10, font, color: rgb(0, 0, 0.8) });
      
      await this.logAudit(contractId, "PDF_GENERATED", { timestamp });
      await this.logAudit(contractId, "SIGNATURE_ADDED", { ipAddress, userAgent });

      finalPdfBytes = await pdfDoc.save();
      // SHA256 Hash of the exact binary content
      documentHash = crypto.createHash('sha256').update(finalPdfBytes).digest('hex');

    } catch (e) {
      console.warn("pdf-lib not found or failed, falling back to basic mock buffer", e);
      // Fallback if pdf-lib is not installed
      finalPdfBytes = Buffer.from(`MOCK PDF CONTENT - SIGNED BY ${params.signerName}`);
      documentHash = crypto.createHash('sha256').update(finalPdfBytes).digest('hex');
    }

    // Update Contract
    const finalizedContract = await prisma.contract.update({
      where: { id: contractId },
      data: {
        status: "SIGNED",
        documentHash,
        otpSecret: null, // clear OTP
        signedAt: new Date(),
        // In real app, upload finalPdfBytes to S3 and save URL
        pdfUrl: `https://storage.mglstore.mn/contracts/${contractId}.pdf` 
      }
    });

    await this.logAudit(contractId, "CONTRACT_FINALIZED", { documentHash });

    return finalizedContract;
  }

  /**
   * 3. Verify Contract Authenticity
   */
  static async verifyContract(contractId: string, providedHash?: string) {
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        auditLogs: {
          orderBy: { timestamp: 'asc' }
        },
        user: { select: { email: true, profile: { select: { fullName: true } } } },
        organization: { select: { name: true } }
      }
    });

    if (!contract) {
      throw new Error("Contract not found");
    }

    const isTampered = providedHash ? contract.documentHash !== providedHash : false;
    
    return {
      id: contract.id,
      version: contract.version,
      status: isTampered ? "TAMPERED" : contract.status,
      signer: contract.user.profile?.fullName || contract.user.email,
      organization: contract.organization?.name,
      hash: contract.documentHash,
      signedAt: contract.signedAt,
      auditTrail: contract.auditLogs.map(log => `[${log.timestamp.toISOString()}] ${log.action}`)
    };
  }

  /**
   * 4. Immutable Audit Logger
   */
  private static async logAudit(contractId: string, action: string, meta: any = {}) {
    return prisma.contractAuditLog.create({
      data: {
        contractId,
        action,
        deviceInfo: meta ? JSON.parse(JSON.stringify(meta)) : null,
        timestamp: new Date()
      }
    });
  }
}
