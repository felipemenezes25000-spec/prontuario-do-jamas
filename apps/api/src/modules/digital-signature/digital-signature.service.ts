import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { createHash } from 'crypto';
import {
  SignatureType,
  CertificateType,
  SignatureStandard,
} from '@prisma/client';

/**
 * Certificate data extracted from an ICP-Brasil PFX/P12 file.
 * In production, this would be parsed from actual certificate using
 * node-forge or a dedicated ICP-Brasil SDK (BirdID, Certisign, VIDaaS).
 */
export interface CertificateInfo {
  subject: string;
  issuer: string;
  serialNumber: string;
  notBefore: Date;
  notAfter: Date;
  certificateType: CertificateType;
}

/**
 * Result of certificate validation against ICP-Brasil chain of trust.
 */
export interface CertificateValidationResult {
  valid: boolean;
  expired: boolean;
  revoked: boolean;
  trustedChain: boolean;
  subject: string;
  issuer: string;
  notBefore: Date;
  notAfter: Date;
  errors: string[];
}

/**
 * Digital Signature Service — ICP-Brasil PKI Integration
 *
 * Implements digital signature operations compliant with CFM Resolution 2.299/2021.
 * Brazilian medical regulations require electronic health records to be signed
 * with ICP-Brasil A1 or A3 certificates.
 *
 * NOTE: Actual cryptographic operations are stubs. Real ICP-Brasil integration
 * requires external services such as BirdID, Certisign, VIDaaS, or similar
 * TSA/CA providers. The stub methods document the expected contract for each
 * operation so that a real implementation can be dropped in.
 */
@Injectable()
export class DigitalSignatureService {
  private readonly logger = new Logger(DigitalSignatureService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Sign a clinical document (ClinicalDocument) with an ICP-Brasil certificate.
   * CFM Resolution 2.299/2021 requires digital signatures on all clinical documents.
   */
  async signDocument(
    signerId: string,
    tenantId: string,
    documentId: string,
    certificateBase64: string,
    certificatePassword: string | undefined,
    signatureStandard: SignatureStandard,
  ) {
    const document = await this.prisma.clinicalDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID "${documentId}" not found`);
    }

    if (document.tenantId !== tenantId) {
      throw new BadRequestException('Document does not belong to this tenant');
    }

    // Parse and validate the ICP-Brasil certificate
    const certInfo = this.parseCertificate(certificateBase64, certificatePassword);
    const validation = this.performCertificateValidation(certInfo);

    if (!validation.valid) {
      throw new BadRequestException(
        `Invalid certificate: ${validation.errors.join(', ')}`,
      );
    }

    // Generate SHA-256 hash of the document content
    const contentToSign = document.content ?? document.title;
    const signatureHash = this.generateSignatureHash(contentToSign);

    // Create the digital signature (stub — real impl uses PKCS#7/CMS)
    const signatureValue = this.createSignatureValue(
      signatureHash,
      certificateBase64,
      signatureStandard,
    );

    // Generate RFC 3161 timestamp if using CAdES-T standard
    const timestampToken =
      signatureStandard === SignatureStandard.CADES_T
        ? await this.createTimestamp(signatureHash)
        : null;

    const signature = await this.prisma.digitalSignature.create({
      data: {
        tenantId,
        documentId,
        signerId,
        signatureType: SignatureType.DISCHARGE_SUMMARY,
        certificateType: certInfo.certificateType,
        certificateSubject: certInfo.subject,
        certificateIssuer: certInfo.issuer,
        certificateSerial: certInfo.serialNumber,
        certificateNotBefore: certInfo.notBefore,
        certificateNotAfter: certInfo.notAfter,
        signatureHash,
        signatureValue,
        signatureStandard,
        timestampToken,
        verified: true,
        verifiedAt: new Date(),
      },
    });

    this.logger.log(
      `Document ${documentId} signed by user ${signerId} with ${signatureStandard}`,
    );

    return signature;
  }

  /**
   * Sign a clinical note with an ICP-Brasil certificate.
   * CFM Resolution 2.299/2021 — clinical notes require digital signature
   * from the attending physician.
   */
  async signClinicalNote(
    signerId: string,
    tenantId: string,
    noteId: string,
    certificateBase64: string,
    certificatePassword: string | undefined,
    signatureStandard: SignatureStandard,
  ) {
    const note = await this.prisma.clinicalNote.findUnique({
      where: { id: noteId },
      include: { encounter: { select: { tenantId: true } } },
    });

    if (!note) {
      throw new NotFoundException(`Clinical note with ID "${noteId}" not found`);
    }

    if (note.encounter.tenantId !== tenantId) {
      throw new BadRequestException('Clinical note does not belong to this tenant');
    }

    const certInfo = this.parseCertificate(certificateBase64, certificatePassword);
    const validation = this.performCertificateValidation(certInfo);

    if (!validation.valid) {
      throw new BadRequestException(
        `Invalid certificate: ${validation.errors.join(', ')}`,
      );
    }

    const contentToSign = [
      note.subjective,
      note.objective,
      note.assessment,
      note.plan,
      note.freeText,
    ]
      .filter(Boolean)
      .join('\n');

    const signatureHash = this.generateSignatureHash(contentToSign || noteId);
    const signatureValue = this.createSignatureValue(
      signatureHash,
      certificateBase64,
      signatureStandard,
    );

    const timestampToken =
      signatureStandard === SignatureStandard.CADES_T
        ? await this.createTimestamp(signatureHash)
        : null;

    const signature = await this.prisma.digitalSignature.create({
      data: {
        tenantId,
        clinicalNoteId: noteId,
        signerId,
        signatureType: SignatureType.CLINICAL_NOTE,
        certificateType: certInfo.certificateType,
        certificateSubject: certInfo.subject,
        certificateIssuer: certInfo.issuer,
        certificateSerial: certInfo.serialNumber,
        certificateNotBefore: certInfo.notBefore,
        certificateNotAfter: certInfo.notAfter,
        signatureHash,
        signatureValue,
        signatureStandard,
        timestampToken,
        verified: true,
        verifiedAt: new Date(),
      },
    });

    this.logger.log(
      `Clinical note ${noteId} signed by user ${signerId} with ${signatureStandard}`,
    );

    return signature;
  }

  /**
   * Sign a prescription with an ICP-Brasil certificate.
   * CFM Resolution 2.299/2021 — prescriptions MUST be digitally signed
   * to have legal validity in electronic format.
   */
  async signPrescription(
    signerId: string,
    tenantId: string,
    prescriptionId: string,
    certificateBase64: string,
    certificatePassword: string | undefined,
    signatureStandard: SignatureStandard,
  ) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id: prescriptionId },
      include: { items: true },
    });

    if (!prescription) {
      throw new NotFoundException(
        `Prescription with ID "${prescriptionId}" not found`,
      );
    }

    if (prescription.tenantId !== tenantId) {
      throw new BadRequestException('Prescription does not belong to this tenant');
    }

    const certInfo = this.parseCertificate(certificateBase64, certificatePassword);
    const validation = this.performCertificateValidation(certInfo);

    if (!validation.valid) {
      throw new BadRequestException(
        `Invalid certificate: ${validation.errors.join(', ')}`,
      );
    }

    // Build content string from prescription items for hashing
    const contentToSign = prescription.items
      .map(
        (item) =>
          `${item.medicationName ?? ''} ${item.dose ?? ''} ${item.route ?? ''} ${item.frequency ?? ''}`,
      )
      .join('\n');

    const signatureHash = this.generateSignatureHash(
      contentToSign || prescriptionId,
    );
    const signatureValue = this.createSignatureValue(
      signatureHash,
      certificateBase64,
      signatureStandard,
    );

    const timestampToken =
      signatureStandard === SignatureStandard.CADES_T
        ? await this.createTimestamp(signatureHash)
        : null;

    const signature = await this.prisma.digitalSignature.create({
      data: {
        tenantId,
        prescriptionId,
        signerId,
        signatureType: SignatureType.PRESCRIPTION,
        certificateType: certInfo.certificateType,
        certificateSubject: certInfo.subject,
        certificateIssuer: certInfo.issuer,
        certificateSerial: certInfo.serialNumber,
        certificateNotBefore: certInfo.notBefore,
        certificateNotAfter: certInfo.notAfter,
        signatureHash,
        signatureValue,
        signatureStandard,
        timestampToken,
        verified: true,
        verifiedAt: new Date(),
      },
    });

    this.logger.log(
      `Prescription ${prescriptionId} signed by user ${signerId} with ${signatureStandard}`,
    );

    return signature;
  }

  /**
   * Verify a digital signature by re-computing the hash and checking
   * the certificate chain against ICP-Brasil root CAs.
   */
  async verifySignature(signatureId: string) {
    const signature = await this.prisma.digitalSignature.findUnique({
      where: { id: signatureId },
      include: {
        signer: { select: { id: true, name: true, email: true } },
        document: { select: { id: true, title: true, content: true } },
        clinicalNote: {
          select: {
            id: true,
            subjective: true,
            objective: true,
            assessment: true,
            plan: true,
            freeText: true,
          },
        },
        prescription: {
          select: { id: true, items: true },
        },
      },
    });

    if (!signature) {
      throw new NotFoundException(
        `Digital signature with ID "${signatureId}" not found`,
      );
    }

    // Re-compute hash from current content and compare
    // STUB: In production, verify the PKCS#7 signature using the certificate chain
    const verified = true; // Stub — real impl verifies cryptographic signature
    const verificationChain = JSON.stringify({
      rootCA: 'ICP-Brasil AC Raiz v10',
      intermediateCA: signature.certificateIssuer,
      endEntity: signature.certificateSubject,
      verifiedAt: new Date().toISOString(),
    });

    const updated = await this.prisma.digitalSignature.update({
      where: { id: signatureId },
      data: {
        verified,
        verifiedAt: new Date(),
        verificationChain,
      },
      include: {
        signer: { select: { id: true, name: true, email: true } },
      },
    });

    this.logger.log(
      `Signature ${signatureId} verified: ${verified}`,
    );

    return updated;
  }

  /**
   * List all digital signatures for a specific document.
   */
  async getDocumentSignatures(documentId: string) {
    return this.prisma.digitalSignature.findMany({
      where: { documentId },
      orderBy: { signedAt: 'desc' },
      include: {
        signer: { select: { id: true, name: true, email: true } },
      },
    });
  }

  /**
   * List all digital signatures created by a specific user.
   */
  async getUserSignatures(userId: string) {
    return this.prisma.digitalSignature.findMany({
      where: { signerId: userId },
      orderBy: { signedAt: 'desc' },
      include: {
        document: { select: { id: true, title: true, type: true } },
        clinicalNote: { select: { id: true, type: true } },
        prescription: { select: { id: true, type: true } },
      },
    });
  }

  /**
   * Validate an ICP-Brasil certificate without signing anything.
   * Checks expiry, certificate chain, and revocation status.
   */
  validateCertificate(
    certificateBase64: string,
    certificatePassword: string | undefined,
  ): CertificateValidationResult {
    const certInfo = this.parseCertificate(certificateBase64, certificatePassword);
    return this.performCertificateValidation(certInfo);
  }

  /**
   * Generate a SHA-256 hash of the given content.
   * Deterministic — same content always produces the same hash.
   * Used as the document digest before signing per ICP-Brasil standards.
   */
  generateSignatureHash(content: string): string {
    return createHash('sha256').update(content, 'utf8').digest('hex');
  }

  /**
   * Create an RFC 3161 timestamp token.
   * STUB: In production, this contacts a TSA (Time-Stamp Authority)
   * such as the AC Raiz ICP-Brasil TSA or a commercial TSA provider.
   */
  async createTimestamp(hash: string): Promise<string> {
    // STUB: Real implementation sends hash to an RFC 3161 TSA server
    // e.g., http://timestamp.icp-brasil.gov.br or commercial TSA
    const stubTimestamp = {
      version: 1,
      policy: '2.16.76.1.6.2',
      messageImprint: {
        hashAlgorithm: 'SHA-256',
        hashedMessage: hash,
      },
      serialNumber: `TST-${Date.now()}`,
      genTime: new Date().toISOString(),
      tsa: 'ICP-Brasil TSA (stub)',
    };

    return Buffer.from(JSON.stringify(stubTimestamp)).toString('base64');
  }

  /**
   * Generate a report of all signatures within a date range for a tenant.
   * Used for audit compliance per CFM Resolution 2.299/2021.
   */
  async getSignatureReport(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ) {
    const signatures = await this.prisma.digitalSignature.findMany({
      where: {
        tenantId,
        signedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { signedAt: 'desc' },
      include: {
        signer: { select: { id: true, name: true, email: true } },
        document: { select: { id: true, title: true, type: true } },
        clinicalNote: { select: { id: true, type: true } },
        prescription: { select: { id: true, type: true } },
      },
    });

    const byType: Record<string, number> = {};
    const byStandard: Record<string, number> = {};
    const bySigner: Record<string, number> = {};

    for (const sig of signatures) {
      byType[sig.signatureType] = (byType[sig.signatureType] ?? 0) + 1;
      byStandard[sig.signatureStandard] =
        (byStandard[sig.signatureStandard] ?? 0) + 1;
      bySigner[sig.signer.name] = (bySigner[sig.signer.name] ?? 0) + 1;
    }

    return {
      totalSignatures: signatures.length,
      period: { startDate, endDate },
      byType,
      byStandard,
      bySigner,
      signatures,
    };
  }

  // ===========================================================================
  // Private helpers — Certificate parsing and signature creation stubs
  // ===========================================================================

  /**
   * Parse an ICP-Brasil PFX/P12 certificate.
   * STUB: In production, use node-forge or @peculiar/x509 to parse the
   * PKCS#12 container and extract certificate information.
   */
  private parseCertificate(
    _certificateBase64: string,
    _password: string | undefined,
  ): CertificateInfo {
    // STUB: Real implementation parses the PFX/P12 file
    // const p12Der = Buffer.from(certificateBase64, 'base64');
    // const p12Asn1 = forge.asn1.fromDer(p12Der.toString('binary'));
    // const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);
    return {
      subject: 'CN=Dr. Exemplo Medico, OU=Pessoa Fisica, O=ICP-Brasil, C=BR',
      issuer: 'CN=AC Certisign Multipla G7, OU=Autoridade Certificadora, O=ICP-Brasil, C=BR',
      serialNumber: `SN-${Date.now()}`,
      notBefore: new Date('2024-01-01'),
      notAfter: new Date('2027-01-01'),
      certificateType: CertificateType.ICP_BRASIL_A1,
    };
  }

  /**
   * Validate a parsed certificate against ICP-Brasil requirements.
   * Checks: expiry, chain of trust, revocation (CRL/OCSP).
   */
  private performCertificateValidation(
    certInfo: CertificateInfo,
  ): CertificateValidationResult {
    const errors: string[] = [];
    const now = new Date();

    const expired = now > certInfo.notAfter || now < certInfo.notBefore;
    if (expired) {
      errors.push(
        `Certificate expired or not yet valid (valid from ${certInfo.notBefore.toISOString()} to ${certInfo.notAfter.toISOString()})`,
      );
    }

    // STUB: Real implementation checks CRL/OCSP for revocation
    const revoked = false;

    // STUB: Real implementation verifies the chain against ICP-Brasil root CAs
    const trustedChain = certInfo.issuer.includes('ICP-Brasil');
    if (!trustedChain) {
      errors.push('Certificate issuer is not in the ICP-Brasil chain of trust');
    }

    return {
      valid: !expired && !revoked && trustedChain,
      expired,
      revoked,
      trustedChain,
      subject: certInfo.subject,
      issuer: certInfo.issuer,
      notBefore: certInfo.notBefore,
      notAfter: certInfo.notAfter,
      errors,
    };
  }

  /**
   * Create the actual signature value.
   * STUB: Real implementation creates a CAdES/PAdES/XAdES signature
   * using the private key from the certificate.
   */
  private createSignatureValue(
    hash: string,
    _certificateBase64: string,
    standard: SignatureStandard,
  ): string {
    // STUB: Real implementation uses PKCS#7/CMS to create the signature
    const stubSignature = {
      algorithm: 'SHA256withRSA',
      standard,
      hash,
      signedAt: new Date().toISOString(),
      note: 'STUB — replace with real ICP-Brasil signature via BirdID/Certisign/VIDaaS',
    };

    return Buffer.from(JSON.stringify(stubSignature)).toString('base64');
  }
}
