-- Apply to existing D1 after backup. Creates comment history and seeds knowledge base.
CREATE TABLE IF NOT EXISTS support_comments (id TEXT PRIMARY KEY,ticket_id TEXT NOT NULL,company_id TEXT NOT NULL,author_id TEXT NOT NULL,message TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_support_comments_ticket ON support_comments(company_id,ticket_id,created_at);
CREATE TABLE IF NOT EXISTS support_articles (id TEXT PRIMARY KEY,title TEXT NOT NULL,category TEXT NOT NULL,body TEXT NOT NULL,published INTEGER NOT NULL DEFAULT 1);
INSERT OR REPLACE INTO support_articles(id,title,category,body,published) VALUES('guide-01','Add a new asset','Assets','1. Open Assets.
2. Select Create Asset.
3. Enter a unique asset code, descriptive name, location and site.
4. Set status and save.
5. Reopen the record and verify the details.
If saving fails, check required fields and site access.',1);
INSERT OR REPLACE INTO support_articles(id,title,category,body,published) VALUES('guide-02','Edit an asset or correct its details','Assets','1. Open Assets and locate the asset by code.
2. Open its record and choose the available edit action.
3. Correct details and save.
4. Confirm changes appear after refresh.
If editing is unavailable, contact your company administrator.',1);
INSERT OR REPLACE INTO support_articles(id,title,category,body,published) VALUES('guide-03','Find equipment service history','Assets','1. Search Assets by code or name.
2. Open the asset record.
3. Review associated work orders and PM schedules.
4. Verify you have access to the asset site if records appear missing.',1);
INSERT OR REPLACE INTO support_articles(id,title,category,body,published) VALUES('guide-04','Create a work order','Work Orders','1. Open Work Orders and choose Create Work Order.
2. Provide a title, asset, site, description and priority.
3. Assign a technician if available.
4. Save and confirm the work order appears in the list.
If the save fails, check the required fields and notify your administrator with the error text.',1);
INSERT OR REPLACE INTO support_articles(id,title,category,body,published) VALUES('guide-05','Complete and close a work order','Work Orders','1. Open Work Orders and select your assigned record.
2. Review the task and perform the work.
3. Record findings and update the status using the actions available to your role.
4. Save and verify the final status.
If a status action is unavailable, request access from your administrator.',1);
INSERT OR REPLACE INTO support_articles(id,title,category,body,published) VALUES('guide-06','Assign or reassign work','Work Orders','1. Open the work order.
2. Choose an available technician from the assignment control.
3. Save the change.
4. Confirm the assignment appears in the work order list.
Only users permitted to manage assignments can reassign work.',1);
INSERT OR REPLACE INTO support_articles(id,title,category,body,published) VALUES('guide-07','Why is a work order missing?','Work Orders','Check the active site selector at the top of PULSE. Select All authorized sites, then search again. Check status filters and whether your account has permission for that facility. Contact an administrator if access is missing.',1);
INSERT OR REPLACE INTO support_articles(id,title,category,body,published) VALUES('guide-08','Create a preventive maintenance schedule','Preventive Maintenance','1. Register the asset first.
2. Open Preventive Maintenance and choose Create PM.
3. Select the asset and enter a schedule, next due date, priority and technician.
4. Save.
5. Verify the new PM appears. New schedules may be paused until enabled.',1);
INSERT OR REPLACE INTO support_articles(id,title,category,body,published) VALUES('guide-09','Understand PM scheduling','Preventive Maintenance','The schedule interval controls how often a PM repeats, while the schedule unit specifies the period. Review the next due date before enabling a schedule. If a PM does not generate expected work, check whether it is enabled and whether the due date has passed.',1);
INSERT OR REPLACE INTO support_articles(id,title,category,body,published) VALUES('guide-10','PM does not appear on the calendar','Preventive Maintenance','Verify that the PM has a next due date, that its site is included in your filter, and that you are viewing the correct month. If it still does not appear, reload and contact your administrator with the PM code.',1);
INSERT OR REPLACE INTO support_articles(id,title,category,body,published) VALUES('guide-11','Use the maintenance calendar','Calendar','1. Open Calendar.
2. Navigate between months using the arrow buttons.
3. Review scheduled PMs and work orders.
4. Use the upcoming activities list below the calendar.
The calendar reflects saved maintenance records, not draft entries.',1);
INSERT OR REPLACE INTO support_articles(id,title,category,body,published) VALUES('guide-12','Create and manage facilities','Sites','1. Open Settings.
2. Select Sites & Facilities.
3. Enter a unique site code and a clear name.
4. Create the site.
5. Assign users to the facility using available administration controls.
Site creation requires administrator permission.',1);
INSERT OR REPLACE INTO support_articles(id,title,category,body,published) VALUES('guide-13','Change your active facility','Sites','Use the Active Facility selector in the top bar. Choose a specific site to filter maintenance records or All authorized sites to see everything your account can access. The selector does not grant access to restricted sites.',1);
INSERT OR REPLACE INTO support_articles(id,title,category,body,published) VALUES('guide-14','User roles and permissions','Administration','User roles determine what maintenance actions are available. Company administrators manage authorized users and facility access. If a button is missing or an action returns Forbidden, ask your company administrator to review your role and site membership.',1);
INSERT OR REPLACE INTO support_articles(id,title,category,body,published) VALUES('guide-15','Configure dashboard graphs','Dashboard','1. Open Settings.
2. Find Dashboard Charts.
3. Enable Show graphs.
4. Select chart type and data source.
5. Save Chart Settings.
6. Return to Command Center.
Turn the toggle off to hide graphs without deleting maintenance records.',1);
INSERT OR REPLACE INTO support_articles(id,title,category,body,published) VALUES('guide-16','Open and track a support ticket','Support','1. Open Support Center.
2. Select Issue, Feature Request or Question.
3. Enter a descriptive subject and steps to reproduce the problem.
4. Submit.
5. Open the ticket in My Tickets to review its status and comments.
Ticket status is controlled by Reylex Support.',1);
INSERT OR REPLACE INTO support_articles(id,title,category,body,published) VALUES('guide-17','Write an effective bug report','Support','Include the PULSE page, what you clicked, what you expected, what actually happened, the time of the problem, and the full error message. Never include passwords, session tokens, or confidential personal information.',1);
INSERT OR REPLACE INTO support_articles(id,title,category,body,published) VALUES('guide-18','Prepare data from an old CMMS','Migration','1. Export assets, work orders, PM schedules and sites from your existing system.
2. Keep original IDs and relationship columns.
3. Use Migration Studio to inspect supported CSV exports.
4. Review field mappings and duplicates before any import.
Note: inspecting an export does not mean a full migration has been completed.',1);
INSERT OR REPLACE INTO support_articles(id,title,category,body,published) VALUES('guide-19','A Create button does nothing','Troubleshooting','Hard-refresh PULSE, retry the action and check for an error message. If the problem continues, report the page name, button label and browser. An administrator can review the browser console and Worker logs.',1);
INSERT OR REPLACE INTO support_articles(id,title,category,body,published) VALUES('guide-20','A record will not save','Troubleshooting','Check required fields, site selection and your account permissions. If the message mentions D1_ERROR or a missing column, it is a database schema problem for your administrator or Reylex Support—not something a technician should fix.',1);
INSERT OR REPLACE INTO support_articles(id,title,category,body,published) VALUES('guide-21','Why does the page show no records?','Troubleshooting','Choose All authorized sites, clear any search filters, and reload the page. Confirm that records exist and your role permits viewing them. If another authorized user sees records but you do not, ask an administrator to review site memberships.',1);
INSERT OR REPLACE INTO support_articles(id,title,category,body,published) VALUES('guide-22','I cannot sign in','Troubleshooting','Verify company ID, username and password. Check keyboard capitalization and retry. If you still cannot sign in, contact your company administrator; never send your password in a support ticket.',1);
INSERT OR REPLACE INTO support_articles(id,title,category,body,published) VALUES('guide-23','Create and export a report','Reports','Open Report Builder, select an available source and choose the fields or filters supported by your version. Preview the results before exporting. If no records appear, check your site filter and permissions.',1);
INSERT OR REPLACE INTO support_articles(id,title,category,body,published) VALUES('guide-24','Inventory availability in this version','Inventory','Parts and inventory workflows are part of the PULSE roadmap. If the Inventory module is not present in your deployment, it has not been enabled or released. Do not treat an absent module as lost inventory data.',1);
INSERT OR REPLACE INTO support_articles(id,title,category,body,published) VALUES('guide-25','Inspections availability in this version','Inspections','Inspection templates and digital checklists are planned capabilities. If your deployment does not display an Inspections module, it is not available in this version. Use existing approved work-order procedures in the meantime.',1);
