import { decryptJson, decryptOptional, encryptJson } from "../../utils/encryption";
import type { CaseDoc, CaseInput, LegacyCaseDoc } from "./case.types";

// Case details are confidential, so they are encrypted before saving and only
// decrypted on the server for the signed-in owner of the case.

export const encryptCase = (input: CaseInput) => encryptJson(input);

export const isLegacyCase = (raw: CaseDoc | LegacyCaseDoc): raw is LegacyCaseDoc => !("data" in raw);

export function decryptCase(raw: CaseDoc | LegacyCaseDoc): CaseInput {
  if (!isLegacyCase(raw)) return decryptJson<CaseInput>(raw.data);

  const { caseNumber: _number, createdAt: _created, updatedAt: _updated, remarks, ...fields } = raw;
  return { ...fields, remarks: decryptOptional(remarks) };
}
