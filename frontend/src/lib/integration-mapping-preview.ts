export type MappingRule = {
  id: number;
  source: string;
  system: string;
  target: string;
  transform: "Direct" | "Scale" | "Date/Time" | "Lookup";
  conversion: string;
  required: boolean;
  active: boolean;
  version: string;
  validation: "Valid" | "Error" | "Warning" | "Unmapped";
};

export function createMappingPreviewRules(): MappingRule[] {
  const rows: [string, string, string, MappingRule["transform"], string, boolean, boolean, string][] = [
    ["Pipe_ID", "SCADA OPC", "Asset ID", "Direct", "-", true, true, "v2.1"],
    ["Pressure", "SCADA OPC", "Pressure", "Scale", "kPa → bar", true, true, "v2.1"],
    ["Temperature", "SCADA OPC", "Temperature", "Scale", "°C → °C", true, true, "v2.0"],
    ["FlowRate", "SCADA OPC", "Flow Rate", "Scale", "m³/h → m³/h", false, true, "v2.0"],
    ["Timestamp", "SCADA OPC", "Event Time", "Date/Time", "UTC", true, true, "v2.1"],
    ["Latitude", "GIS System", "Location Latitude", "Direct", "-", false, true, "v1.5"],
    ["Longitude", "GIS System", "Location Longitude", "Direct", "-", false, true, "v1.5"],
    ["Depth", "Maximo (CMMS)", "Install Depth", "Scale", "ft → m", false, true, "v1.3"],
    ["Wall_Thickness", "Inspection (ILI)", "Wall Thickness", "Scale", "in → mm", true, true, "v2.0"],
    ["Anomaly_Type", "Inspection (ILI)", "Feature Type", "Lookup", "-", true, false, "v1.0"]
  ];
  const extra: [string, string, string][] = [
    ["Segment_ID", "SCADA OPC", "Segment ID"], ["Status", "SCADA OPC", "Operational Status"],
    ["Quality", "SCADA OPC", "Data Quality"], ["Source", "SCADA OPC", "Source System"],
    ["Elevation", "GIS System", "Elevation"], ["Chainage", "GIS System", "Chainage"],
    ["Region", "GIS System", "Region"], ["Asset_Name", "GIS System", "Asset Name"],
    ["Material", "Maximo (CMMS)", "Material"], ["Install_Date", "Maximo (CMMS)", "Installation Date"],
    ["Diameter", "Maximo (CMMS)", "Outside Diameter"], ["Owner", "Maximo (CMMS)", "Asset Owner"],
    ["Inspection_ID", "Inspection (ILI)", "Inspection ID"], ["Metal_Loss", "Inspection (ILI)", "Metal Loss"],
    ["Anomaly_Length", "Inspection (ILI)", "Feature Length"], ["Anomaly_Width", "Inspection (ILI)", "Feature Width"],
    ["Clock_Position", "Inspection (ILI)", "Clock Position"], ["Anomaly_Status", "Inspection (ILI)", "Anomaly Status"],
    ["Inspection_Date", "Inspection (ILI)", "Inspection Date"], ["Tool_Type", "Inspection (ILI)", "Tool Type"],
    ["Potential", "CP Monitoring", "Pipe Potential"], ["Current", "CP Monitoring", "Output Current"],
    ["Voltage", "CP Monitoring", "Output Voltage"], ["Rectifier_ID", "CP Monitoring", "Rectifier ID"],
    ["Test_Point", "CP Monitoring", "Test Point ID"], ["Reading_Time", "CP Monitoring", "Reading Time"],
    ["Sample_ID", "Laboratory (LIMS)", "Sample ID"], ["Sample_Date", "Laboratory (LIMS)", "Sample Date"],
    ["pH", "Laboratory (LIMS)", "pH"], ["Chloride", "Laboratory (LIMS)", "Chloride Concentration"],
    ["Corrosion_Rate", "Laboratory (LIMS)", "Corrosion Rate"], ["Lab_Status", "Laboratory (LIMS)", "Sample Status"],
    ["Work_Order", "Maximo (CMMS)", "Work Order ID"], ["Priority", "Maximo (CMMS)", "Priority"],
    ["Work_Status", "Maximo (CMMS)", "Work Order Status"], ["Due_Date", "Maximo (CMMS)", "Due Date"],
    ["Document_ID", "Documents", "Document ID"], ["File_Name", "Documents", "File Name"],
    ["Document_Type", "Documents", "Document Type"], ["Revision", "Documents", "Revision"],
    ["Upload_Date", "Documents", "Upload Date"], ["Author", "Documents", "Author"],
    ["Operating_Mode", "SCADA OPC", "Operating Mode"], ["Flow_Direction", "SCADA OPC", "Flow Direction"],
    ["Alarm_Code", "SCADA OPC", "Alarm Code"], ["Legacy_Tag", "SCADA OPC", "Unassigned"]
  ];
  const first = rows.map(([source, system, target, transform, conversion, required, active, version], index): MappingRule => ({ id: index + 1, source, system, target, transform, conversion, required, active, version, validation: "Valid" }));
  return [...first, ...extra.map(([source, system, target], index): MappingRule => ({ id: index + 11, source, system, target, transform: source.includes("Date") || source.includes("Time") ? "Date/Time" : "Direct", conversion: source.includes("Date") || source.includes("Time") ? "UTC" : "-", required: false, active: true, version: "v1.0", validation: index === 12 || index === 30 ? "Error" : index === 28 ? "Warning" : index === 45 ? "Unmapped" : "Valid" }))];
}

export const mappingChanges = [
  { time: "14:28", user: "JDoe", change: "Updated Pressure mapping", status: "Success" },
  { time: "13:52", user: "ASmith", change: "Added Anomaly_Type mapping", status: "Success" },
  { time: "11:16", user: "JDoe", change: "Modified unit conversion (ft → m)", status: "Success" },
  { time: "10:34", user: "MLee", change: "Updated template (SCADA)", status: "Success" },
  { time: "09:12", user: "ASmith", change: "Disabled deprecated field", status: "Success" }
];
