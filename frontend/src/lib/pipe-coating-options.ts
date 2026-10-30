export type CoatingOptionGroup = {
  label: string;
  options: string[];
};

export const externalCoatingOptions: CoatingOptionGroup[] = [
  {
    label: "No Coating",
    options: ["Bare"]
  },
  {
    label: "Bituminous / Tape Coatings",
    options: [
      "Asphalt Enamel",
      "Wrap-Tape",
      "High-Temperature Wrap Tape",
      "DENSO Petrolatum Tape",
      "Heat-Shrink Sleeve",
      "Coal-Tar"
    ]
  },
  {
    label: "Polymeric Coatings",
    options: ["FBE/PE/PP", "FBE", "PE", "PP", "IPP", "Three-Layer Polypropylene (3LPP)"]
  },
  {
    label: "Other",
    options: ["Other"]
  }
];

export const internalCoatingOptions: CoatingOptionGroup[] = [
  {
    label: "No Internal Coating",
    options: ["Bare / Uncoated"]
  },
  {
    label: "Epoxy Coatings",
    options: ["Liquid Epoxy", "Fusion-Bonded Epoxy (FBE)", "Phenolic Epoxy"]
  },
  {
    label: "Polymeric Linings",
    options: ["Polyurethane", "Polyethylene (PE) Lining"]
  },
  {
    label: "Cementitious Lining",
    options: ["Cement Mortar Lining"]
  },
  {
    label: "Specialty Linings",
    options: [
      "Glass-Flake Epoxy",
      "Rubber Lining",
      "Fiberglass-Reinforced Plastic (FRP/GRP) Lining",
      "Corrosion-Resistant Alloy (CRA) Cladding"
    ]
  },
  {
    label: "Other",
    options: ["Other", "Unknown"]
  }
];

export const legacyExternalCoatingMap: Record<string, string> = {
  "FBE / PE / PP": "FBE/PE/PP"
};

export const legacyInternalCoatingMap: Record<string, string> = {
  Bare: "Bare / Uncoated",
  "Cement Lining": "Cement Mortar Lining",
  Epoxy: "Liquid Epoxy",
  "Epoxy/Others": "Liquid Epoxy"
};
