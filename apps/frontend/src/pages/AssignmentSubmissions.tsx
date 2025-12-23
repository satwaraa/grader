import { User } from 'lucide-react';
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useParams } from 'react-router-dom';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '../components/ui/dialog';
import {
    useAllowResubmissionMutation,
    useGetAssignmentQuery,
    useGetAssignmentSubmissionsQuery,
    useReEvaluateSubmissionMutation,
} from '../features/assignments/assignmentApi';

const AssignmentSubmissions: React.FC = () => {
    const { assignmentId } = useParams<{ assignmentId: string }>();
    const [selectedSubmission, setSelectedSubmission] = useState<any>(null);

    const { data: assignmentData } = useGetAssignmentQuery(assignmentId || '', {
        skip: !assignmentId,
    });
    const { data: submissionsData, isLoading } = useGetAssignmentSubmissionsQuery(
        assignmentId || '',
        {
            skip: !assignmentId,
        }
    );

    const assignment = assignmentData?.data;
    const submissions = submissionsData?.data || [];

    const [reEvaluateSubmission] = useReEvaluateSubmissionMutation();
    const [allowResubmission] = useAllowResubmissionMutation();

    const handleReEvaluate = async (submissionId: string) => {
        try {
            await reEvaluateSubmission({ submissionId }).unwrap();
            alert('Submission queued for re-evaluation');
        } catch (error) {
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
        } catch (error) {
            alert('Failed to allow resubmission');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#030712] text-gray-900 dark:text-gray-100 px-4 py-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">
                        {assignment?.title || 'Assignment Submissions'}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        {submissions.length} submissions received
                    </p>
                </div>

                {isLoading ? (
                    <div className="text-center py-12">Loading submissions...</div>
                ) : (
                    <div className="space-y-4">
                        {submissions.length === 0 ? (
                            <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl text-center border border-gray-200 dark:border-gray-800">
                                <p className="text-gray-500">No submissions yet.</p>
                            </div>
                        ) : (
                            submissions.map((submission) => (
                                <div
                                    key={submission.id}
                                    className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-full">
                                            <User className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-lg">
                                                {submission.student?.name || 'Student'}
                                            </h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                Submitted:{' '}
                                                {new Date(
                                                    submission.submittedAt
                                                ).toLocaleDateString()}{' '}
                                                at{' '}
                                                {new Date(
                                                    submission.submittedAt
                                                ).toLocaleTimeString()}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 w-full sm:w-auto">
                                        <div className="text-right">
                                            <span
                                                className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                                                    submission.status === 'GRADED'
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                }`}>
                                                {submission.status}
                                            </span>
                                            {submission.score !== null && (
                                                <p className="text-sm font-bold mt-1">
                                                    Score: {submission.score}/100
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => setSelectedSubmission(submission)}
                                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors">
                                            View Summary
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            <Dialog
                open={!!selectedSubmission}
                onOpenChange={(open) => !open && setSelectedSubmission(null)}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Submission Summary</DialogTitle>
                        <DialogDescription>
                            Detailed feedback and score for {selectedSubmission?.student?.name}
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
                                    <span className="text-gray-400">/ 100</span>
                                </div>
                            </div>

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

export default AssignmentSubmissions;
