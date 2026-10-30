# Settings backend contracts — approval draft

This document and the companion `20261021_settings_contracts.sql` are preparation only. The additive Prisma contract declarations are present in `backend/prisma/schema.prisma` for offline validation; no migration, seed, backfill, or database write has been applied.

## Existing safe read paths

- `User`: existing identity fields and role counts can be read by Admin through `/api/settings/users` and `/api/settings/roles`.
- `IntegrationConnector`: `/api/settings/system-configuration` may expose only `Connector_ID`, name, type, enabled/status and test timestamps. Endpoint, configuration, secret references and credentials remain hidden and owned by Integration Hub.
- Module-owned engineering records and module event/history tables must not be copied into Settings.

## Prepared approval-required Settings entities

The following are prepared as additive Prisma models and an unapplied SQL draft. They require explicit approval before migration generation review or deployment:

- Identity governance: `User_Group`, `Access_Scope`, `Role_Definition`, `Permission_Set`, `Role_Permission`.
- Shared dictionaries: `Dictionary`, `Dictionary_Value`, `Dictionary_Value_Version`, `Dictionary_Usage_Reference`.
- Units and standards: `Unit`, `Unit_Conversion`, `Standard`, `Standard_Version`, `Unit_Display_Preference`.
- Workflows: `Workflow_Definition`, `Workflow_Version`, `Workflow_Stage`, `Workflow_Approver`, `Workflow_Rule`, `Workflow_Instance_Reference`.
- Threshold governance: `Threshold_Registry`, `Threshold_Reference`, with `Owner_Module`, `Owner_Rule_ID`, `Rule_Version`, scope, review dates and status. Engineering thresholds remain in their owner modules.
- Notifications: `Notification_Rule`, `Notification_Template`, `Notification_Subscription`, `Notification_Delivery`, `Notification_Event_Reference`, `Notification_Channel_Reference`. Credentials remain outside Settings.
- Platform control: `Configuration_Set`, immutable `Configuration_Version`, approval/effective-date state, feature flags, localization and security/session policy references.
- Audit: central append-only `Audit_Event` with unique `Audit_Event_ID`, actor/user identity, timestamp, module, action, object/record reference, result, request/session IDs and before/after payloads.

## Required invariants

- Approved configuration versions are immutable.
- High-impact changes follow Draft → Impact Review → Approval → Effective Date → Activation.
- Configuration distribution records Applied, Pending or Failed acknowledgements per consuming module.
- Consumers retain the last approved configuration during Settings outages.
- Audit events are generated once centrally and are never rewritten.
- Affected-record links resolve to the owning module; Settings does not become owner of engineering records.
- Secrets and credentials are never returned by Settings APIs.
