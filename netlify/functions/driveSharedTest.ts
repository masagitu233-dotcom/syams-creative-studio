import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import {
  buildEntityFolderKey,
  buildEntityFolderName,
  classifyDriveError,
  coerceDriveBinaryToBuffer,
  escapeDriveQueryValue,
  extractMediaParamsFromEvent,
  isTrustedGoogleUploadUrl,
  isValidDriveId,
  signResumableSession,
  validateUploadMetadata,
  verifyResumableSession,
  type NetlifyEvent,
  type NetlifyResponse,
} from './_driveShared';
import { handler as mediaHandler } from './media';

function runUploadMetadataChecks() {
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
}

function runResumableSessionChecks() {
  const testKey = 'unit-test-hmac-secret-key';
  const validUploadUrl =
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=abc123';
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
}

function runDriveErrorAndQueryChecks() {
  assert.equal(escapeDriveQueryValue("O'Brien \\ Studio"), "O\\'Brien \\\\ Studio");
  assert.equal(buildEntityFolderKey('product', 'deck-kuliah-01'), 'product_deck-kuliah-01');
  assert.equal(
    buildEntityFolderName('Template PPT Modern', 'prod_abc123'),
    'Template PPT Modern [prod_abc123]'
  );

  const expiredErr = classifyDriveError({
    message: 'invalid_grant: Token has been expired or revoked.',
  });
  assert.equal(expiredErr.code, 'drive_token_expired');
  assert.equal(expiredErr.status, 502);

  const notFoundErr = classifyDriveError({ status: 404, message: 'File not found' });
  assert.equal(notFoundErr.code, 'drive_not_found');
  assert.equal(notFoundErr.status, 404);
}

function runMediaProxyParamExtractionChecks() {
  const fromQuery = extractMediaParamsFromEvent({
    httpMethod: 'GET',
    headers: {},
    queryStringParameters: { fileId: '1AbCdEf_12345', visibility: 'private' },
    body: null,
  });
  assert.equal(fromQuery.fileId, '1AbCdEf_12345');
  assert.equal(fromQuery.visibility, 'private');

  const fromRawQuery = extractMediaParamsFromEvent({
    httpMethod: 'GET',
    headers: {},
    rawQuery: 'fileId=1XyZ_98765&visibility=public',
    body: null,
  });
  assert.equal(fromRawQuery.fileId, '1XyZ_98765');
  assert.equal(fromRawQuery.visibility, 'public');

  const fromPath = extractMediaParamsFromEvent({
    httpMethod: 'GET',
    headers: {},
    path: '/api/media/1PathDriveId_999',
    rawUrl: 'https://syams.netlify.app/api/media/1PathDriveId_999?visibility=private',
    body: null,
  });
  assert.equal(fromPath.fileId, '1PathDriveId_999');
  assert.equal(fromPath.visibility, 'private');
}

async function runBinaryCoercionAndMediaGuardChecks() {
  const fromBuf = await coerceDriveBinaryToBuffer(Buffer.from([1, 2, 3]));
  assert.deepEqual([...fromBuf], [1, 2, 3]);

  const ab = new Uint8Array([4, 5, 6]).buffer;
  const fromAb = await coerceDriveBinaryToBuffer(ab);
  assert.deepEqual([...fromAb], [4, 5, 6]);

  const fromBlob = await coerceDriveBinaryToBuffer(new Blob([new Uint8Array([7, 8, 9])]));
  assert.deepEqual([...fromBlob], [7, 8, 9]);

  const fromStream = await coerceDriveBinaryToBuffer(Readable.from([Buffer.from([10, 11])]));
  assert.deepEqual([...fromStream], [10, 11]);

  const invalidRes = await mediaHandler({
    httpMethod: 'GET',
    headers: {},
    queryStringParameters: { fileId: '../bad' },
    body: null,
  });
  assert.equal(invalidRes.statusCode, 400);

  const unauthPrivateRes = await mediaHandler({
    httpMethod: 'GET',
    headers: {},
    queryStringParameters: { fileId: '1AbCdEf_12345', visibility: 'private' },
    body: null,
  });
  assert.equal(unauthPrivateRes.statusCode, 401);
}

const DRIVE_SHARED_SUITES = [
  {
    name: 'Drive backend validates file IDs, MIME types, extensions, and size limits',
    run: runUploadMetadataChecks,
  },
  {
    name: 'HMAC resumable session token prevents tampering, expiration, and SSRF upload URLs',
    run: runResumableSessionChecks,
  },
  {
    name: 'Drive error classifier and folder query escaping handle edge cases cleanly',
    run: runDriveErrorAndQueryChecks,
  },
  {
    name: 'Media proxy extracts fileId and visibility from query, rawQuery, path, and rawUrl',
    run: runMediaProxyParamExtractionChecks,
  },
  {
    name: 'Media proxy coerces binary payloads safely and enforces validation/auth guards',
    run: runBinaryCoercionAndMediaGuardChecks,
  },
];

const isNodeTestRunner =
  process.execArgv.includes('--test') ||
  process.argv.includes('--test') ||
  Boolean(process.env.NODE_TEST_CONTEXT);

if (isNodeTestRunner) {
  for (const suite of DRIVE_SHARED_SUITES) {
    test(suite.name, suite.run);
  }
}

export async function handler(event: NetlifyEvent): Promise<NetlifyResponse> {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify({ error: 'Method not allowed.' }),
    };
  }

  const results: { name: string; passed: boolean; error?: string }[] = [];
  for (const suite of DRIVE_SHARED_SUITES) {
    try {
      await suite.run();
      results.push({ name: suite.name, passed: true });
    } catch (err) {
      results.push({
        name: suite.name,
        passed: false,
        error: err instanceof Error ? err.message : 'Test failed',
      });
    }
  }

  const allPassed = results.every((r) => r.passed);
  return {
    statusCode: allPassed ? 200 : 500,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify({
      ok: allPassed,
      functionName: 'driveSharedTest',
      passed: results.filter((r) => r.passed).length,
      total: results.length,
      checks: results,
    }),
  };
}
