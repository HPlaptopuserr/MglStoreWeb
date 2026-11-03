
### Executive mobile dashboard

The group module uses the supplied Executive Slate design: four sections for
Overview, Companies, Employees and Plans. A shared company selector switches
between the combined group and one authorized company; the selected date range
and company remain consistent across all four sections. Overview opens company
names through the Companies action. Group membership, sharing and ownership tools
remain available through the header menu.

`GET /:groupId/snapshot?...&includePeople=true` adds the already permission-filtered
people and tasks for all authorized companies in one request. The default payload
is unchanged. Employee details require EMPLOYEES_VIEW; attendance and assignments
still independently require their corresponding consent and member permission.
Combined employees are deduplicated by user ID, while company assignments remain
separate. Progress means approved, noncancelled work; no financial data or artificial
trend deltas are generated. Lists reveal 20 records at a time. All charts use the
selected snapshot and due dates. Empty, restricted and connection-error states
remain explicit.
