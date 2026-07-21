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
    label: "No Internal Lining",
    options: ["Bare"]
  },
  {
    label: "Cementitious Lining",
    options: ["Cement Lining"]
  },
  {
    label: "Polymeric Lining",
    options: ["Epoxy"]
  },
  {
    label: "Other",
    options: ["Other"]
  }
];

export const legacyExternalCoatingMap: Record<string, string> = {
  "FBE / PE / PP": "FBE/PE/PP"
};

export const legacyInternalCoatingMap: Record<string, string> = {
  "Epoxy/Others": "Epoxy"
};
