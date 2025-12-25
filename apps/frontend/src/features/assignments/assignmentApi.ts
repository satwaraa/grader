import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../../app/baseQuery';
import type {
    Assignment,
    CreateAssignmentRequest,
    CreateSubmissionRequest,
    Submission,
} from '../../types';

export const assignmentApi = createApi({
    reducerPath: 'assignmentApi',
    baseQuery: baseQueryWithReauth,
    tagTypes: ['Assignment', 'Submission'],
    endpoints: (builder) => ({
        // Assignment Endpoints
        createAssignment: builder.mutation<
            { success: boolean; data: Assignment },
            CreateAssignmentRequest
        >({
            query: (data) => ({
                url: '/assignments',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Assignment'],
        }),
        getTeacherAssignments: builder.query<{ success: boolean; data: Assignment[] }, void>({
            query: () => '/assignments/teacher/my-assignments',
            providesTags: ['Assignment'],
        }),
        getStudentAssignments: builder.query<{ success: boolean; data: Assignment[] }, void>({
            query: () => '/assignments/student/all',
            providesTags: ['Assignment'],
        }),
        getAssignment: builder.query<{ success: boolean; data: Assignment }, string>({
            query: (id) => `/assignments/${id}`,
            providesTags: (_result, _error, id) => [{ type: 'Assignment', id }],
        }),

        // Submission Endpoints
        createSubmission: builder.mutation<
            { success: boolean; data: Submission },
            CreateSubmissionRequest
        >({
            query: (data) => ({
                url: '/submissions',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Submission'],
        }),
        getMySubmissions: builder.query<{ success: boolean; data: Submission[] }, void>({
            query: () => '/submissions/my-submissions',
            providesTags: ['Submission'],
        }),
        getRecentSubmissions: builder.query<{ success: boolean; data: Submission[] }, void>({
            query: () => '/submissions/recent',
            providesTags: ['Submission'],
        }),
        getAssignmentSubmissions: builder.query<{ success: boolean; data: Submission[] }, string>({
            query: (assignmentId) => `/submissions/assignment/${assignmentId}`,
            providesTags: ['Submission'],
        }),
        getUploadUrl: builder.query({
            query: ({
                fileName,
                type,
                assignmentId,
            }: {
                fileName: string;
                type: string;
                assignmentId: string;
            }) => ({
                url: '/submissions/uploadUrl',
                method: 'GET',
                params: {
                    fileName,
                    type,
                    assignmentId,
                },
            }),
        }),
        submitAssignment: builder.mutation<{ success: boolean; data: Submission }, { assignmentId: string; otp: string; studentUniqueId?: string }>({
            query: (body) => ({
                url: '/submissions/',
                method: 'POST',
                body: body,
            }),
        }),
        verifyOtp: builder.mutation<{ success: boolean }, { assignmentId: string; otp: string }>({
            query: (body) => ({
                url: '/submissions/verifyAssignmentOtp',
                method: 'POST',
                body: body,
            }),
        }),
        reEvaluateSubmission: builder.mutation<{ success: boolean }, { submissionId: string }>({
            query: (body) => ({
                url: '/submissions/reEvaluate',
                method: 'POST',
                body: body,
            }),
            invalidatesTags: ['Submission'],
        }),
        allowResubmission: builder.mutation<{ success: boolean }, { submissionId: string }>({
            query: (body) => ({
                url: '/submissions/allowResubmission',
                method: 'POST',
                body: body,
            }),
            invalidatesTags: ['Submission'],
        }),
    }),
});

export const {
    useCreateAssignmentMutation,
    useGetTeacherAssignmentsQuery,
    useGetStudentAssignmentsQuery,
    useGetAssignmentQuery,
    useCreateSubmissionMutation,
    useGetMySubmissionsQuery,
    useGetRecentSubmissionsQuery,
    useGetAssignmentSubmissionsQuery,
    useLazyGetUploadUrlQuery,
    useSubmitAssignmentMutation,
    useVerifyOtpMutation,
    useReEvaluateSubmissionMutation,
    useAllowResubmissionMutation,
} = assignmentApi;
