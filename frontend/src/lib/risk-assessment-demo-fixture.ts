export type DemoRiskLevel = "Very Low" | "Low" | "Medium" | "High" | "Very High";
export type DemoRiskSegment = { id:string; name:string; kpStart:number; kpEnd:number; pof:number; cof:number; score:number; level:DemoRiskLevel; primaryThreat:string; threats:[number,number,number,number,number,number]; cofFactors:{people:number;environment:number;production:number;reputation:number} };

export const threatAxes = ["External corrosion", "Internal corrosion", "Third party", "Geohazard", "SCC", "Equipment"];
export const riskSegments: DemoRiskSegment[] = [
  {id:"SEG-01",name:"North Station",kpStart:0,kpEnd:12.4,pof:2,cof:3,score:6,level:"Low",primaryThreat:"Equipment",threats:[32,28,22,18,15,41],cofFactors:{people:2,environment:3,production:3,reputation:2}},
  {id:"SEG-02",name:"River Crossing",kpStart:12.4,kpEnd:25.8,pof:4,cof:5,score:20,level:"Very High",primaryThreat:"External corrosion",threats:[88,52,35,74,48,27],cofFactors:{people:4,environment:5,production:5,reputation:4}},
  {id:"SEG-03",name:"Industrial Belt",kpStart:25.8,kpEnd:39.1,pof:4,cof:4,score:16,level:"High",primaryThreat:"Third party",threats:[67,43,91,31,39,55],cofFactors:{people:4,environment:3,production:5,reputation:4}},
  {id:"SEG-04",name:"East Farmland",kpStart:39.1,kpEnd:53.6,pof:2,cof:2,score:4,level:"Low",primaryThreat:"External corrosion",threats:[45,24,31,19,18,22],cofFactors:{people:1,environment:3,production:2,reputation:1}},
  {id:"SEG-05",name:"Hill Section",kpStart:53.6,kpEnd:66.2,pof:3,cof:4,score:12,level:"High",primaryThreat:"Geohazard",threats:[39,21,28,89,25,34],cofFactors:{people:3,environment:4,production:4,reputation:3}},
  {id:"SEG-06",name:"Urban Corridor",kpStart:66.2,kpEnd:78.9,pof:3,cof:5,score:15,level:"High",primaryThreat:"Third party",threats:[51,32,84,22,35,47],cofFactors:{people:5,environment:3,production:5,reputation:5}},
  {id:"SEG-07",name:"South Terminal",kpStart:78.9,kpEnd:91.5,pof:2,cof:3,score:6,level:"Low",primaryThreat:"Equipment",threats:[29,36,25,17,24,58],cofFactors:{people:3,environment:2,production:4,reputation:3}},
  {id:"SEG-08",name:"Coastal Approach",kpStart:91.5,kpEnd:104.3,pof:1,cof:2,score:2,level:"Very Low",primaryThreat:"Internal corrosion",threats:[23,38,19,27,16,21],cofFactors:{people:2,environment:3,production:2,reputation:2}}
];
export const mitigationActions = [
  {id:"MIT-014",segmentId:"SEG-02",action:"Excavate and inspect coating anomaly",owner:"Integrity Team",due:"2026-10-05",priority:"Critical",status:"In Progress"},
  {id:"MIT-015",segmentId:"SEG-03",action:"Install additional line markers and patrol signage",owner:"Operations",due:"2026-10-18",priority:"High",status:"Planned"},
  {id:"MIT-016",segmentId:"SEG-05",action:"Complete slope movement geotechnical survey",owner:"Geotechnical",due:"2026-09-28",priority:"High",status:"In Progress"},
  {id:"MIT-017",segmentId:"SEG-06",action:"Review encroachment controls with local authority",owner:"ROW Team",due:"2026-11-02",priority:"Medium",status:"Open"}
];
export const monthlyRiskTrend=[14.8,14.2,13.9,14.5,13.6,13.1,12.7,12.3,11.8,11.4,10.9,10.4];
export const monthLabels=["Oct","Nov","Dec","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep"];
