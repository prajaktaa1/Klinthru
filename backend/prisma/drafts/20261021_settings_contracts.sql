-- DRAFT ONLY. DO NOT APPLY.
-- Prepared for explicit approval, backup, migration review and deployment.
-- Additive Settings governance contract. No engineering rows are copied or rewritten.
-- No Neon connection, write, seed, backfill, update or delete is performed by this file.

CREATE TABLE IF NOT EXISTS "settings_user_groups" (
  "User_Group_ID" TEXT PRIMARY KEY, "name" TEXT NOT NULL UNIQUE, "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'Active', "Created_By_ID" TEXT NOT NULL,
  "Created_At" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(), "Updated_At" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS "settings_group_memberships" (
  "id" TEXT PRIMARY KEY, "User_Group_ID" TEXT NOT NULL REFERENCES "settings_user_groups"("User_Group_ID") ON DELETE RESTRICT,
  "User_ID" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT, "Valid_From" TIMESTAMPTZ(6), "Valid_To" TIMESTAMPTZ(6),
  UNIQUE ("User_Group_ID", "User_ID")
);
CREATE TABLE IF NOT EXISTS "settings_access_scopes" (
  "Access_Scope_ID" TEXT PRIMARY KEY, "name" TEXT NOT NULL UNIQUE, "Scope_Type" TEXT NOT NULL,
  "Definition" JSONB NOT NULL, "status" TEXT NOT NULL DEFAULT 'Active', "Created_By_ID" TEXT NOT NULL,
  "Created_At" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS "settings_user_access_scopes" (
  "id" TEXT PRIMARY KEY, "User_ID" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
  "Access_Scope_ID" TEXT NOT NULL REFERENCES "settings_access_scopes"("Access_Scope_ID") ON DELETE RESTRICT,
  "Valid_From" TIMESTAMPTZ(6), "Valid_To" TIMESTAMPTZ(6), UNIQUE ("User_ID", "Access_Scope_ID")
);
CREATE TABLE IF NOT EXISTS "settings_role_definitions" (
  "Role_ID" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "Role_Type" TEXT NOT NULL, "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'Active', "version" INTEGER NOT NULL DEFAULT 1, "immutable" BOOLEAN NOT NULL DEFAULT FALSE,
  "Created_By_ID" TEXT NOT NULL, "Created_At" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(), UNIQUE("name", "version")
);
CREATE TABLE IF NOT EXISTS "settings_user_roles" (
  "id" TEXT PRIMARY KEY, "User_ID" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
  "Role_ID" TEXT NOT NULL REFERENCES "settings_role_definitions"("Role_ID") ON DELETE RESTRICT,
  "Valid_From" TIMESTAMPTZ(6), "Valid_To" TIMESTAMPTZ(6), UNIQUE("User_ID", "Role_ID")
);
CREATE TABLE IF NOT EXISTS "settings_permission_sets" (
  "Permission_Set_ID" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'Active', "version" INTEGER NOT NULL DEFAULT 1, "immutable" BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE("name", "version")
);
CREATE TABLE IF NOT EXISTS "settings_permission_grants" (
  "id" TEXT PRIMARY KEY, "Permission_Set_ID" TEXT NOT NULL REFERENCES "settings_permission_sets"("Permission_Set_ID") ON DELETE RESTRICT,
  "module" TEXT NOT NULL, "action" TEXT NOT NULL, "effect" TEXT NOT NULL DEFAULT 'Allow', "Scope_Required" BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE("Permission_Set_ID", "module", "action")
);
CREATE TABLE IF NOT EXISTS "settings_role_permission_sets" (
  "id" TEXT PRIMARY KEY, "Role_ID" TEXT NOT NULL REFERENCES "settings_role_definitions"("Role_ID") ON DELETE RESTRICT,
  "Permission_Set_ID" TEXT NOT NULL REFERENCES "settings_permission_sets"("Permission_Set_ID") ON DELETE RESTRICT,
  UNIQUE("Role_ID", "Permission_Set_ID")
);

CREATE TABLE IF NOT EXISTS "settings_dictionaries" (
  "Dictionary_ID" TEXT PRIMARY KEY, "name" TEXT NOT NULL UNIQUE, "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'Active', "Created_By_ID" TEXT NOT NULL, "Created_At" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS "settings_dictionary_values" (
  "Dictionary_Value_ID" TEXT PRIMARY KEY, "Dictionary_ID" TEXT NOT NULL REFERENCES "settings_dictionaries"("Dictionary_ID") ON DELETE RESTRICT,
  "code" TEXT NOT NULL, "Current_Version_ID" TEXT, UNIQUE("Dictionary_ID", "code")
);
CREATE TABLE IF NOT EXISTS "settings_dictionary_value_versions" (
  "Dictionary_Value_Version_ID" TEXT PRIMARY KEY, "Dictionary_Value_ID" TEXT NOT NULL REFERENCES "settings_dictionary_values"("Dictionary_Value_ID") ON DELETE RESTRICT,
  "version" INTEGER NOT NULL, "label" TEXT NOT NULL, "description" TEXT, "category" TEXT, "Parent_Value_ID" TEXT,
  "status" TEXT NOT NULL, "language" TEXT NOT NULL DEFAULT 'en', "Effective_Date" TIMESTAMPTZ(6), "Content_Hash" TEXT NOT NULL,
  UNIQUE("Dictionary_Value_ID", "version")
);
CREATE TABLE IF NOT EXISTS "settings_dictionary_usage_references" (
  "id" TEXT PRIMARY KEY, "Dictionary_Value_ID" TEXT NOT NULL, "Owner_Module" TEXT NOT NULL,
  "Owner_Record_Type" TEXT NOT NULL, "Owner_Record_ID" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "settings_units" (
  "Unit_ID" TEXT PRIMARY KEY, "code" TEXT NOT NULL, "name" TEXT NOT NULL, "dimension" TEXT NOT NULL,
  "Is_Canonical" BOOLEAN NOT NULL DEFAULT FALSE, "status" TEXT NOT NULL DEFAULT 'Active', UNIQUE("dimension", "code")
);
CREATE TABLE IF NOT EXISTS "settings_unit_conversions" (
  "Unit_Conversion_ID" TEXT PRIMARY KEY, "From_Unit_ID" TEXT NOT NULL, "To_Unit_ID" TEXT NOT NULL,
  "factor" NUMERIC(30,15) NOT NULL, "offset" NUMERIC(30,15) NOT NULL, "version" INTEGER NOT NULL DEFAULT 1,
  "status" TEXT NOT NULL DEFAULT 'Active', "immutable" BOOLEAN NOT NULL DEFAULT FALSE, UNIQUE("From_Unit_ID", "To_Unit_ID", "version")
);
CREATE TABLE IF NOT EXISTS "settings_standards" (
  "Standard_ID" TEXT PRIMARY KEY, "code" TEXT NOT NULL UNIQUE, "name" TEXT NOT NULL,
  "Applicable_Modules" JSONB NOT NULL, "status" TEXT NOT NULL DEFAULT 'Active'
);
CREATE TABLE IF NOT EXISTS "settings_standard_versions" (
  "Standard_Version_ID" TEXT PRIMARY KEY, "Standard_ID" TEXT NOT NULL REFERENCES "settings_standards"("Standard_ID") ON DELETE RESTRICT,
  "revision" TEXT NOT NULL, "Effective_Date" TIMESTAMPTZ(6), "Content_Hash" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'Active',
  UNIQUE("Standard_ID", "revision")
);
CREATE TABLE IF NOT EXISTS "settings_unit_display_preferences" (
  "id" TEXT PRIMARY KEY, "Scope_Type" TEXT NOT NULL, "Scope_ID" TEXT, "parameter" TEXT NOT NULL,
  "Display_Unit_ID" TEXT NOT NULL, "Configuration_Version_ID" TEXT, UNIQUE("Scope_Type", "Scope_ID", "parameter")
);

CREATE TABLE IF NOT EXISTS "settings_workflow_definitions" (
  "Workflow_Definition_ID" TEXT PRIMARY KEY, "name" TEXT NOT NULL UNIQUE, "description" TEXT,
  "Owner_Module" TEXT, "status" TEXT NOT NULL DEFAULT 'Active'
);
CREATE TABLE IF NOT EXISTS "settings_workflow_versions" (
  "Workflow_Version_ID" TEXT PRIMARY KEY, "Workflow_Definition_ID" TEXT NOT NULL REFERENCES "settings_workflow_definitions"("Workflow_Definition_ID") ON DELETE RESTRICT,
  "version" INTEGER NOT NULL, "Approval_State" TEXT NOT NULL DEFAULT 'Draft', "Effective_Date" TIMESTAMPTZ(6),
  "immutable" BOOLEAN NOT NULL DEFAULT FALSE, "Content_Hash" TEXT NOT NULL, UNIQUE("Workflow_Definition_ID", "version")
);
CREATE TABLE IF NOT EXISTS "settings_workflow_stages" (
  "id" TEXT PRIMARY KEY, "Workflow_Version_ID" TEXT NOT NULL REFERENCES "settings_workflow_versions"("Workflow_Version_ID") ON DELETE RESTRICT,
  "Stage_Key" TEXT NOT NULL, "name" TEXT NOT NULL, "sequence" INTEGER NOT NULL, "SLA_Hours" INTEGER, UNIQUE("Workflow_Version_ID", "Stage_Key")
);
CREATE TABLE IF NOT EXISTS "settings_workflow_approvers" (
  "id" TEXT PRIMARY KEY, "Workflow_Version_ID" TEXT NOT NULL, "Stage_ID" TEXT NOT NULL,
  "Approver_Type" TEXT NOT NULL, "Approver_Ref" TEXT NOT NULL, UNIQUE("Stage_ID", "Approver_Type", "Approver_Ref")
);
CREATE TABLE IF NOT EXISTS "settings_workflow_rules" (
  "id" TEXT PRIMARY KEY, "Workflow_Version_ID" TEXT NOT NULL REFERENCES "settings_workflow_versions"("Workflow_Version_ID") ON DELETE RESTRICT,
  "Rule_Type" TEXT NOT NULL, "definition" JSONB NOT NULL
);
CREATE TABLE IF NOT EXISTS "settings_workflow_instance_references" (
  "id" TEXT PRIMARY KEY, "Workflow_Version_ID" TEXT NOT NULL, "Owner_Module" TEXT NOT NULL,
  "Owner_Record_Type" TEXT NOT NULL, "Owner_Record_ID" TEXT NOT NULL, "Current_Stage_Key" TEXT,
  UNIQUE("Owner_Module", "Owner_Record_Type", "Owner_Record_ID")
);

CREATE TABLE IF NOT EXISTS "settings_threshold_registries" (
  "Threshold_Registry_ID" TEXT PRIMARY KEY, "Owner_Module" TEXT NOT NULL, "Owner_Rule_ID" TEXT NOT NULL,
  "parameter" TEXT NOT NULL, "Standard_Reference" TEXT, "Rule_Version" TEXT NOT NULL, "Effective_Scope" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'Active', "Last_Review" TIMESTAMPTZ(6), "Next_Review" TIMESTAMPTZ(6),
  UNIQUE("Owner_Module", "Owner_Rule_ID", "Rule_Version")
);
CREATE TABLE IF NOT EXISTS "settings_threshold_references" (
  "id" TEXT PRIMARY KEY, "Threshold_Registry_ID" TEXT NOT NULL REFERENCES "settings_threshold_registries"("Threshold_Registry_ID") ON DELETE RESTRICT,
  "Owner_Module" TEXT NOT NULL, "Owner_Rule_ID" TEXT NOT NULL, "Rule_Version" TEXT NOT NULL,
  UNIQUE("Threshold_Registry_ID", "Owner_Module", "Owner_Rule_ID", "Rule_Version")
);

CREATE TABLE IF NOT EXISTS "settings_notification_templates" (
  "Notification_Template_ID" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "version" INTEGER NOT NULL,
  "content" JSONB NOT NULL, "status" TEXT NOT NULL DEFAULT 'Active', "Content_Hash" TEXT NOT NULL, UNIQUE("name", "version")
);
CREATE TABLE IF NOT EXISTS "settings_notification_rules" (
  "Notification_Rule_ID" TEXT PRIMARY KEY, "Source_Event" TEXT NOT NULL, "severity" TEXT NOT NULL,
  "Recipient_Refs" JSONB NOT NULL, "Channel_Refs" JSONB NOT NULL, "Escalation_Time_Minutes" INTEGER,
  "Quiet_Hours" JSONB, "Notification_Template_ID" TEXT, "status" TEXT NOT NULL DEFAULT 'Active'
);
CREATE TABLE IF NOT EXISTS "settings_notification_subscriptions" (
  "Subscription_ID" TEXT PRIMARY KEY, "User_ID" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
  "Notification_Rule_ID" TEXT NOT NULL REFERENCES "settings_notification_rules"("Notification_Rule_ID") ON DELETE RESTRICT,
  "status" TEXT NOT NULL DEFAULT 'Active', "preferences" JSONB, UNIQUE("User_ID", "Notification_Rule_ID")
);
CREATE TABLE IF NOT EXISTS "settings_notification_channel_references" (
  "id" TEXT PRIMARY KEY, "Channel_Type" TEXT NOT NULL, "Connector_ID" TEXT, "status" TEXT NOT NULL,
  UNIQUE("Channel_Type", "Connector_ID")
);
CREATE TABLE IF NOT EXISTS "settings_notification_event_references" (
  "Notification_Event_ID" TEXT PRIMARY KEY, "Source_Module" TEXT NOT NULL, "Source_Event_ID" TEXT NOT NULL,
  "Source_Event_Type" TEXT NOT NULL, "Occurred_At" TIMESTAMPTZ(6) NOT NULL, "severity" TEXT,
  UNIQUE("Source_Module", "Source_Event_ID")
);
CREATE TABLE IF NOT EXISTS "settings_notification_deliveries" (
  "Delivery_ID" TEXT PRIMARY KEY, "Notification_Event_ID" TEXT NOT NULL, "Channel_Type" TEXT NOT NULL,
  "Connector_ID" TEXT, "status" TEXT NOT NULL, "Attempted_At" TIMESTAMPTZ(6), "Delivered_At" TIMESTAMPTZ(6), "Failure_Code" TEXT
);

CREATE TABLE IF NOT EXISTS "settings_configuration_sets" (
  "Configuration_Set_ID" TEXT PRIMARY KEY, "key" TEXT NOT NULL, "Owner_Scope" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'Active', UNIQUE("key", "Owner_Scope")
);
CREATE TABLE IF NOT EXISTS "settings_configuration_versions" (
  "Configuration_Version_ID" TEXT PRIMARY KEY, "Configuration_Set_ID" TEXT NOT NULL REFERENCES "settings_configuration_sets"("Configuration_Set_ID") ON DELETE RESTRICT,
  "version" INTEGER NOT NULL, "payload" JSONB NOT NULL, "Content_Hash" TEXT NOT NULL,
  "Approval_State" TEXT NOT NULL DEFAULT 'Draft', "Effective_From" TIMESTAMPTZ(6), "immutable" BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE("Configuration_Set_ID", "version")
);
CREATE TABLE IF NOT EXISTS "settings_configuration_distributions" (
  "id" TEXT PRIMARY KEY, "Configuration_Version_ID" TEXT NOT NULL REFERENCES "settings_configuration_versions"("Configuration_Version_ID") ON DELETE RESTRICT,
  "Consuming_Module" TEXT NOT NULL, "status" TEXT NOT NULL, "Acknowledged_At" TIMESTAMPTZ(6), "Failure_Reason" TEXT,
  UNIQUE("Configuration_Version_ID", "Consuming_Module")
);

CREATE TABLE IF NOT EXISTS "settings_audit_events" (
  "Audit_Event_ID" TEXT PRIMARY KEY, "User_ID" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "Timestamp" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(), "Module" TEXT NOT NULL, "action" TEXT NOT NULL,
  "Object_Type" TEXT, "Object_ID" TEXT, "result" TEXT NOT NULL, "severity" TEXT, "IP_Address" TEXT,
  "Session_ID" TEXT, "Request_ID" TEXT, "details" TEXT, "Before_Values" JSONB, "After_Values" JSONB,
  "Content_Hash" TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS "settings_audit_events_timestamp_module_idx" ON "settings_audit_events" ("Timestamp", "Module");
CREATE INDEX IF NOT EXISTS "settings_audit_events_user_timestamp_idx" ON "settings_audit_events" ("User_ID", "Timestamp");
CREATE INDEX IF NOT EXISTS "settings_audit_events_object_idx" ON "settings_audit_events" ("Object_Type", "Object_ID", "Timestamp");

-- Draft-only enforcement: audit rows are append-only.
CREATE OR REPLACE FUNCTION settings_reject_audit_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'settings_audit_events is append-only';
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS settings_audit_events_immutable ON "settings_audit_events";
CREATE TRIGGER settings_audit_events_immutable
  BEFORE UPDATE OR DELETE ON "settings_audit_events"
  FOR EACH ROW EXECUTE FUNCTION settings_reject_audit_mutation();

-- Draft-only enforcement: approved/effective configuration and workflow versions cannot be changed.
CREATE OR REPLACE FUNCTION settings_reject_approved_version_mutation() RETURNS trigger AS $$
BEGIN
  IF OLD."immutable" = TRUE OR OLD."Approval_State" IN ('Approval', 'EffectiveDate', 'Active', 'Retired') THEN
    RAISE EXCEPTION 'approved Settings versions are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS settings_configuration_versions_immutable ON "settings_configuration_versions";
CREATE TRIGGER settings_configuration_versions_immutable
  BEFORE UPDATE OR DELETE ON "settings_configuration_versions"
  FOR EACH ROW EXECUTE FUNCTION settings_reject_approved_version_mutation();
DROP TRIGGER IF EXISTS settings_workflow_versions_immutable ON "settings_workflow_versions";
CREATE TRIGGER settings_workflow_versions_immutable
  BEFORE UPDATE OR DELETE ON "settings_workflow_versions"
  FOR EACH ROW EXECUTE FUNCTION settings_reject_approved_version_mutation();

-- Approval requirements: database role grants/RLS for Admin and effective Role + Group + Access Scope checks;
-- configuration distribution fallback to the last approved version; and module-level audit event publishing.
