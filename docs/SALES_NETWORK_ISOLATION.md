# Sales network boundaries

- An active `SalesVisitLocation.organizationId` is the network owner; individual representative assignments are optional.
- Sales map/search/check-in/order access requires this ownership, including for organization Owner/Admin (Manager).
- Unknown branches are not enrolled automatically by checking in. Register a store under the correct network first.
- Existing rows are not reassigned or deleted by this change. Unlinked branches will no longer appear in a sales portfolio.
- WMS destination lookup remains a separate warehouse-authorized operation; it is not a sales-representative API.
- Flutter portfolio, history and summary providers refresh when the selected organization's repository changes.

## Quality checklist

Platform admins enable Checklist separately for each organization in App Control → MGL Business, alongside other modules. The default is disabled. Settings use organization IDs in SiteSetting; the former head-company environment variable is no longer used.

`GET /api/quality/access` checks the selected organization's toggle. All quality routes enforce it along with organization ownership. Existing role/capability, grocery-category and arrival checks remain in force. Disabling does not delete templates or results. Configuration changes and their audit records are saved atomically with the other app controls. Generic settings writes cannot modify the reserved quality keys; audit values are excluded from public settings responses.

Before production rollout, enable the intended organizations in App Control and review currently unlinked stores. No database migration is required. No production configuration or data was changed by this implementation.

Current schema allows one sales network per vendor (`vendorOrganizationId` is unique). Supporting multiple supplier relationships or reassigning a vendor requires a separate explicit workflow and immutable order-origin ownership; this change does not migrate or infer such relationships.
