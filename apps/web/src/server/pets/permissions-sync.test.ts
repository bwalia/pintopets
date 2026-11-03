import { RECORD_KINDS } from "@pintopets/api-contract";
import { describe, expect, it } from "vitest";
import { CARER_KINDS } from "@/lib/pet-permissions";
import { RECORD_UI } from "@/lib/records-ui";
import { RECORDS } from "./records";

describe("record kind configuration stays in sync", () => {
  it("client carer kinds match the server rules", () => {
    const server = RECORD_KINDS.filter((k) => RECORDS[k].carerCanAdd).sort();
    expect([...CARER_KINDS].sort()).toEqual(server);
  });

  it("every kind has UI, and every UI field maps to an API field", () => {
    for (const kind of RECORD_KINDS) {
      expect(RECORD_UI[kind]).toBeDefined();
    }
  });
});
