import {
  SensorAssignmentCategory,
  SensorAssignmentDataSource,
  SensorAssignmentStatus
} from "@/lib/types";

export const sensorAssignmentCategories: SensorAssignmentCategory[] = [
  "Internal Corrosion Sensors",
  "Internal Process Sensors",
  "External Corrosion Sensors"
];

export const sensorNamesByCategory: Record<SensorAssignmentCategory, string[]> = {
  "Internal Corrosion Sensors": ["Corrosion Coupon", "Electrical Resistance Probe"],
  "Internal Process Sensors": [
    "Flow Meter",
    "Level Switch",
    "Pressure Transmitter",
    "Temperature Sensor",
    "Discharge Sensor",
    "Flow Control Valve",
    "Pressure Relief Valve (PRV)"
  ],
  "External Corrosion Sensors": ["CP Monitoring Module"]
};

export const sensorDeviceTypesByCategory: Record<SensorAssignmentCategory, string[]> = {
  "Internal Corrosion Sensors": ["Corrosion Coupon", "Electrical Resistance Probe"],
  "Internal Process Sensors": [
    "Flow Meter",
    "Level Switch",
    "Pressure Transmitter",
    "Temperature Sensor",
    "Discharge Sensor",
    "Flow Control Valve",
    "Pressure Relief Valve (PRV)"
  ],
  "External Corrosion Sensors": ["CP Monitoring Module"]
};

export const installationTypes = [
  "Inline",
  "Insertion",
  "Surface Mounted",
  "Remote Mounted",
  "Test Station",
  "Other"
];

export const valuesMeasuredOptions = [
  "Corrosion rate",
  "Metal loss",
  "Flow",
  "Level",
  "Pressure",
  "Temperature",
  "Discharge",
  "Valve position",
  "Pipe-to-soil potential"
];

export const measurementUnits = [
  "mpy",
  "mm/y",
  "%",
  "m3/h",
  "bar",
  "deg C",
  "V vs CSE",
  "State",
  "Other",
  "kPa",
  "\u00b0C",
  "mm/yr",
  "m\u00b3/h",
  "mm/s",
  "g",
  "psi",
  "MPa",
  "\u00b0F",
  "K",
  "in/s",
  "mm/year",
  "mm",
  "in",
  "m",
  "mV"
];

export const dataSources: SensorAssignmentDataSource[] = ["Manual", "IoT Gateway", "API", "Other"];
export const assignmentStatuses: SensorAssignmentStatus[] = [
  "Active",
  "Inactive",
  "Fault",
  "Maintenance",
  "Unassigned"
];

export function getDefaultSensorName(category: SensorAssignmentCategory) {
  return sensorNamesByCategory[category][0];
}

export function getDefaultSensorDeviceType(category: SensorAssignmentCategory) {
  return sensorDeviceTypesByCategory[category][0];
}
