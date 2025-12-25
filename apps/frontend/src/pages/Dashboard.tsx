import { Award, BarChart3, FileText, FolderClock, Plus, Search, Share2, X } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../app/store';
import MeshBackground from '../components/MeshBackground';
import RubricManager from '../components/RubricManager';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '../components/ui/dialog';
import { useSocket } from '../context/SocketContext';
import {
    useAllowResubmissionMutation,
    useCreateAssignmentMutation,
    useGetRecentSubmissionsQuery,
    useGetTeacherAssignmentsQuery,
    useReEvaluateSubmissionMutation,
} from '../features/assignments/assignmentApi';
import { selectCurrentUser } from '../features/auth/authSlice';
import { useGetRubricsQuery } from '../features/rubrics/rubricApi';
import type { Submission } from '../types';

const Dashboard: React.FC = () => {
    const user = useAppSelector(selectCurrentUser);
    const navigate = useNavigate();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isRubricManagerOpen, setIsRubricManagerOpen] = useState(false);
    const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
    const isTeacher = user?.role === 'TEACHER';
    const { socket } = useSocket();

    // Track grading progress for each submission
    const [gradingProgress, setGradingProgress] = useState<
        Record<
            string,
            {
                step: string;
                percent: number;
                status: 'processing' | 'completed' | 'failed';
            }
        >
    >({});

    // API Hooks
    const {
        data: assignmentsData,
        isLoading: isAssignmentsLoading,
        refetch: refetchAssignments,
    } = useGetTeacherAssignmentsQuery(undefined, {
        skip: !isTeacher,
    });
    const {
        data: submissionsData,
        isLoading: isSubmissionsLoading,
        refetch: refetchSubmissions,
    } = useGetRecentSubmissionsQuery();
    const { data: rubricsData } = useGetRubricsQuery(undefined, { skip: !isTeacher });
    const [createAssignment, { isLoading: isCreating }] = useCreateAssignmentMutation();
    const [reEvaluateSubmission] = useReEvaluateSubmissionMutation();
    const [allowResubmission] = useAllowResubmissionMutation();

    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [maxScore, setMaxScore] = useState('100');
    const [selectedRubricId, setSelectedRubricId] = useState<string>('');
    const [requireUniqueId, setRequireUniqueId] = useState(false);

    const activeAssignments = useMemo(
        () => assignmentsData?.data || [],
        [assignmentsData?.data],
    );

    // Socket listener for grading progress (teachers only)
    useEffect(() => {
        if (!socket || !isTeacher) return;

        const handleGradingProgress = (event: {
            submissionId: string;
            step?: string;
            percent?: number;
            error?: string;
            score?: number;
        }) => {
            console.log('📡 Grading progress:', event);

            // Map step to user-friendly display status
            let displayStatus: 'pending' | 'downloading' | 'grading' | 'graded' | 'failed' = 'pending';
            if (event.error) {
                displayStatus = 'failed';
            } else if (event.step === 'grading_completed') {
                displayStatus = 'graded';
                // Refetch to get updated data from server
                refetchSubmissions();
                refetchAssignments();
            } else if (
                event.step === 'downloading_pdf' ||
                event.step === 'pdf_downloaded' ||
                event.step === 'submission_started'
            ) {
                displayStatus = 'downloading';
            } else if (
                event.step === 'parsing_started' ||
                event.step === 'page_parsed' ||
                event.step === 'parsing_completed' ||
                event.step === 'gemini_started' ||
                event.step === 'gemini_processing' ||
                event.step === 'gemini_completed'
            ) {
                displayStatus = 'grading';
            }

            setGradingProgress((prev) => ({
                ...prev,
                [event.submissionId]: {
                    step: displayStatus,
                    percent: event.percent || 0,
                    status: event.error
                        ? 'failed'
                        : event.step === 'grading_completed'
                          ? 'completed'
                          : 'processing',
                },
            }));
        };

        socket.on('assignment-grading-progress', handleGradingProgress);

        // Listen for new submissions to auto-refresh
        const handleNewSubmission = (event: { assignmentId: string }) => {
            console.log('📡 New submission received:', event);
            // Refetch both assignments (for count) and submissions
            refetchAssignments();
            refetchSubmissions();
        };

        socket.on('new-submission', handleNewSubmission);

        return () => {
            socket.off('assignment-grading-progress', handleGradingProgress);
            socket.off('new-submission', handleNewSubmission);
        };
    }, [socket, isTeacher, refetchAssignments, refetchSubmissions]);

    // Watch all active assignments for grading updates (teachers only)
    useEffect(() => {
        if (!socket || !isTeacher || !activeAssignments.length) return;

        activeAssignments.forEach((assignment) => {
            socket.emit('watch-assignment', assignment.id);
        });

        return () => {
            activeAssignments.forEach((assignment) => {
                socket.emit('unwatch-assignment', assignment.id);
            });
        };
    }, [socket, isTeacher, activeAssignments]);

    const handleCreateAssignment = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createAssignment({
                title,
                description,
                dueDate,
                maxScore: parseInt(maxScore),
                rubricId: selectedRubricId || undefined,
                requireUniqueId,
            }).unwrap();
            setIsCreateModalOpen(false);
            setTitle('');
            setDescription('');
            setDueDate('');
            setSelectedRubricId('');
            setRequireUniqueId(false);
            alert('Assignment created successfully!');
        } catch (error) {
            console.error('Failed to create assignment', error);
            alert('Failed to create assignment');
        }
    };

    const handleShareLink = async (assignmentId: string) => {
        const link = `${window.location.origin}/upload/${assignmentId}`;
        console.log('link', link);
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(link);
                alert(`Link copied: ${link}`);
                return;
            }

            // Fallback for older browsers: create a temporary textarea and execCommand
            const textarea = document.createElement('textarea');
            textarea.value = link;
            // Prevent scrolling to bottom
            textarea.style.position = 'fixed';
            textarea.style.top = '0';
            textarea.style.left = '0';
            textarea.style.width = '1px';
            textarea.style.height = '1px';
            textarea.style.padding = '0';
            textarea.style.border = 'none';
            textarea.style.outline = 'none';
            textarea.style.boxShadow = 'none';
            textarea.style.background = 'transparent';
            document.body.appendChild(textarea);
            textarea.select();
            textarea.setSelectionRange(0, textarea.value.length);
            const successful = document.execCommand('copy');
            document.body.removeChild(textarea);
            if (successful) {
                alert(`Link copied: ${link}`);
            } else {
                // As a last resort, show the link so the user can copy manually
                window.prompt('Copy this link', link);
            }
        } catch (err) {
            console.error('Failed to copy link', err);
            // Final fallback
            window.prompt('Copy this link', link);
        }
    };

    const handleReEvaluate = async (submissionId: string) => {
        try {
            await reEvaluateSubmission({ submissionId }).unwrap();
            alert('Submission queued for re-evaluation');
        } catch  {
            alert('Failed to trigger re-evaluation');
        }
    };

    const handleAllowResubmission = async (submissionId: string) => {
        if (!confirm('Are you sure you want to delete this submission? This action cannot be undone.')) {
            return;
        }
        try {
            await allowResubmission({ submissionId }).unwrap();
            alert('Submission deleted. Student can now resubmit.');
            setSelectedSubmission(null);
        } catch  {
            alert('Failed to allow resubmission');
        }
    };

    const recentSubmissions = submissionsData?.data || [];

    // Calculate stats
    const pendingCount = recentSubmissions.filter((s) => s.status === 'PENDING').length;
    const gradedCount = recentSubmissions.filter((s) => s.status === 'GRADED').length;
    // Calculate average score for graded submissions
    const gradedSubmissions = recentSubmissions.filter(
        (s) => s.status === 'GRADED' && s.score !== null
    );
    const avgScore =
        gradedSubmissions.length > 0
            ? Math.round(
                  gradedSubmissions.reduce((acc, s) => acc + (s.score || 0), 0) /
                      gradedSubmissions.length
              )
            : 0;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#030712] text-gray-900 dark:text-gray-100 px-4 py-8 transition-colors duration-300 relative overflow-hidden">
            {/* Mesh Background */}
            <MeshBackground />
            {/* Rubric Manager Modal */}
            {isRubricManagerOpen && <RubricManager onClose={() => setIsRubricManagerOpen(false)} />}

            {/* Create Assignment Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl w-full max-w-md shadow-xl border border-gray-200 dark:border-gray-800">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold">Create Assignment</h3>
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateAssignment} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Title</label>
                                <input
                                    type="text"
                                    required
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent"
                                    placeholder="Assignment Title"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Description
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent"
                                    rows={3}
                                    placeholder="Instructions..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Due Date</label>
                                <input
                                    type="date"
                                    required
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Max Score</label>
                                <input
                                    type="number"
                                    required
                                    value={maxScore}
                                    onChange={(e) => setMaxScore(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Rubric (Optional)
                                </label>
                                <select
                                    value={selectedRubricId}
                                    onChange={(e) => {
                                        const rubricId = e.target.value;
                                        setSelectedRubricId(rubricId);

                                        // Auto-set maxScore based on rubric criteria
                                        if (rubricId && rubricsData?.data) {
                                            const selectedRubric = rubricsData.data.find(r => r.id === rubricId);
                                            if (selectedRubric?.criteria) {
                                                const totalPoints = selectedRubric.criteria.reduce(
                                                    (sum, criterion) => sum + (criterion.points || 0),
                                                    0
                                                );
                                                if (totalPoints > 0) {
                                                    setMaxScore(totalPoints.toString());
                                                }
                                            }
                                        }
                                    }}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent">
                                    <option value="">No Rubric</option>
                                    {rubricsData?.data.map((rubric) => (
                                        <option key={rubric.id} value={rubric.id}>
                                            {rubric.name} ({rubric.criteria.reduce((sum, c) => sum + (c.points || 0), 0)} pts)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Require Unique ID Checkbox */}
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="requireUniqueId"
                                    checked={requireUniqueId}
                                    onChange={(e) => setRequireUniqueId(e.target.checked)}
                                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                />
                                <label htmlFor="requireUniqueId" className="text-sm text-gray-700 dark:text-gray-300">
                                    Require University ID on submission
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={isCreating}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-medium transition-colors disabled:opacity-50">
                                {isCreating ? 'Creating...' : 'Create Assignment'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
                    <div>
                        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-500">
                            {isTeacher ? 'Instructor Dashboard' : 'Student Dashboard'}
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            Overview for {user?.email}
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative hidden md:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search..."
                                className="pl-10 pr-4 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none w-64 shadow-sm"
                            />
                        </div>
                        {isTeacher && (
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm">
                                <Plus className="h-4 w-4" />
                                <span>Create Assignment</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <div className="bg-white dark:bg-gray-900/60 dark:backdrop-blur-sm border border-gray-200 dark:border-indigo-500/30 p-6 rounded-2xl shadow-sm dark:shadow-[0_0_30px_-10px_rgba(99,102,241,0.3)]">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg">
                                <FolderClock className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <h3 className="text-gray-600 dark:text-gray-300 font-medium">
                                {isTeacher ? 'To Grade' : 'Pending'}
                            </h3>
                        </div>
                        <p className="text-4xl font-bold text-gray-900 dark:text-white mt-2">
                            {pendingCount}
                        </p>
                    </div>
                    <div className="bg-white dark:bg-gray-900/60 dark:backdrop-blur-sm border border-gray-200 dark:border-emerald-500/30 p-6 rounded-2xl shadow-sm dark:shadow-[0_0_30px_-10px_rgba(16,185,129,0.3)]">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg">
                                <Award className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <h3 className="text-gray-600 dark:text-gray-300 font-medium">
                                {isTeacher ? 'Graded This Week' : 'Completed'}
                            </h3>
                        </div>
                        <p className="text-4xl font-bold text-gray-900 dark:text-white mt-2">
                            {gradedCount}
                        </p>
                    </div>
                    <div className="bg-white dark:bg-gray-900/60 dark:backdrop-blur-sm border border-gray-200 dark:border-purple-500/30 p-6 rounded-2xl shadow-sm dark:shadow-[0_0_30px_-10px_rgba(168,85,247,0.3)]">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-2 bg-purple-100 dark:bg-purple-500/20 rounded-lg">
                                <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                            </div>
                            <h3 className="text-gray-600 dark:text-gray-300 font-medium">
                                Avg Score
                            </h3>
                        </div>
                        <p className="text-4xl font-bold text-gray-900 dark:text-white mt-2">
                            {avgScore}%
                        </p>
                    </div>
                </div>

                {/* Active Assignments (Teacher Only) */}
                {isTeacher && (
                    <div className="bg-white dark:bg-gray-900/30 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden backdrop-blur-sm shadow-sm dark:shadow-none mb-10">
                        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Active Assignments
                            </h3>
                            <button
                                onClick={() => setIsRubricManagerOpen(true)}
                                className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-1">
                                <FileText className="h-4 w-4" /> Manage Rubrics
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                                <thead className="bg-gray-50 dark:bg-gray-900/50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Title
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Due Date
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            OTP
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Submissions
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-transparent">
                                    {isAssignmentsLoading ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-4 text-center">
                                                Loading...
                                            </td>
                                        </tr>
                                    ) : activeAssignments.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-4 text-center">
                                                No assignments found
                                            </td>
                                        </tr>
                                    ) : (
                                        activeAssignments.map((item) => (
                                            <tr
                                                key={item.id}
                                                className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                                                    {item.title}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {item.dueDate
                                                        ? new Date(
                                                              item.dueDate
                                                          ).toLocaleDateString()
                                                        : 'No due date'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                                                    {item.otp}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {item._count?.submissions || 0}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <div className="flex gap-3">
                                                        <button
                                                            onClick={() =>
                                                                navigate(
                                                                    `/assignment/${item.id}/submissions`
                                                                )
                                                            }
                                                            className="flex items-center gap-1 text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
                                                            <FileText className="h-4 w-4" />
                                                            Submissions
                                                        </button>
                                                        <button
                                                            onClick={() => handleShareLink(item.id)}
                                                            className="flex items-center gap-1 text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
                                                            <Share2 className="h-4 w-4" />
                                                            Share
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Recent Submissions */}
                <div className="bg-white dark:bg-gray-900/30 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden backdrop-blur-sm shadow-sm dark:shadow-none">
                    <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {isTeacher ? 'Recent Submissions' : 'My Submissions'}
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                            <thead className="bg-gray-50 dark:bg-gray-900/50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Assignment
                                    </th>
                                    {isTeacher && (
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Student
                                        </th>
                                    )}
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Submitted
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Score
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-transparent">
                                {isSubmissionsLoading ? (
                                    <tr>
                                        <td
                                            colSpan={isTeacher ? 6 : 5}
                                            className="px-6 py-4 text-center">
                                            Loading...
                                        </td>
                                    </tr>
                                ) : recentSubmissions.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={isTeacher ? 6 : 5}
                                            className="px-6 py-4 text-center">
                                            No submissions found
                                        </td>
                                    </tr>
                                ) : (
                                    recentSubmissions.map((item) => (
                                        <tr
                                            key={item.id}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                                                {item.assignment?.title || 'Unknown Assignment'}
                                            </td>
                                            {isTeacher && (
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                                    {item.student?.name ||
                                                        item.student?.email ||
                                                        'Unknown Student'}
                                                </td>
                                            )}
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(item.submittedAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {gradingProgress[item.id]?.status === 'processing' ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full" />
                                                        <span className="text-sm text-indigo-600 dark:text-indigo-400 capitalize">
                                                            {gradingProgress[item.id].step || 'Processing'}
                                                        </span>
                                                    </div>
                                                ) : gradingProgress[item.id]?.status === 'failed' ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20">
                                                        Failed
                                                    </span>
                                                ) : (
                                                    <span
                                                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                                  ${
                                      item.status === 'GRADED'
                                          ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                                          : 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/20'
                                  }`}>
                                                        {item.status === 'GRADED' ? 'Graded' : 'Pending'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700 dark:text-gray-300">
                                                {item.score !== null ? `${item.score}/${item.assignment?.maxScore || 100}` : '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex gap-3 items-center">
                                                    <button
                                                        onClick={() => setSelectedSubmission(item)}
                                                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300">
                                                        View Summary
                                                    </button>
                                                    {isTeacher && (
                                                        <>
                                                            <button
                                                                onClick={() => handleReEvaluate(item.id)}
                                                                className="text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-300"
                                                                title="Re-evaluate">
                                                                Re-evaluate
                                                            </button>
                                                            <button
                                                                onClick={() => handleAllowResubmission(item.id)}
                                                                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                                                title="Delete & Allow Resubmission">
                                                                Delete
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <Dialog
                open={!!selectedSubmission}
                onOpenChange={(open) => !open && setSelectedSubmission(null)}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Submission Summary</DialogTitle>
                        <DialogDescription>
                            Detailed feedback and score for{' '}
                            {selectedSubmission?.assignment?.title || 'Assignment'}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedSubmission && (
                        <div className="space-y-6 mt-4">
                            <div>
                                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                                    Score
                                </h4>
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                                        {selectedSubmission.score}
                                    </span>
                                    <span className="text-gray-400">/ {selectedSubmission.assignment?.maxScore || 100}</span>
                                </div>
                            </div>

                            {isTeacher && (
                                <div>
                                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                                        Actions
                                    </h4>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => handleReEvaluate(selectedSubmission.id)}
                                            className="px-4 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-lg text-sm font-medium transition-colors border border-yellow-200">
                                            Re-evaluate (AI)
                                        </button>
                                        <button
                                            onClick={() => handleAllowResubmission(selectedSubmission.id)}
                                            className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-sm font-medium transition-colors border border-red-200">
                                            Delete & Allow Resubmission
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div>
                                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                                    Feedback
                                </h4>
                                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg text-sm prose dark:prose-invert max-w-none">
                                    <ReactMarkdown>
                                        {selectedSubmission.feedback || 'No feedback available.'}
                                    </ReactMarkdown>
                                </div>
                            </div>

                            <a
                                href={selectedSubmission.public_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full py-3 text-center border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium">
                                View Original PDF
                            </a>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Dashboard;
