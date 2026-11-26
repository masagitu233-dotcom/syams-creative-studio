import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildEntityFolderKey,
  buildEntityFolderName,
  classifyDriveError,
  escapeDriveQueryValue,
  isTrustedGoogleUploadUrl,
  isValidDriveId,
  signResumableSession,
  validateUploadMetadata,
  verifyResumableSession,
} from './_driveShared';

test('Drive backend validates file IDs, MIME types, extensions, and size limits', () => {
  assert.equal(isValidDriveId('1AbCdEf_234-xyz'), true);
  assert.equal(isValidDriveId('../../etc/passwd'), false);
  assert.equal(isValidDriveId('ab'), false);

  assert.equal(
    validateUploadMetadata({
      fileName: 'produk-utama.webp',
      mimeType: 'image/webp',
      sizeBytes: 3 * 1024 * 1024,
      usage: 'product',
    }).ok,
    true
  );

  assert.equal(
    validateUploadMetadata({
      fileName: 'showcase.mp4',
      mimeType: 'video/mp4',
      sizeBytes: 40 * 1024 * 1024,
      usage: 'portfolio',
    }).ok,
    true
  );

  assert.equal(
    validateUploadMetadata({
      fileName: 'script.html',
      mimeType: 'text/html',
      sizeBytes: 1200,
      usage: 'other',
    }).ok,
    false
  );

  assert.equal(
    validateUploadMetadata({
      fileName: 'terlalu-besar.mp4',
      mimeType: 'video/mp4',
      sizeBytes: 55 * 1024 * 1024,
      usage: 'service',
    }).ok,
    false
  );
});

test('HMAC resumable session token prevents tampering, expiration, and SSRF upload URLs', () => {
  const testKey = 'unit-test-hmac-secret-key';
  const validUploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=abc123';
  assert.equal(isTrustedGoogleUploadUrl(validUploadUrl), true);
  assert.equal(isTrustedGoogleUploadUrl('https://evil.example.com/upload'), false);
  assert.equal(isTrustedGoogleUploadUrl('http://169.254.169.254/latest/meta-data'), false);

  const token = signResumableSession(
    {
      uploadUrl: validUploadUrl,
      fileName: 'demo.mp4',
      mimeType: 'video/mp4',
      totalSize: 8_000_000,
      visibility: 'public',
      usage: 'product',
      folderId: 'folder_12345',
      folderPath: 'SYAMS CREATIVE STUDIO/Produk Digital/Demo',
      folderKey: 'product_demo',
      exp: Date.now() + 60_000,
    },
    testKey
  );

  const verified = verifyResumableSession(token, testKey);
  assert.ok(verified);
  assert.equal(verified?.folderId, 'folder_12345');

  // Tampered signature must fail
  assert.equal(verifyResumableSession(`${token}tampered`, testKey), null);

  // SSRF URL signed even with valid key must still be rejected
  const ssrfToken = signResumableSession(
    {
      uploadUrl: 'https://attacker.internal/steal',
      fileName: 'x.mp4',
      mimeType: 'video/mp4',
      totalSize: 1000,
      visibility: 'public',
      usage: 'other',
      folderId: 'folder_1',
      folderPath: 'SYAMS',
      folderKey: 'cat_other',
      exp: Date.now() + 60_000,
    },
    testKey
  );
  assert.equal(verifyResumableSession(ssrfToken, testKey), null);

  // Expired session must fail
  const expiredToken = signResumableSession(
    {
      uploadUrl: validUploadUrl,
      fileName: 'old.mp4',
      mimeType: 'video/mp4',
      totalSize: 1000,
      visibility: 'public',
      usage: 'other',
      folderId: 'folder_1',
      folderPath: 'SYAMS',
      folderKey: 'cat_other',
      exp: Date.now() - 1000,
    },
    testKey
  );
  assert.equal(verifyResumableSession(expiredToken, testKey), null);
});

test('Drive error classifier and folder query escaping handle edge cases cleanly', () => {
  assert.equal(escapeDriveQueryValue("O'Brien \\ Studio"), "O\\'Brien \\\\ Studio");
  assert.equal(buildEntityFolderKey('product', 'deck-kuliah-01'), 'product_deck-kuliah-01');
  assert.equal(buildEntityFolderName('Template PPT Modern', 'prod_abc123'), 'Template PPT Modern [prod_abc123]');

  const expiredErr = classifyDriveError({ message: 'invalid_grant: Token has been expired or revoked.' });
  assert.equal(expiredErr.code, 'drive_token_expired');
  assert.equal(expiredErr.status, 502);

  const notFoundErr = classifyDriveError({ status: 404, message: 'File not found' });
  assert.equal(notFoundErr.code, 'drive_not_found');
  assert.equal(notFoundErr.status, 404);
});
