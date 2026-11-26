# Security Specification — SYAMS CREATIVE STUDIO

## 1. Data Invariants
1. **Admin Isolation**: Public users can never create, update, or delete `/admins/{adminId}` documents. Only an existing registered admin in `/admins/{uid}` (or the verified bootstrap owner account) can manage admin records.
2. **Customer PII Isolation**: `/customers/{customerId}` documents contain personal emails and WhatsApp numbers; `get` is strictly limited to `request.auth.uid == customerId || isAdmin()`, and `list` is restricted to `isAdmin()`.
3. **Order Ownership & Pricing Integrity**: Customers may only `get` or `list` `/orders` where `resource.data.customerUid == request.auth.uid`. On order `create`, `customerUid` must match `request.auth.uid`, `status` must be `'menunggu_konfirmasi'`, `finalPrice` must be `null`, `adminNote` must be `''`, and timestamps must equal `request.time`.
4. **Terminal State Locking**: Customers can only cancel their own order while `status == 'menunggu_konfirmasi'`. Once confirmed, in progress, completed, or cancelled, customers cannot alter the order.
5. **Public vs Draft Catalog Enforcement**: Unauthenticated visitors and customers may only read `/services`, `/digital_products`, `/portfolio`, and `/faqs` where `isPublished == true`. Only verified administrators may read drafts or write/delete catalog records.
6. **Media Visibility Partition**: `/media` documents with `visibility == 'private'` are readable only by `ownerUid == request.auth.uid` or `isAdmin()`. Customers may only register `private` media owned by themselves; only admins can register `public` media, update metadata, or delete media assets.
7. **Drive Folder Cache Isolation**: `/drive_folders/{folderKey}` stores Google Drive folder ID mappings for the studio hierarchy (`SYAMS CREATIVE STUDIO` and subfolders) and is strictly accessible (`get`, `list`, `create`, `update`, `delete`) by verified administrators only.
8. **Immutable Audit Logs**: `/activity_logs` are append-only by admins (`update` and `delete` are denied for everyone).

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Self-Admin Privilege Escalation**: Regular user writes `/admins/{uid}` with `{ role: "super_admin" }` -> DENIED.
2. **Cross-Customer PII Read**: User A reads `/customers/{userB_uid}` -> DENIED.
3. **Order Impersonation**: User A creates `/orders/{id}` with `customerUid: userB_uid` -> DENIED.
4. **Price Tampering on Create**: User A creates `/orders/{id}` with `finalPrice: 1` or `status: "selesai"` -> DENIED.
5. **Shadow Field Injection on Order**: User A creates `/orders/{id}` with extra ghost key `isPaid: true` -> DENIED.
6. **Timestamp Spoofing**: User A creates `/orders/{id}` with backdated client `createdAt` != `request.time` -> DENIED.
7. **Terminal State Bypass**: User A updates an order whose status is `'selesai'` -> DENIED.
8. **Cross-Customer Order Scraping (`list`)**: User A lists `/orders` without filtering to `customerUid == userA` -> DENIED.
9. **Draft Service Leakage**: Anonymous user reads `/services/{id}` where `isPublished == false` -> DENIED.
10. **ID Poisoning**: Attacker writes document with 200-char or invalid-character ID (`../../evil`) -> DENIED.
11. **Unverified Email Admin Spoof**: Attacker signs in with matching email but `email_verified == false` -> DENIED.
12. **Audit Log & Drive Folder Tampering**: Regular user attempts to read/write `/drive_folders/{key}` or admin attempts to `update`/`delete` `/activity_logs/{id}` -> DENIED.
