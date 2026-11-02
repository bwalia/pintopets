/**
 * ICAR manufacturer codes (ISO 11784 code range 900–998).
 *
 * Only mappings we could confirm from a named source are seeded. Unknown codes in
 * 900–998 are still valid ISO manufacturer codes; the UI just shows
 * "manufacturer code (not in our list)". Admins can add or correct rows.
 *
 * Sources:
 *  - ICAR: Registry of RFID devices in conformance with ISO 11784/11785
 *    https://www.icar.org/icar-registry-of-rfid-devices-in-conformance-with-iso-11784-11785/
 *  - Alberta Animal Health Source: "Manufacturer's ISO codes" (ICAR-derived list)
 */

export interface ManufacturerCodeSeed {
  code: number;
  manufacturer: string;
  notes?: string;
  source: "icar_registry" | "aahs_list";
}

export const MICROCHIP_MANUFACTURER_CODES: readonly ManufacturerCodeSeed[] = [
  {
    code: 901,
    manufacturer: "Shared code (various manufacturers)",
    notes:
      "ICAR assigns 901 to several smaller manufacturers. The next 3 digits are the ICAR product code.",
    source: "icar_registry",
  },
  { code: 941, manufacturer: "Datamars Iberica", source: "icar_registry" },
  { code: 944, manufacturer: "Net & Telligent", source: "icar_registry" },
  { code: 965, manufacturer: "SwissPlus ID Group", source: "icar_registry" },
  { code: 967, manufacturer: "Rfdynamics", source: "aahs_list" },
  { code: 968, manufacturer: "AEG ID", source: "icar_registry" },
  { code: 972, manufacturer: "Planet ID", source: "aahs_list" },
  {
    code: 975,
    manufacturer: "HID Global (formerly Sokymat)",
    source: "icar_registry",
  },
  { code: 977, manufacturer: "AVID", source: "aahs_list" },
  { code: 978, manufacturer: "Ordicam", source: "aahs_list" },
  { code: 981, manufacturer: "Datamars", source: "aahs_list" },
  { code: 982, manufacturer: "Allflex", source: "aahs_list" },
  { code: 985, manufacturer: "Destron Fearing", source: "aahs_list" },
  { code: 991, manufacturer: "WUXI FOFIA Technology", source: "icar_registry" },
  { code: 993, manufacturer: "Plastifran", source: "icar_registry" },
];

export const MANUFACTURER_CODE_SOURCES: Record<ManufacturerCodeSeed["source"], string> = {
  icar_registry:
    "ICAR Registry of RFID Devices (https://www.icar.org/icar-registry-of-rfid-devices-in-conformance-with-iso-11784-11785/)",
  aahs_list: "Alberta Animal Health Source, Manufacturer's ISO Codes (ICAR-derived list)",
};
