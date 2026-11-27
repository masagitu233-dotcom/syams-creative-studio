import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
const blueprintPath = path.resolve(process.cwd(), 'firebase-blueprint.json');
const rulesSource = fs.readFileSync(rulesPath, 'utf8');
const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf8'));

test('Firestore rules include global default-deny safety net and rules_version 2', () => {
  assert.match(rulesSource, /rules_version\s*=\s*'2';/);
  assert.match(rulesSource, /match \/\{document=\*\*\}\s*\{\s*allow read, write: if false;\s*\}/);
});

test('Every collection declared in firebase-blueprint.json has a matching security block', () => {
  const firestorePaths = Object.keys(blueprint.firestore || {});
  assert.ok(firestorePaths.length >= 9);
  for (const colPath of firestorePaths) {
    const cleanCollection = colPath.split('/')[1];
    assert.match(
      rulesSource,
      new RegExp(`match\\s+/${cleanCollection}/\\{[a-zA-Z0-9_]+\\}`),
      `Missing match block for collection /${cleanCollection}`
    );
  }
});

test('Dirty Dozen guards: email_verified, isValidId, affectedKeys, terminal lock, and PII isolation', () => {
  // Email verification required for admin bootstrap and writes
  assert.match(rulesSource, /request\.auth\.token\.email_verified == true/);
  // Path variable ID poisoning guard
  assert.match(rulesSource, /function isValidId\(id\)/);
  // Strict key validation blueprints
  assert.match(rulesSource, /function isValidOrder\(data\)/);
  assert.match(rulesSource, /data\.keys\(\)\.hasOnly\(/);
  // Customer cannot set finalPrice or skip status on order creation
  assert.match(rulesSource, /incoming\(\)\.status == 'menunggu_konfirmasi'/);
  assert.match(rulesSource, /incoming\(\)\.finalPrice == null/);
  // Terminal state lock for customer cancellation
  assert.match(rulesSource, /existing\(\)\.status == 'menunggu_konfirmasi'/);
  // Order list enforces resource ownership
  assert.match(rulesSource, /allow list: if isVerifiedUser\(\) && \(resource\.data\.customerUid == request\.auth\.uid \|\| isAdmin\(\)\);/);
  // Customer PII list restricted to admin only
  assert.match(rulesSource, /match \/customers\/\{customerId\}[\s\S]*?allow list: if isAdmin\(\);/);
  // Activity logs immutable
  assert.match(rulesSource, /match \/activity_logs\/\{logId\}[\s\S]*?allow update: if false;[\s\S]*?allow delete: if false;/);
});

test('Digital products collection enforces publish-only public read and strict admin-only mutations', () => {
  assert.match(rulesSource, /function isValidDigitalProduct\(data\)/);
  assert.match(
    rulesSource,
    /match \/digital_products\/\{productId\}[\s\S]*?allow get: if isValidId\(productId\) && \(existing\(\)\.isPublished == true \|\| isAdmin\(\)\);/
  );
  assert.match(
    rulesSource,
    /match \/digital_products\/\{productId\}[\s\S]*?allow list: if resource\.data\.isPublished == true \|\| isAdmin\(\);/
  );
  assert.match(
    rulesSource,
    /match \/digital_products\/\{productId\}[\s\S]*?allow create: if isVerifiedUser\(\) && isValidId\(productId\) && isValidDigitalProduct\(incoming\(\)\)[\s\S]*?isAdmin\(\);/
  );
  assert.match(
    rulesSource,
    /match \/digital_products\/\{productId\}[\s\S]*?allow delete: if isVerifiedUser\(\) && isValidId\(productId\) && isAdmin\(\);/
  );
});

test('Drive folders cache is strictly admin-only and media/gallery validation is enforced', () => {
  assert.match(rulesSource, /function isValidOptionalGallery\(data\)/);
  assert.match(rulesSource, /data\.gallery\.size\(\) <= 12/);
  assert.match(rulesSource, /function isValidDriveFolder\(data\)/);
  assert.match(
    rulesSource,
    /match \/drive_folders\/\{folderKey\}[\s\S]*?allow get: if isValidId\(folderKey\) && isAdmin\(\);[\s\S]*?allow list: if isAdmin\(\);/
  );
  assert.match(
    rulesSource,
    /match \/drive_folders\/\{folderKey\}[\s\S]*?allow delete: if isVerifiedUser\(\) && isValidId\(folderKey\) && isAdmin\(\);/
  );
});

test('Site settings allows optional visualTheme enum with public get and strict admin-only mutations', () => {
  assert.match(
    rulesSource,
    /function isValidOptionalVisualTheme\(data\)\s*\{\s*return !\('visualTheme' in data\) \|\| data\.visualTheme in \['neo_brutalist', 'clean_bento'\];\s*\}/
  );
  assert.match(
    rulesSource,
    /function isValidSiteSettings\(data\)[\s\S]*?'visualTheme', 'updatedAt'[\s\S]*?isValidOptionalVisualTheme\(data\)/
  );
  assert.match(
    rulesSource,
    /match \/site_settings\/\{settingId\}[\s\S]*?allow get: if isValidId\(settingId\);[\s\S]*?allow list: if false;[\s\S]*?allow create: if isVerifiedUser\(\) && isValidId\(settingId\) && isValidSiteSettings\(incoming\(\)\)[\s\S]*?isAdmin\(\);[\s\S]*?allow update: if isVerifiedUser\(\) && isValidId\(settingId\) && isValidSiteSettings\(incoming\(\)\)[\s\S]*?isAdmin\(\)[\s\S]*?'visualTheme', 'updatedAt'[\s\S]*?allow delete: if false;/
  );
  assert.deepEqual(blueprint.entities.SiteSettings.properties.visualTheme.enum, [
    'neo_brutalist',
    'clean_bento',
  ]);
  assert.ok(!blueprint.entities.SiteSettings.required.includes('visualTheme'));
});

test('Orders rule allows optional empty customerWhatsapp while keeping length bounds when provided', () => {
  assert.match(
    rulesSource,
    /data\.customerWhatsapp is string && \(data\.customerWhatsapp\.size\(\) == 0 \|\| \(data\.customerWhatsapp\.size\(\) >= 9 && data\.customerWhatsapp\.size\(\) <= 25\)\)/
  );
  assert.equal(blueprint.entities.Order.properties.customerWhatsapp.minLength, 0);
  assert.equal(blueprint.entities.Order.properties.customerWhatsapp.maxLength, 25);
});

test('Site design collection isolates draft/previous to admins and restricts mutations to verified admins', () => {
  assert.match(rulesSource, /function isValidSiteDesign\(data, designId\)/);
  assert.match(
    rulesSource,
    /match \/site_design\/\{designId\}[\s\S]*?allow get: if isValidId\(designId\) && \(designId == 'published' \|\| isAdmin\(\)\);[\s\S]*?allow list: if false;/
  );
  assert.match(
    rulesSource,
    /match \/site_design\/\{designId\}[\s\S]*?designId in \['published', 'draft', 'previous'\] &&[\s\S]*?isValidSiteDesign\(incoming\(\), designId\) &&[\s\S]*?incoming\(\)\.updatedAt == request\.time &&[\s\S]*?isAdmin\(\)/
  );
  assert.match(rulesSource, /match \/site_design\/\{designId\}[\s\S]*?allow delete: if false;/);
  assert.ok(blueprint.entities.ActivityLog.properties.entityType.enum.includes('site_design'));
});




