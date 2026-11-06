import {z} from "zod";
import {createValidationError,createValidationErrorFromZod} from "./validationErrors";
import type {DeviceRecord} from "../types/domain";
const schema=z.object({unit:z.string().trim().min(1).max(50)}).strict();
const units:Record<DeviceRecord["deviceType"],string[]>={
 "Temperature Sensor":["\u00b0C","\u00b0F","K"],"Pressure Transmitter":["bar","kPa","MPa","psi"],"Pressure Relief Valve (PRV)":["bar","kPa","MPa","psi"],
 "Flow Meter":["m\u00b3/h","m\u00b3/s","L/min","L/s","kg/h","kg/s"],"Discharge Sensor":["m\u00b3/h","m\u00b3/s","L/min","L/s","kg/h","kg/s"],
 "Level Switch":["state","%"],"Flow Control Valve":["%"],"CP Monitoring Module":["mV","V","mA"]
};
export function validateDeviceUnitUpdate(input:unknown,type:DeviceRecord["deviceType"]){
 const parsed=schema.safeParse(input);if(!parsed.success)throw createValidationErrorFromZod(parsed.error);
 const aliases:Record<string,string>={degc:"\u00b0C",celsius:"\u00b0C",degf:"\u00b0F",fahrenheit:"\u00b0F",kelvin:"K","m3/h":"m\u00b3/h","m3/s":"m\u00b3/s"};
 const normalized=aliases[parsed.data.unit.toLowerCase()]??parsed.data.unit;
 const unit=units[type]?.find(candidate=>candidate.toLowerCase()===normalized.toLowerCase());
 if(!unit)throw createValidationError({unit:`Allowed units for ${type}: ${(units[type]??[]).join(", ")||"Not Available"}.`});
 return {unit};
}
