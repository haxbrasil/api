import * as recordingCodeUtil from '../../src/modules/recordings/utils/recording-code.util';
import { err } from 'neverthrow';
import { FilePersistenceService } from '../../src/modules/file-persistence/file-persistence.service';
import { RecordingsService } from '../../src/modules/recordings/recordings.service';
import { get, getNoRedirect, json, postMultipart } from '../support/client';
import {
  persistenceErrorFixture,
  recordingFixtureBytes,
  recordingFormDataFixture,
  tenantFixture,
} from '../fixtures';
import { expectApiError } from '../utils/error-assertions.util';
import { getE2ERuntime } from '../support/runtime';

const MAX_RECORDING_SIZE_BYTES = 5 * 1024 * 1024;

describe('Recordings (e2e)', () => {
  it('rejects requests without a bearer token', async () => {
    const getResponse = await get('/recs');
    expect(getResponse.status).toBe(401);

    const formData = new FormData();
    formData.set(
      'recording',
      new Blob([new Uint8Array(recordingFixtureBytes())], {
        type: 'application/octet-stream',
      }),
      'recording.hbr2',
    );

    const postResponse = await postMultipart('/recs', formData);
    expect(postResponse.status).toBe(401);
  });

  it('uploads a valid recording and stores tenant/code/uuid in URL', async () => {
    const tenant = tenantFixture('tenant-recording-upload');

    const formData = new FormData();
    formData.set(
      'recording',
      new Blob([new Uint8Array(recordingFixtureBytes())], {
        type: 'application/octet-stream',
      }),
      'recording.hbr2',
    );

    const response = await postMultipart('/recs', formData, tenant.token);
    expect(response.status).toBe(201);

    const payload = await json(response);
    expect(payload).toHaveProperty(
      'id',
      expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      ),
    );
    expect(payload).toHaveProperty(
      'code',
      expect.stringMatching(/^[A-Z0-9]{6}$/),
    );
    expect(payload).toHaveProperty(
      'recording_uuid',
      expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      ),
    );
    expect(payload).toHaveProperty(
      'url',
      expect.stringMatching(
        new RegExp(`${tenant.tenant}-[A-Z0-9]{6}-[0-9a-f-]{36}`),
      ),
    );
    expect(payload).toHaveProperty('created_at', expect.any(String));
  });

  it('rejects invalid recording payload', async () => {
    const tenant = tenantFixture('tenant-recording-invalid');

    const formData = new FormData();
    formData.set(
      'recording',
      new Blob([new Uint8Array(Buffer.from('invalid'))], {
        type: 'application/octet-stream',
      }),
      'recording.hbr2',
    );

    const response = await postMultipart('/recs', formData, tenant.token);

    expect(response.status).toBe(400);
    expect(await json(response)).toEqual({
      code: 'recording_invalid',
      message: 'Invalid recording file',
    });
  });

  it('rejects recordings larger than 5MB', async () => {
    const tenant = tenantFixture('tenant-recording-too-large');
    const oversized = Buffer.alloc(MAX_RECORDING_SIZE_BYTES + 1, 1);

    const formData = new FormData();
    formData.set(
      'recording',
      new Blob([new Uint8Array(oversized)], {
        type: 'application/octet-stream',
      }),
      'recording.hbr2',
    );

    const response = await postMultipart('/recs', formData, tenant.token);

    expect(response.status).toBe(400);
    expect(await json(response)).toEqual({
      code: 'recording_invalid',
      message: 'Invalid recording file',
    });
  });

  it('lists recording codes with pagination', async () => {
    const tenant = tenantFixture('tenant-recording-list');

    for (let i = 0; i < 3; i += 1) {
      const formData = new FormData();
      formData.set(
        'recording',
        new Blob([new Uint8Array(recordingFixtureBytes())], {
          type: 'application/octet-stream',
        }),
        'recording.hbr2',
      );

      const uploadResponse = await postMultipart(
        '/recs',
        formData,
        tenant.token,
      );
      expect(uploadResponse.status).toBe(201);
    }

    const firstPageResponse = await get(
      '/recs?page=1&pageSize=2',
      tenant.token,
    );
    expect(firstPageResponse.status).toBe(200);

    const firstPagePayload = await json(firstPageResponse);
    expect(firstPagePayload).toEqual(
      expect.objectContaining({
        page_info: {
          page: 1,
          page_size: 2,
          has_next_page: true,
        },
      }),
    );
    expect(firstPagePayload).toHaveProperty('items.length', 2);
    expect(firstPagePayload).toHaveProperty(
      'items.0.code',
      expect.stringMatching(/^[A-Z0-9]{6}$/),
    );

    const secondPageResponse = await get(
      '/recs?page=2&pageSize=2',
      tenant.token,
    );
    expect(secondPageResponse.status).toBe(200);

    const secondPagePayload = await json(secondPageResponse);
    expect(secondPagePayload).toEqual(
      expect.objectContaining({
        page_info: {
          page: 2,
          page_size: 2,
          has_next_page: false,
        },
      }),
    );
    expect(secondPagePayload).toHaveProperty('items.length', 1);
    expect(secondPagePayload).toHaveProperty(
      'items.0.code',
      expect.stringMatching(/^[A-Z0-9]{6}$/),
    );
  });

  it('redirects by code for the same tenant and isolates across tenants', async () => {
    const tenantA = tenantFixture('tenant-recording-redirect-a');
    const tenantB = tenantFixture('tenant-recording-redirect-b');
    const codeSpy = jest.spyOn(recordingCodeUtil, 'generateRecordingCode');
    codeSpy.mockReturnValueOnce('REDIR1');

    try {
      const formData = new FormData();
      formData.set(
        'recording',
        new Blob([new Uint8Array(recordingFixtureBytes())], {
          type: 'application/octet-stream',
        }),
        'recording.hbr2',
      );

      const uploadResponse = await postMultipart(
        '/recs',
        formData,
        tenantA.token,
      );
      expect(uploadResponse.status).toBe(201);

      const redirectResponse = await getNoRedirect(
        '/recs/REDIR1',
        tenantA.token,
      );
      expect(redirectResponse.status).toBe(302);
      expect(redirectResponse.headers.get('location')).toEqual(
        expect.stringContaining(`${tenantA.tenant}-REDIR1-`),
      );

      const crossTenantResponse = await get('/recs/REDIR1', tenantB.token);
      expect(crossTenantResponse.status).toBe(404);
      expect(await json(crossTenantResponse)).toEqual({
        code: 'recording_not_found',
        message: 'Recording not found',
      });
    } finally {
      codeSpy.mockRestore();
    }
  });

  it('retries code generation when a collision happens', async () => {
    const tenant = tenantFixture('tenant-recording-collision');
    const codeSpy = jest.spyOn(recordingCodeUtil, 'generateRecordingCode');
    codeSpy.mockReturnValueOnce('AAAAAA');
    codeSpy.mockReturnValueOnce('AAAAAA');
    codeSpy.mockReturnValueOnce('BBBBBB');

    try {
      const firstFormData = new FormData();
      firstFormData.set(
        'recording',
        new Blob([new Uint8Array(recordingFixtureBytes())], {
          type: 'application/octet-stream',
        }),
        'recording.hbr2',
      );

      const firstResponse = await postMultipart(
        '/recs',
        firstFormData,
        tenant.token,
      );
      expect(firstResponse.status).toBe(201);

      const secondFormData = new FormData();
      secondFormData.set(
        'recording',
        new Blob([new Uint8Array(recordingFixtureBytes())], {
          type: 'application/octet-stream',
        }),
        'recording.hbr2',
      );

      const secondResponse = await postMultipart(
        '/recs',
        secondFormData,
        tenant.token,
      );
      expect(secondResponse.status).toBe(201);
      const redirectA = await getNoRedirect('/recs/AAAAAA', tenant.token);
      const redirectB = await getNoRedirect('/recs/BBBBBB', tenant.token);
      expect(redirectA.status).toBe(302);
      expect(redirectB.status).toBe(302);
    } finally {
      codeSpy.mockRestore();
    }
  });

  it('rejects upload without recording file even when authenticated', async () => {
    const tenant = tenantFixture('tenant-recording-no-file');

    const response = await postMultipart('/recs', new FormData(), tenant.token);

    await expectApiError(
      response,
      400,
      'recording_invalid',
      'Invalid recording file',
    );
  });

  it('returns 404 for unknown code in same tenant', async () => {
    const tenant = tenantFixture('tenant-recording-missing-code');

    const response = await get('/recs/NOPE12', tenant.token);

    await expectApiError(
      response,
      404,
      'recording_not_found',
      'Recording not found',
    );
  });

  it('validates pagination bounds for recordings list', async () => {
    const tenant = tenantFixture('tenant-recording-list-validation');

    const invalidPageResponse = await get('/recs?page=0', tenant.token);
    expect(invalidPageResponse.status).toBe(400);

    const invalidPageSizeResponse = await get(
      '/recs?pageSize=101',
      tenant.token,
    );
    expect(invalidPageSizeResponse.status).toBe(400);
  });

  it('maps create persistence failures to 500', async () => {
    const tenant = tenantFixture('tenant-recording-persistence-create');
    const service = getE2ERuntime().app.get(RecordingsService);
    jest
      .spyOn(service, 'create')
      .mockResolvedValueOnce(err(persistenceErrorFixture('recordings')));

    const response = await postMultipart(
      '/recs',
      recordingFormDataFixture(),
      tenant.token,
    );

    await expectApiError(
      response,
      500,
      'persistence_error',
      'Unexpected error',
    );
  });

  it('maps list persistence failures to 500', async () => {
    const tenant = tenantFixture('tenant-recording-persistence-list');
    const service = getE2ERuntime().app.get(RecordingsService);
    jest
      .spyOn(service, 'list')
      .mockResolvedValueOnce(err(persistenceErrorFixture('recordings')));

    const response = await get('/recs', tenant.token);

    await expectApiError(
      response,
      500,
      'persistence_error',
      'Unexpected error',
    );
  });

  it('maps get-by-code persistence failures to 500', async () => {
    const tenant = tenantFixture('tenant-recording-persistence-get');
    const service = getE2ERuntime().app.get(RecordingsService);
    jest
      .spyOn(service, 'getByCode')
      .mockResolvedValueOnce(err(persistenceErrorFixture('recordings')));

    const response = await get('/recs/ABC123', tenant.token);

    await expectApiError(
      response,
      500,
      'persistence_error',
      'Unexpected error',
    );
  });

  it('rolls back inserted row when object upload fails', async () => {
    const tenant = tenantFixture('tenant-recording-rollback');
    const codeSpy = jest.spyOn(recordingCodeUtil, 'generateRecordingCode');
    const filePersistence = getE2ERuntime().app.get(FilePersistenceService);
    const uploadSpy = jest
      .spyOn(filePersistence, 'putObject')
      .mockResolvedValueOnce(
        err({
          type: 'file_persistence_error',
          cause: new Error('forced upload failure'),
        }),
      );
    codeSpy.mockReturnValueOnce('ROLLBK');

    try {
      const uploadResponse = await postMultipart(
        '/recs',
        recordingFormDataFixture(),
        tenant.token,
      );

      await expectApiError(
        uploadResponse,
        500,
        'persistence_error',
        'Unexpected error',
      );

      const lookupResponse = await get('/recs/ROLLBK', tenant.token);
      await expectApiError(
        lookupResponse,
        404,
        'recording_not_found',
        'Recording not found',
      );
    } finally {
      codeSpy.mockRestore();
      uploadSpy.mockRestore();
    }
  });
});
