import type {AuthUser} from "../types/domain";
import type {ConnectorScopeInput} from "./types";
import {mergeConnectorConfiguration,validateConnectorScope} from "./validation";
import {createValidationError} from "../validation/validationErrors";
type PipelineOwner={id:string;createdById:string|null;companyId:string|null;creatorCompanyId:string|null;companyRecordId:string|null};
export type ConnectorScopeDatabase={
 $queryRawUnsafe<T=unknown>(sql:string,...values:unknown[]):Promise<T>;
 asset:{findFirst(args:unknown):Promise<{id:string;pipelineId:string}|null>};
};
/** Compatibility read of the existing authoritative column, absent from the generated model.
 * No creator-company fallback, inferred tenant, DDL or database writes. */
export async function resolveConnectorScope(db:ConnectorScopeDatabase,input:ConnectorScopeInput,user:AuthUser){
 if(!user.companyId)throw createValidationError({scope:"A company-scoped account is required to link a connector."});
 const rows=await db.$queryRawUnsafe<PipelineOwner[]>(
  `SELECT p.id,p."createdById",p."companyId",u."companyId" AS "creatorCompanyId",c.id AS "companyRecordId"
   FROM "Pipeline" p LEFT JOIN "User" u ON u.id=p."createdById"
   LEFT JOIN "Company" c ON c.id=p."companyId" WHERE p.id=$1`,input.pipelineId);
 if(rows.length!==1)throw createValidationError({scope:"Pipeline not found or ownership is ambiguous."});
 const pipeline=rows[0];
 // Reject tenant/creator failures before looking up any asset.
 validateConnectorScope({pipelineId:input.pipelineId},{userId:user.id,role:user.role,companyId:user.companyId,pipeline});
 const asset=input.assetId?await db.asset.findFirst({where:{id:input.assetId,pipelineId:input.pipelineId},select:{id:true,pipelineId:true}}):undefined;
 return validateConnectorScope(input,{userId:user.id,role:user.role,companyId:user.companyId,pipeline,asset:asset??undefined});
}
function storedScope(existing:unknown):({companyId:string}&ConnectorScopeInput)|null{
 if(!existing||typeof existing!=="object"||Array.isArray(existing)||!Object.prototype.hasOwnProperty.call(existing,"integrationScope"))return null;
 const value=(existing as Record<string,unknown>).integrationScope;
 if(!value||typeof value!=="object"||Array.isArray(value))throw createValidationError({scope:"Stored connector scope is invalid; ownership review is required."});
 const scope=value as Record<string,unknown>;
 if(typeof scope.companyId!=="string"||!scope.companyId||typeof scope.pipelineId!=="string"||!scope.pipelineId||(scope.assetId!==null&&scope.assetId!==undefined&&typeof scope.assetId!=="string"))throw createValidationError({scope:"Stored connector scope is incomplete; ownership review is required."});
 return {companyId:scope.companyId,pipelineId:scope.pipelineId,assetId:scope.assetId as string|null|undefined};
}
export async function scopedConnectorConfiguration(db:ConnectorScopeDatabase,input:{configuration?:Record<string,unknown>|null;scope?:ConnectorScopeInput},user:AuthUser,existing:unknown=null){
 if(input.configuration&&Object.prototype.hasOwnProperty.call(input.configuration,"integrationScope"))throw createValidationError({scope:"integrationScope is server-managed."});
 const old=storedScope(existing);
 if(old){
  if(!user.companyId||old.companyId!==user.companyId)throw createValidationError({scope:"Stored connector belongs to a different or unavailable company."});
  const verified=await resolveConnectorScope(db,old,user);
  if(verified.companyId!==old.companyId)throw createValidationError({scope:"Stored connector company is inconsistent with pipeline ownership."});
  if(input.configuration===null)throw createValidationError({scope:"A scoped connector cannot have its ownership configuration cleared."});
 }
 if(!input.scope)return mergeConnectorConfiguration(existing,input.configuration);
 const scope=await resolveConnectorScope(db,input.scope,user);
 return mergeConnectorConfiguration(existing,{...(input.configuration??{}),integrationScope:scope});
}
