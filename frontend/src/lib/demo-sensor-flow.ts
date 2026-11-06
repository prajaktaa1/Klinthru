import fixtures from "@/fixtures/pl002-sensor-demo.json";
export type DemoSensorFlowRow={dataMode:"DEMO";pipelineId:string;pipeline:string;deviceId:string;sensor:string;sourceChannel:"MQTT"|"TCP"|"API";value:number;unit:string;sourceTimestamp:string;sequence:string};
/** In-memory display of declared fixtures only. Never posts to any ingestion API. */
export function replayDemoSensorFixtures():DemoSensorFlowRow[]{
 if(fixtures.dataMode!=="DEMO"||fixtures.pipeline.id!=="demo:pl-002")throw Error("DEMO fixture namespace required");
 return fixtures.samples.map(sample=>{
  const sensor=fixtures.sensors.find(row=>row.id===sample.deviceId&&row.tagId===sample.tagId);
  if(sample.dataMode!=="DEMO"||sample.pipelineId!==fixtures.pipeline.id||!sensor||!sensor.id.startsWith("demo:")||sample.reading.tagId!==sample.tagId||sample.reading.engineeringUnit!==sensor.unit||!Number.isFinite(sample.reading.value)||!Number.isFinite(Date.parse(sample.reading.sourceTimestamp))||!["MQTT","TCP","API"].includes(sample.fixtureChannel))throw Error("Invalid isolated DEMO sample");
  return {dataMode:"DEMO",pipelineId:fixtures.pipeline.id,pipeline:fixtures.pipeline.label,deviceId:sensor.id,sensor:sensor.label,sourceChannel:sample.fixtureChannel as DemoSensorFlowRow["sourceChannel"],value:sample.reading.value,unit:sensor.unit,sourceTimestamp:sample.reading.sourceTimestamp,sequence:sample.reading.sequence};
 });
}
