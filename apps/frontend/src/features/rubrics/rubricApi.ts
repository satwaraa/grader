import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../../app/baseQuery';
import type { Rubric, RubricCriterion } from '../../types';

export const rubricApi = createApi({
    reducerPath: 'rubricApi',
    baseQuery: baseQueryWithReauth,
    tagTypes: ['Rubric'],
    endpoints: (builder) => ({
        getRubrics: builder.query<{ success: boolean; data: Rubric[] }, void>({
            query: () => '/rubrics',
            providesTags: ['Rubric'],
        }),
        getRubric: builder.query<{ success: boolean; data: Rubric }, string>({
            query: (id) => `/rubrics/${id}`,
            providesTags: (_result, _error, id) => [{ type: 'Rubric', id }],
        }),
        createRubric: builder.mutation<
            { success: boolean; data: Rubric },
            { name: string; criteria: RubricCriterion[] }
        >({
            query: (data) => ({
                url: '/rubrics',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Rubric'],
        }),
        updateRubric: builder.mutation<
            { success: boolean; data: Rubric },
            { id: string; name: string; criteria: RubricCriterion[] }
        >({
            query: ({ id, ...data }) => ({
                url: `/rubrics/${id}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: (_result, _error, { id }) => [{ type: 'Rubric', id }, 'Rubric'],
        }),
        deleteRubric: builder.mutation<{ success: boolean }, string>({
            query: (id) => ({
                url: `/rubrics/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Rubric'],
        }),
    }),
});

export const {
    useGetRubricsQuery,
    useGetRubricQuery,
    useCreateRubricMutation,
    useUpdateRubricMutation,
    useDeleteRubricMutation,
} = rubricApi;
