import { FetchClient } from '@blimu/fetch';
import * as Schema from '../schema';

export class UsersService {
  constructor(private core: FetchClient) {}

  /**
   * GET /users*
   * @summary List all users*/
  listUsers(
    query?: Schema.UsersListUsersQuery,
    init?: Omit<RequestInit, 'method' | 'body'>
  ): Promise<Schema.User[]> {
    return this.core.request({
      method: 'GET',
      path: `/users`,
      query,
      ...(init ?? {}),
    });
  }

  /**
   * POST /users*
   * @summary Create a new user*/
  createUser(
    body: Schema.CreateUserRequest,
    init?: Omit<RequestInit, 'method' | 'body'>
  ): Promise<Schema.User> {
    return this.core.request({
      method: 'POST',
      path: `/users`,
      body,
      ...(init ?? {}),
    });
  }

  /**
   * DELETE /users/{id}*
   * @summary Delete user*/
  deleteUser(id: string, init?: Omit<RequestInit, 'method' | 'body'>): Promise<unknown> {
    return this.core.request({
      method: 'DELETE',
      path: `/users/${encodeURIComponent(id)}`,
      ...(init ?? {}),
    });
  }

  /**
   * GET /users/{id}*
   * @summary Get user by ID*/
  getUser(id: string, init?: Omit<RequestInit, 'method' | 'body'>): Promise<Schema.User> {
    return this.core.request({
      method: 'GET',
      path: `/users/${encodeURIComponent(id)}`,
      ...(init ?? {}),
    });
  }

  /**
   * PATCH /users/{id}*
   * @summary Partially update user*/
  patchUser(
    id: string,
    body: Schema.PatchUserRequest,
    init?: Omit<RequestInit, 'method' | 'body'>
  ): Promise<Schema.User> {
    return this.core.request({
      method: 'PATCH',
      path: `/users/${encodeURIComponent(id)}`,
      body,
      ...(init ?? {}),
    });
  }

  /**
   * PUT /users/{id}*
   * @summary Update user*/
  updateUser(
    id: string,
    body: Schema.UpdateUserRequest,
    init?: Omit<RequestInit, 'method' | 'body'>
  ): Promise<Schema.User> {
    return this.core.request({
      method: 'PUT',
      path: `/users/${encodeURIComponent(id)}`,
      body,
      ...(init ?? {}),
    });
  }
}
