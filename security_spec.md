# Security Specification - Pattaya Rent A Car CMS

## Data Invariants
1. Only authenticated users with `admin` role (custom claim or `admin_users` record) can perform write operations.
3. Content collections (`blog_posts`, `locations`, `cars`, `faqs`) are publicly readable if `status == "published"`.
4. `admin_users` collection is strictly admin-only (self-read allowed for basic profile).
5. `deploy_triggers` is admin-only.
6. Timestamps `updatedAt` and `createdAt` must be server-validated.

## The Dirty Dozen (Threat Payloads)
1. **Identity Spoofing**: Attempt to update `blog_posts/my-post` with a different `authorId`.
2. **State Shortcutting**: Transition a `BlogPost` from `draft` to `published` without providing `translations.en.title`.
3. **Resource Poisoning**: Create a `Car` with a 2MB `model` string.
4. **Unauthorized Global Write**: Unauthenticated user trying to update `settings/pricing`.
5. **Private Leak**: Authenticated non-admin user trying to read `admin_users/some-uid`.
6. **Trigger Spam**: Authenticated non-admin trying to write to `deploy_triggers`.
7. **Immutable Violation**: Trying to change `createdAt` on an existing `Location`.
8. **Broken Hierarchy**: Creating a `BlogPost` with an ID that doesn't follow slug format.
9. **Role Escalation**: User trying to set `admin: true` in their own profile.
10. **Orphaned Write**: Creating a `DeployTrigger` without a valid `triggeredBy` email.
11. **PII Leak**: Public read attempt on a document containing private admin emails.
12. **Query Scrape**: Attempting to list all `blog_posts` including those with `status == "draft"`.

## Audit Results
| Collection | Identity Spoofing | State Shortcutting | Resource Poisoning |
|------------|-------------------|--------------------|--------------------|
| blog_posts | Protected (isValidId + schema) | Protected (translations check) | Protected (size limits) |
| locations | Protected | Protected | Protected |
| cars | Protected | Protected | Protected |
| faqs | Protected | Protected | Protected |
| admin_users| Restricted | N/A | Protected |
| deploy_triggers| Admin Only | N/A | Protected |
