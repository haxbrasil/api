import { get, json, post, put } from '../support/client';
import { err } from 'neverthrow';
import {
  providerUserIdFixture,
  persistenceErrorFixture,
  tenantFixture,
  DEFAULT_PROVIDER,
  ALTERNATE_PROVIDER,
  userIdentityPath,
  userIdPath,
} from '../fixtures';
import { expectApiError } from '../utils/error-assertions.util';
import { getE2ERuntime } from '../support/runtime';
import { UsersService } from '../../src/modules/users/users.service';

describe('Users (e2e)', () => {
  it('rejects requests without a bearer token', async () => {
    const getResponse = await get('/users');
    expect(getResponse.status).toBe(401);

    const postResponse = await post('/users', {
      provider: DEFAULT_PROVIDER,
      providerUserId: '1000',
      username: 'NoAuth',
    });
    expect(postResponse.status).toBe(401);
  });

  it('creates a user for the authenticated tenant', async () => {
    const tenant = tenantFixture('tenant-create');

    const response = await post(
      '/users',
      {
        provider: DEFAULT_PROVIDER,
        providerUserId: providerUserIdFixture(),
        username: 'Alice',
      },
      tenant.token,
    );

    expect(response.status).toBe(201);
    expect(await json(response)).toEqual(
      expect.objectContaining({
        provider: DEFAULT_PROVIDER,
        username: 'Alice',
        role: 'default',
      }),
    );
  });

  it('returns 409 when creating a duplicate provider user in the same tenant', async () => {
    const tenant = tenantFixture('tenant-dup');
    const providerUserId = providerUserIdFixture();

    const firstResponse = await post(
      '/users',
      {
        provider: DEFAULT_PROVIDER,
        providerUserId,
        username: 'Alice',
      },
      tenant.token,
    );
    expect(firstResponse.status).toBe(201);

    const secondResponse = await post(
      '/users',
      {
        provider: DEFAULT_PROVIDER,
        providerUserId,
        username: 'AliceAgain',
      },
      tenant.token,
    );
    expect(secondResponse.status).toBe(409);
  });

  it('allows same provider user id across different providers', async () => {
    const tenant = tenantFixture('tenant-cross-provider');
    const providerUserId = providerUserIdFixture();

    const firstResponse = await post(
      '/users',
      {
        provider: DEFAULT_PROVIDER,
        providerUserId,
        username: 'DiscordUser',
      },
      tenant.token,
    );
    expect(firstResponse.status).toBe(201);

    const secondResponse = await post(
      '/users',
      {
        provider: ALTERNATE_PROVIDER,
        providerUserId,
        username: 'GoogleUser',
      },
      tenant.token,
    );
    expect(secondResponse.status).toBe(201);
  });

  it('returns 409 when creating a duplicate username in the same tenant', async () => {
    const tenant = tenantFixture('tenant-dup-username');
    const username = 'Alice';

    const firstResponse = await post(
      '/users',
      {
        provider: DEFAULT_PROVIDER,
        providerUserId: providerUserIdFixture(),
        username,
      },
      tenant.token,
    );
    expect(firstResponse.status).toBe(201);

    const secondResponse = await post(
      '/users',
      {
        provider: DEFAULT_PROVIDER,
        providerUserId: providerUserIdFixture(),
        username,
      },
      tenant.token,
    );
    expect(secondResponse.status).toBe(409);
  });

  it('isolates users by tenant', async () => {
    const tenantA = tenantFixture('tenant-a');
    const tenantB = tenantFixture('tenant-b');
    const sharedProviderUserId = providerUserIdFixture();

    const tenantAInsert = await post(
      '/users',
      {
        provider: DEFAULT_PROVIDER,
        providerUserId: sharedProviderUserId,
        username: 'TenantAUser',
      },
      tenantA.token,
    );
    expect(tenantAInsert.status).toBe(201);

    const tenantBInsert = await post(
      '/users',
      {
        provider: DEFAULT_PROVIDER,
        providerUserId: sharedProviderUserId,
        username: 'TenantBUser',
      },
      tenantB.token,
    );
    expect(tenantBInsert.status).toBe(201);

    const tenantAUsersResponse = await get('/users', tenantA.token);
    expect(tenantAUsersResponse.status).toBe(200);
    expect(await json(tenantAUsersResponse)).toEqual(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            provider: DEFAULT_PROVIDER,
            provider_user_id: sharedProviderUserId,
            username: 'TenantAUser',
          }),
        ],
        page_info: {
          page: 1,
          page_size: 20,
          has_next_page: false,
        },
      }),
    );

    const tenantBUsersResponse = await get('/users', tenantB.token);
    expect(tenantBUsersResponse.status).toBe(200);
    expect(await json(tenantBUsersResponse)).toEqual(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            provider: DEFAULT_PROVIDER,
            provider_user_id: sharedProviderUserId,
            username: 'TenantBUser',
          }),
        ],
        page_info: {
          page: 1,
          page_size: 20,
          has_next_page: false,
        },
      }),
    );
  });

  it('paginates users with page query', async () => {
    const tenant = tenantFixture('tenant-pagination');

    await post(
      '/users',
      {
        provider: DEFAULT_PROVIDER,
        providerUserId: providerUserIdFixture(),
        username: 'User1',
      },
      tenant.token,
    );
    await post(
      '/users',
      {
        provider: DEFAULT_PROVIDER,
        providerUserId: providerUserIdFixture(),
        username: 'User2',
      },
      tenant.token,
    );
    await post(
      '/users',
      {
        provider: DEFAULT_PROVIDER,
        providerUserId: providerUserIdFixture(),
        username: 'User3',
      },
      tenant.token,
    );

    const firstPageResponse = await get(
      '/users?page=1&pageSize=2',
      tenant.token,
    );
    expect(firstPageResponse.status).toBe(200);

    const firstPage = (await json(firstPageResponse)) as {
      items: Array<{ id: string }>;
      page_info: { page: number; page_size: number; has_next_page: boolean };
    };

    expect(firstPage.items).toHaveLength(2);
    expect(firstPage.page_info).toEqual({
      page: 1,
      page_size: 2,
      has_next_page: true,
    });

    const secondPageResponse = await get(
      '/users?page=2&pageSize=2',
      tenant.token,
    );
    expect(secondPageResponse.status).toBe(200);

    const secondPage = (await json(secondPageResponse)) as {
      items: Array<{ id: string }>;
      page_info: { page: number; page_size: number; has_next_page: boolean };
    };

    expect(secondPage.items).toHaveLength(1);
    expect(secondPage.page_info).toEqual({
      page: 2,
      page_size: 2,
      has_next_page: false,
    });
    expect(firstPage.items[0].id).not.toBe(secondPage.items[0].id);
    expect(firstPage.items[1].id).not.toBe(secondPage.items[0].id);
  });

  it('validates pagination query', async () => {
    const tenant = tenantFixture('tenant-invalid-page');

    const response = await get('/users?page=0', tenant.token);
    expect(response.status).toBe(400);
  });

  it('filters users list by username', async () => {
    const tenant = tenantFixture('tenant-list-filter-username');
    const username = 'FilterUser';

    await post(
      '/users',
      {
        provider: DEFAULT_PROVIDER,
        providerUserId: providerUserIdFixture(),
        username,
      },
      tenant.token,
    );

    await post(
      '/users',
      {
        provider: DEFAULT_PROVIDER,
        providerUserId: providerUserIdFixture(),
        username: 'OtherUser',
      },
      tenant.token,
    );

    const response = await get(
      `/users?username=${encodeURIComponent(username)}`,
      tenant.token,
    );
    expect(response.status).toBe(200);
    expect(await json(response)).toEqual(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            username,
          }),
        ],
      }),
    );
  });

  it('gets a user by provider identity', async () => {
    const tenant = tenantFixture('tenant-get-by-id');
    const providerUserId = providerUserIdFixture();
    const username = 'LookupUser';

    const createResponse = await post(
      '/users',
      {
        provider: DEFAULT_PROVIDER,
        providerUserId,
        username,
      },
      tenant.token,
    );
    expect(createResponse.status).toBe(201);

    const getResponse = await get(
      userIdentityPath(DEFAULT_PROVIDER, providerUserId),
      tenant.token,
    );
    expect(getResponse.status).toBe(200);
    expect(await json(getResponse)).toEqual(
      expect.objectContaining({
        provider: DEFAULT_PROVIDER,
        provider_user_id: providerUserId,
        username,
        role: 'default',
      }),
    );
  });

  it('returns 404 when user by provider identity does not exist', async () => {
    const tenant = tenantFixture('tenant-get-by-id-missing');

    const response = await get(
      userIdentityPath(DEFAULT_PROVIDER, providerUserIdFixture()),
      tenant.token,
    );

    await expectApiError(response, 404, 'user_not_found', 'User not found');
  });

  it('updates user fields with put', async () => {
    const tenant = tenantFixture('tenant-update');
    const providerUserId = providerUserIdFixture();

    const createResponse = await post(
      '/users',
      {
        provider: DEFAULT_PROVIDER,
        providerUserId,
        username: 'BeforeName',
        password: 'before-pass',
      },
      tenant.token,
    );
    expect(createResponse.status).toBe(201);
    const createdUser = (await json(createResponse)) as { id: string };

    const updateResponse = await put(
      userIdPath(createdUser.id),
      {
        username: 'AfterName',
        role: 'mod',
        password: 'after-pass',
      },
      tenant.token,
    );

    expect(updateResponse.status).toBe(200);
    expect(await json(updateResponse)).toEqual(
      expect.objectContaining({
        provider: DEFAULT_PROVIDER,
        provider_user_id: providerUserId,
        username: 'AfterName',
        role: 'mod',
      }),
    );

    const confirmBefore = await post(
      `${userIdPath(createdUser.id)}/confirm`,
      {
        password: 'before-pass',
      },
      tenant.token,
    );

    expect(confirmBefore.status).toBe(200);
    expect(await json(confirmBefore)).toEqual({
      is_correct: false,
      provider_user_id: providerUserId,
    });

    const confirmAfter = await post(
      `${userIdPath(createdUser.id)}/confirm`,
      {
        password: 'after-pass',
      },
      tenant.token,
    );

    expect(confirmAfter.status).toBe(200);
    expect(await json(confirmAfter)).toEqual({
      is_correct: true,
      provider_user_id: providerUserId,
    });
  });

  it('returns 404 when updating an unknown user id', async () => {
    const tenant = tenantFixture('tenant-update-missing');

    const response = await put(
      userIdPath('00000000-0000-4000-8000-000000000000'),
      {
        username: 'Unknown',
      },
      tenant.token,
    );

    await expectApiError(response, 404, 'user_not_found', 'User not found');
  });

  it('returns 404 when updating a user from another tenant', async () => {
    const tenantA = tenantFixture('tenant-update-cross-a');
    const tenantB = tenantFixture('tenant-update-cross-b');

    const createResponse = await post(
      '/users',
      {
        provider: DEFAULT_PROVIDER,
        providerUserId: providerUserIdFixture(),
        username: 'TenantAOnly',
      },
      tenantA.token,
    );
    expect(createResponse.status).toBe(201);

    const createdUser = (await json(createResponse)) as { id: string };

    const updateResponse = await put(
      userIdPath(createdUser.id),
      {
        username: 'TenantBCannotUpdate',
      },
      tenantB.token,
    );

    await expectApiError(
      updateResponse,
      404,
      'user_not_found',
      'User not found',
    );
  });

  it('returns 409 when update would duplicate username in same tenant', async () => {
    const tenant = tenantFixture('tenant-update-dup-username');

    const firstUserResponse = await post(
      '/users',
      {
        provider: DEFAULT_PROVIDER,
        providerUserId: providerUserIdFixture(),
        username: 'OriginalName',
      },
      tenant.token,
    );
    expect(firstUserResponse.status).toBe(201);
    const secondUserResponse = await post(
      '/users',
      {
        provider: DEFAULT_PROVIDER,
        providerUserId: providerUserIdFixture(),
        username: 'TargetName',
      },
      tenant.token,
    );
    expect(secondUserResponse.status).toBe(201);
    const secondUser = (await json(secondUserResponse)) as { id: string };

    const response = await put(
      userIdPath(secondUser.id),
      {
        username: 'OriginalName',
      },
      tenant.token,
    );

    await expectApiError(
      response,
      409,
      'user_already_exists',
      'User already exists',
    );
  });

  it('changes password and confirms credentials', async () => {
    const tenant = tenantFixture('tenant-change-password');
    const providerUserId = providerUserIdFixture();
    const username = 'PasswordUser';

    const createResponse = await post(
      '/users',
      {
        provider: DEFAULT_PROVIDER,
        providerUserId,
        username,
        password: 'old-pass',
      },
      tenant.token,
    );
    expect(createResponse.status).toBe(201);
    const createdUser = (await json(createResponse)) as { id: string };

    const confirmBefore = await post(
      `${userIdPath(createdUser.id)}/confirm`,
      {
        password: 'old-pass',
      },
      tenant.token,
    );
    expect(confirmBefore.status).toBe(200);
    expect(await json(confirmBefore)).toEqual({
      is_correct: true,
      provider_user_id: providerUserId,
    });

    const changeResponse = await put(
      userIdPath(createdUser.id),
      {
        password: 'new-pass',
      },
      tenant.token,
    );
    expect(changeResponse.status).toBe(200);

    const confirmOld = await post(
      `${userIdPath(createdUser.id)}/confirm`,
      {
        password: 'old-pass',
      },
      tenant.token,
    );
    expect(confirmOld.status).toBe(200);
    expect(await json(confirmOld)).toEqual({
      is_correct: false,
      provider_user_id: providerUserId,
    });

    const confirmNew = await post(
      `${userIdPath(createdUser.id)}/confirm`,
      {
        password: 'new-pass',
      },
      tenant.token,
    );
    expect(confirmNew.status).toBe(200);
    expect(await json(confirmNew)).toEqual({
      is_correct: true,
      provider_user_id: providerUserId,
    });
  });

  it('returns false on confirm when user has no password', async () => {
    const tenant = tenantFixture('tenant-confirm-no-password');
    const providerUserId = providerUserIdFixture();
    const username = 'NoPasswordUser';

    const createResponse = await post(
      '/users',
      {
        provider: DEFAULT_PROVIDER,
        providerUserId,
        username,
      },
      tenant.token,
    );
    expect(createResponse.status).toBe(201);
    const createdUser = (await json(createResponse)) as { id: string };

    const confirmResponse = await post(
      `${userIdPath(createdUser.id)}/confirm`,
      {
        password: 'any-pass',
      },
      tenant.token,
    );
    expect(confirmResponse.status).toBe(200);
    expect(await json(confirmResponse)).toEqual({
      is_correct: false,
      provider_user_id: providerUserId,
    });
  });

  it('returns false and null provider user id when confirming unknown user id', async () => {
    const tenant = tenantFixture('tenant-confirm-missing-user');

    const response = await post(
      `${userIdPath('00000000-0000-4000-8000-000000000000')}/confirm`,
      {
        password: 'anything',
      },
      tenant.token,
    );

    expect(response.status).toBe(200);
    expect(await json(response)).toEqual({
      is_correct: false,
      provider_user_id: null,
    });
  });

  it('validates update role and password length', async () => {
    const tenant = tenantFixture('tenant-update-validation');

    const createResponse = await post(
      '/users',
      {
        provider: DEFAULT_PROVIDER,
        providerUserId: providerUserIdFixture(),
        username: 'ValidateUpdate',
      },
      tenant.token,
    );
    expect(createResponse.status).toBe(201);
    const createdUser = (await json(createResponse)) as { id: string };

    const invalidRoleResponse = await put(
      userIdPath(createdUser.id),
      {
        role: 'owner',
      },
      tenant.token,
    );
    expect(invalidRoleResponse.status).toBe(400);

    const shortPasswordResponse = await put(
      userIdPath(createdUser.id),
      {
        password: 'abc',
      },
      tenant.token,
    );
    expect(shortPasswordResponse.status).toBe(400);
  });

  it('validates the create payload', async () => {
    const tenant = tenantFixture('tenant-validate');

    const response = await post(
      '/users',
      {
        provider: 'Invalid Provider',
        providerUserId: '',
        username: '',
      },
      tenant.token,
    );
    expect(response.status).toBe(400);
  });

  it('validates pageSize query bounds', async () => {
    const tenant = tenantFixture('tenant-invalid-page-size');

    const response = await get('/users?pageSize=101', tenant.token);
    expect(response.status).toBe(400);
  });

  it('maps create persistence failures to 500', async () => {
    const tenant = tenantFixture('tenant-users-persistence-create');
    const service = getE2ERuntime().app.get(UsersService);
    jest
      .spyOn(service, 'create')
      .mockResolvedValueOnce(err(persistenceErrorFixture('users')));

    const response = await post(
      '/users',
      {
        provider: DEFAULT_PROVIDER,
        providerUserId: providerUserIdFixture(),
        username: 'PersistenceCreate',
      },
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
    const tenant = tenantFixture('tenant-users-persistence-list');
    const service = getE2ERuntime().app.get(UsersService);
    jest
      .spyOn(service, 'list')
      .mockResolvedValueOnce(err(persistenceErrorFixture('users')));

    const response = await get('/users', tenant.token);

    await expectApiError(
      response,
      500,
      'persistence_error',
      'Unexpected error',
    );
  });

  it('maps get-by-identity persistence failures to 500', async () => {
    const tenant = tenantFixture('tenant-users-persistence-get');
    const service = getE2ERuntime().app.get(UsersService);
    jest
      .spyOn(service, 'getByIdentity')
      .mockResolvedValueOnce(err(persistenceErrorFixture('users')));

    const response = await get(
      userIdentityPath(DEFAULT_PROVIDER, providerUserIdFixture()),
      tenant.token,
    );

    await expectApiError(
      response,
      500,
      'persistence_error',
      'Unexpected error',
    );
  });

  it('maps update persistence failures to 500', async () => {
    const tenant = tenantFixture('tenant-users-persistence-update');
    const service = getE2ERuntime().app.get(UsersService);
    jest
      .spyOn(service, 'update')
      .mockResolvedValueOnce(err(persistenceErrorFixture('users')));

    const response = await put(
      userIdPath('00000000-0000-4000-8000-000000000000'),
      {
        username: 'WillFail',
      },
      tenant.token,
    );

    await expectApiError(
      response,
      500,
      'persistence_error',
      'Unexpected error',
    );
  });

  it('maps confirm persistence failures to 500', async () => {
    const tenant = tenantFixture('tenant-users-persistence-confirm');
    const service = getE2ERuntime().app.get(UsersService);
    jest
      .spyOn(service, 'confirm')
      .mockResolvedValueOnce(err(persistenceErrorFixture('users')));

    const response = await post(
      `${userIdPath('00000000-0000-4000-8000-000000000000')}/confirm`,
      {
        password: 'valid-pass',
      },
      tenant.token,
    );

    await expectApiError(
      response,
      500,
      'persistence_error',
      'Unexpected error',
    );
  });
});
