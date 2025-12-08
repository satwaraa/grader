import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { AuthResponse, LoginCredentials, RegisterData } from "../../types";

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "http://localhost:8600/api",
    prepareHeaders: (headers) => {
      const token = localStorage.getItem("accessToken");
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return headers;
    },
  }),
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, LoginCredentials>({
      query: (credentials) => ({
        url: "/auth/login",
        method: "POST",
        body: credentials,
      }),
      transformResponse: (response: any) => {
        // Store tokens in localStorage
        if (response.data?.accessToken) {
          localStorage.setItem("accessToken", response.data.accessToken);
        }
        if (response.data?.refreshToken) {
          localStorage.setItem("refreshToken", response.data.refreshToken);
        }
        return response;
      },
    }),
    signup: builder.mutation<AuthResponse, RegisterData>({
      query: (userData) => ({
        url: "/auth/register",
        method: "POST",
        body: userData,
      }),
      transformResponse: (response: any) => {
        // Store tokens in localStorage
        if (response.data?.accessToken) {
          localStorage.setItem("accessToken", response.data.accessToken);
        }
        if (response.data?.refreshToken) {
          localStorage.setItem("refreshToken", response.data.refreshToken);
        }
        return response;
      },
    }),
    getCurrentUser: builder.query<AuthResponse, void>({
      query: () => "/auth/me",
    }),
  }),
});

export const { useLoginMutation, useSignupMutation, useGetCurrentUserQuery } =
  authApi;
