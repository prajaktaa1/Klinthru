export type PipeGradeOption = {
  value: string;
  label: string;
};

export type PipeMaterialOption = {
  value: string;
  label: string;
  gradeLabel: string;
  customGradeLabel: string;
  category: "Metallic Materials" | "Non-Metallic Materials";
  grades: PipeGradeOption[];
};

function grade(value: string): PipeGradeOption {
  return { value, label: value };
}

export const PIPE_MATERIAL_OPTIONS: PipeMaterialOption[] = [
  {
    value: "Carbon Steel",
    label: "Carbon Steel",
    gradeLabel: "Pipe Grade",
    customGradeLabel: "Specify Pipe Grade",
    category: "Metallic Materials",
    grades: [
      "ASTM A53 Grade A",
      "ASTM A53 Grade B",
      "ASTM A106 Grade A",
      "ASTM A106 Grade B",
      "ASTM A106 Grade C",
      "API 5L Grade A",
      "API 5L Grade B",
      "API 5L X42",
      "API 5L X46",
      "API 5L X52",
      "API 5L X56",
      "API 5L X60",
      "API 5L X65",
      "API 5L X70",
      "API 5L X80",
      "Other"
    ].map(grade)
  },
  {
    value: "Low-Alloy Steel",
    label: "Low-Alloy Steel",
    gradeLabel: "Pipe Grade",
    customGradeLabel: "Specify Pipe Grade",
    category: "Metallic Materials",
    grades: [
      "ASTM A335 P1",
      "ASTM A335 P5",
      "ASTM A335 P9",
      "ASTM A335 P11",
      "ASTM A335 P12",
      "ASTM A335 P22",
      "ASTM A335 P91",
      "ASTM A335 P92",
      "Other"
    ].map(grade)
  },
  {
    value: "Stainless Steel 304",
    label: "Stainless Steel 304",
    gradeLabel: "Stainless Steel Grade",
    customGradeLabel: "Specify Pipe Grade",
    category: "Metallic Materials",
    grades: ["ASTM A312 TP304", "ASTM A312 TP304L", "ASTM A312 TP304H", "Other"].map(grade)
  },
  {
    value: "Stainless Steel 316",
    label: "Stainless Steel 316",
    gradeLabel: "Stainless Steel Grade",
    customGradeLabel: "Specify Pipe Grade",
    category: "Metallic Materials",
    grades: ["ASTM A312 TP316", "ASTM A312 TP316L", "ASTM A312 TP316H", "Other"].map(grade)
  },
  {
    value: "Duplex Stainless Steel",
    label: "Duplex Stainless Steel",
    gradeLabel: "Duplex Grade",
    customGradeLabel: "Specify Pipe Grade",
    category: "Metallic Materials",
    grades: ["ASTM A790 UNS S31803", "ASTM A790 UNS S32205", "Duplex 2205", "Other"].map(grade)
  },
  {
    value: "Super Duplex Stainless Steel",
    label: "Super Duplex Stainless Steel",
    gradeLabel: "Super Duplex Grade",
    customGradeLabel: "Specify Pipe Grade",
    category: "Metallic Materials",
    grades: ["ASTM A790 UNS S32750", "ASTM A790 UNS S32760", "Super Duplex 2507", "Other"].map(grade)
  },
  {
    value: "Cast Iron",
    label: "Cast Iron",
    gradeLabel: "Cast-Iron Class / Grade",
    customGradeLabel: "Specify Pipe Class",
    category: "Metallic Materials",
    grades: [
      "Grey Cast Iron",
      "ASTM A48 Class 20",
      "ASTM A48 Class 25",
      "ASTM A48 Class 30",
      "ASTM A48 Class 35",
      "ASTM A48 Class 40",
      "Other"
    ].map(grade)
  },
  {
    value: "Ductile Iron",
    label: "Ductile Iron",
    gradeLabel: "Ductile-Iron Class",
    customGradeLabel: "Specify Pipe Class",
    category: "Metallic Materials",
    grades: [
      "ISO 2531 Class C25",
      "ISO 2531 Class C30",
      "ISO 2531 Class C40",
      "ISO 2531 Class C50",
      "ISO 2531 Class C64",
      "ISO 2531 Class C100",
      "K7",
      "K8",
      "K9",
      "K10",
      "K12",
      "Other"
    ].map(grade)
  },
  {
    value: "Galvanized Steel",
    label: "Galvanized Steel",
    gradeLabel: "Base Steel Grade",
    customGradeLabel: "Specify Pipe Grade",
    category: "Metallic Materials",
    grades: [
      "ASTM A53 Grade A Galvanized",
      "ASTM A53 Grade B Galvanized",
      "EN 10255 Light",
      "EN 10255 Medium",
      "EN 10255 Heavy",
      "Other"
    ].map(grade)
  },
  {
    value: "Copper",
    label: "Copper",
    gradeLabel: "Copper Type / Grade",
    customGradeLabel: "Specify Material Grade",
    category: "Metallic Materials",
    grades: [
      "ASTM B88 Type K",
      "ASTM B88 Type L",
      "ASTM B88 Type M",
      "ASTM B88 Type DWV",
      "Copper C12200",
      "Other"
    ].map(grade)
  },
  {
    value: "Copper-Nickel Alloy",
    label: "Copper-Nickel Alloy",
    gradeLabel: "Copper-Nickel Grade",
    customGradeLabel: "Specify Material Grade",
    category: "Metallic Materials",
    grades: ["Cu-Ni 90/10", "Cu-Ni 70/30", "UNS C70600", "UNS C71500", "Other"].map(grade)
  },
  {
    value: "Nickel Alloy",
    label: "Nickel Alloy",
    gradeLabel: "Nickel-Alloy Grade",
    customGradeLabel: "Specify Material Grade",
    category: "Metallic Materials",
    grades: ["Alloy 200", "Alloy 400", "Alloy 600", "Alloy 625", "Alloy 800", "Alloy 825", "Alloy C276", "Other"].map(grade)
  },
  {
    value: "HDPE / Polyethylene",
    label: "HDPE / Polyethylene",
    gradeLabel: "PE Material Grade",
    customGradeLabel: "Specify Material Grade",
    category: "Non-Metallic Materials",
    grades: ["PE63", "PE80", "PE100", "PE100-RC", "Other"].map(grade)
  },
  {
    value: "PVC",
    label: "PVC",
    gradeLabel: "PVC Material / Pressure Class",
    customGradeLabel: "Specify Pressure Class",
    category: "Non-Metallic Materials",
    grades: ["PVC-U", "PVC-M", "PVC-O", "Class 6", "Class 9", "Class 12", "Class 16", "Schedule 40", "Schedule 80", "Other"].map(grade)
  },
  {
    value: "CPVC",
    label: "CPVC",
    gradeLabel: "CPVC Class / Schedule",
    customGradeLabel: "Specify Pressure Class",
    category: "Non-Metallic Materials",
    grades: ["CPVC Schedule 40", "CPVC Schedule 80", "CPVC SDR 11", "CPVC SDR 13.5", "Other"].map(grade)
  },
  {
    value: "Polypropylene",
    label: "Polypropylene",
    gradeLabel: "PP Material Grade",
    customGradeLabel: "Specify Material Grade",
    category: "Non-Metallic Materials",
    grades: ["PP-H", "PP-B", "PP-R", "PP-RCT", "Other"].map(grade)
  },
  {
    value: "GRP / FRP",
    label: "GRP / FRP",
    gradeLabel: "Pressure / Stiffness Class",
    customGradeLabel: "Specify Pressure Class",
    category: "Non-Metallic Materials",
    grades: ["PN6", "PN10", "PN16", "PN20", "PN25", "SN2500", "SN5000", "SN10000", "Other"].map(grade)
  },
  {
    value: "Reinforced Concrete",
    label: "Reinforced Concrete",
    gradeLabel: "Concrete Pipe Class",
    customGradeLabel: "Specify Pipe Class",
    category: "Non-Metallic Materials",
    grades: [
      "ASTM C76 Class I",
      "ASTM C76 Class II",
      "ASTM C76 Class III",
      "ASTM C76 Class IV",
      "ASTM C76 Class V",
      "Other"
    ].map(grade)
  },
  {
    value: "Prestressed Concrete Cylinder Pipe",
    label: "Prestressed Concrete Cylinder Pipe",
    gradeLabel: "PCCP Type / Class",
    customGradeLabel: "Specify Pipe Class",
    category: "Non-Metallic Materials",
    grades: ["Embedded Cylinder Pipe", "Lined Cylinder Pipe", "Project-Specified Pressure Class", "Other"].map(grade)
  },
  {
    value: "Asbestos Cement",
    label: "Asbestos Cement",
    gradeLabel: "Legacy Pipe Class",
    customGradeLabel: "Specify Pipe Class",
    category: "Non-Metallic Materials",
    grades: ["Class 100", "Class 150", "Class 200", "Other"].map(grade)
  },
  {
    value: "Other",
    label: "Other",
    gradeLabel: "Specify Grade / Class",
    customGradeLabel: "Specify Grade / Class",
    category: "Non-Metallic Materials",
    grades: ["Other"].map(grade)
  }
];

export function getPipeMaterialOption(value: string) {
  return PIPE_MATERIAL_OPTIONS.find((option) => option.value === value);
}

export function getPipeMaterialGroups() {
  return ["Metallic Materials", "Non-Metallic Materials"].map((category) => ({
    label: category,
    options: PIPE_MATERIAL_OPTIONS.filter((option) => option.category === category).map((option) => option.label)
  }));
}
