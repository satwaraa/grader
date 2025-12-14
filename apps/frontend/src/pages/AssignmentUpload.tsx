import { CheckCircle, FileText, Upload } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import {
    useCreateSubmissionMutation,
    useGetAssignmentQuery,
    useLazyGetUploadUrlQuery,
    useSubmitAssignmentMutation,
} from '../features/assignments/assignmentApi';

const AssignmentUpload: React.FC = () => {
    const { assignmentId } = useParams<{ assignmentId: string }>();
    const [file, setFile] = useState<File | null>(null);
    const [fileName, setFileName] = useState<string>();
    const [fileType, setFileType] = useState<string>();
    const [uploadData, setUploadData] = useState<{
        url: string;
        key: string;
    } | null>(null);
    const [isSubmitted, setIsSubmitted] = useState(false);

    // Real-time grading state
    const { socket } = useSocket();
    const [progressLogs, setProgressLogs] = useState<string[]>([]);
    const [progressPercent, setProgressPercent] = useState(0);
    const [gradingStatus, setGradingStatus] = useState<
        'idle' | 'processing' | 'completed' | 'failed'
    >('idle');

    const [getUploadUrl] = useLazyGetUploadUrlQuery();
    const { data: assignmentData, isLoading } = useGetAssignmentQuery(assignmentId || '', {
        skip: !assignmentId,
    });
    useEffect(() => {
        if (fileName && fileType) {
            console.log('getting url');
            if (assignmentId) {
                getUploadUrl({ fileName: fileName, type: fileType, assignmentId })
                    .unwrap()
                    .then((data) => {
                        console.log(data);
                        setUploadData(data);
                    })
                    .catch((err) => console.log(err));
            }
        }
    }, [fileName, fileType]);

    const [createSubmission, { isLoading: isSubmitting }] = useCreateSubmissionMutation();
    const [markSubmission] = useSubmitAssignmentMutation();

    // Socket listener
    useEffect(() => {
        if (!socket) return;

        const handleProgress = (event: any) => {
            console.log('Progress Event:', event);

            if (event.error) {
                setGradingStatus('failed');
                setProgressLogs((prev) => [...prev, `❌ Error: ${event.error}`]);
                return;
            }

            if (event.percent) setProgressPercent(event.percent);

            let logMessage = '';
            switch (event.step) {
                case 'submission_started':
                    logMessage = '🚀 Starting submission processing...';
                    break;
                case 'downloading_pdf':
                    logMessage = '⬇️ Downloading assignment file...';
                    break;
                case 'pdf_downloaded':
                    logMessage = '✅ Download complete.';
                    break;
                case 'parsing_started':
                    logMessage = '📄 Analyzing document structure...';
                    break;
                case 'page_parsed':
                    logMessage = `📄 Reading page ${event.page}/${event.total_pages}...`;
                    break;
                case 'parsing_completed':
                    logMessage = '✅ Document analysis complete.';
                    break;
                case 'gemini_started':
                    logMessage = '🤖 AI Grader initialized.';
                    break;
                case 'gemini_processing':
                    logMessage = '🧠 Evaluating content and generating feedback...';
                    break;
                case 'gemini_completed':
                    logMessage = '✨ AI evaluation finished.';
                    break;
                case 'grading_completed':
                    logMessage = `🎉 Grading completed! Score: ${event.score}/100`;
                    setGradingStatus('completed');
                    break;
                default:
                    if (event.step) logMessage = `ℹ️ ${event.step}`;
            }

            if (logMessage) {
                setProgressLogs((prev) => [...prev, logMessage]);
            }
        };

        socket.on('submission-progress', handleProgress);

        return () => {
            socket.off('submission-progress', handleProgress);
        };
    }, [socket]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            // console.log(e.target.files[0]);
            setFileName(e.target.files[0].name);
            setFileType(e.target.files[0].type);
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file || !uploadData) return;

        try {
            console.log('Starting upload...');
            const response = await fetch(uploadData.url, {
                method: 'PUT',
                body: file,
                headers: {
                    'Content-Type': file.type,
                },
            });

            if (response.ok) {
                console.log('Upload successful!');
                if (assignmentId) {
                    try {
                        const res = await markSubmission({ assignmentId }).unwrap();
                        console.log('Submission created:', res);
                        // Assuming res.data contains the submission object with id
                        const submissionId = res.data?.id;

                        if (socket && submissionId) {
                            setGradingStatus('processing');
                            setProgressLogs(['🚀 Submission received, starting grading...']);
                            socket.emit('watch-submission', submissionId);
                        }

                        setIsSubmitted(true);
                    } catch (err) {
                        console.error('Failed to mark submission:', err);
                    }
                }
            } else {
                console.error('Upload failed.');
            }
        } catch (error) {
            console.error('Error uploading file:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // This seems to be an alternative submit method, but handleUpload seems to be the main one for file upload
        // Keeping it as is for now, but handleUpload is where we integrated the logic
        if (!file || !assignmentId) return;

        try {
            const content = `File: ${file.name} (Size: ${file.size} bytes)`;
            console.log({
                assignmentId,
                content,
            });
            await createSubmission({
                assignmentId,
                content,
            }).unwrap();

            setIsSubmitted(true);
        } catch (error) {
            console.error('Failed to submit assignment', error);
            alert('Failed to submit assignment');
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                Loading assignment details...
            </div>
        );
    }

    if (!assignmentData?.data) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                Assignment not found
            </div>
        );
    }

    const assignment = assignmentData.data;

    if (isSubmitted) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#030712] flex items-center justify-center px-4">
                <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-xl text-center max-w-md w-full border border-gray-200 dark:border-gray-800">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Submission Received!
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                        Your assignment has been successfully uploaded.
                    </p>

                    {gradingStatus !== 'idle' && (
                        <div className="mt-6 text-left">
                            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                                Grading Progress
                            </h3>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-4">
                                <div
                                    className={`h-2.5 rounded-full transition-all duration-500 ${
                                        gradingStatus === 'failed' ? 'bg-red-600' : 'bg-blue-600'
                                    }`}
                                    style={{ width: `${progressPercent}%` }}></div>
                            </div>
                            <div className="h-48 overflow-y-auto bg-gray-50 dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 text-sm font-mono text-gray-700 dark:text-gray-300">
                                {progressLogs.map((log, i) => (
                                    <div key={i} className="mb-1">
                                        {log}
                                    </div>
                                ))}
                                {gradingStatus === 'processing' && (
                                    <div className="animate-pulse">...</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#030712] py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
            <div className="max-w-3xl mx-auto">
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="px-8 py-6 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {assignment.title}
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            Due Date:{' '}
                            {assignment.dueDate
                                ? new Date(assignment.dueDate).toLocaleDateString()
                                : 'No due date'}
                        </p>
                    </div>

                    <div className="p-8">
                        <div className="mb-8">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                Instructions
                            </h3>
                            <p className="text-gray-600 dark:text-gray-300">
                                {assignment.description || 'No instructions provided.'}
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 text-center hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors bg-gray-50 dark:bg-gray-800/30">
                                <input
                                    type="file"
                                    id="file-upload"
                                    className="hidden"
                                    onChange={handleFileChange}
                                    required
                                />
                                <label
                                    htmlFor="file-upload"
                                    className="cursor-pointer flex flex-col items-center justify-center">
                                    {file ? (
                                        <>
                                            <FileText className="h-12 w-12 text-indigo-600 dark:text-indigo-400 mb-3" />
                                            <span className="text-lg font-medium text-gray-900 dark:text-white">
                                                {file.name}
                                            </span>
                                            <span className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                {(file.size / 1024 / 1024).toFixed(2)} MB
                                            </span>
                                            <span className="text-sm text-indigo-600 dark:text-indigo-400 mt-4 hover:underline">
                                                Change file
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="h-12 w-12 text-gray-400 dark:text-gray-500 mb-3" />
                                            <span className="text-lg font-medium text-gray-900 dark:text-white">
                                                Click to upload or drag and drop
                                            </span>
                                            <span className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                PDF, DOCX, ZIP up to 10MB
                                            </span>
                                        </>
                                    )}
                                </label>
                            </div>

                            <div className="flex justify-end gap-4">
                                <button
                                    type="button"
                                    onClick={handleUpload}
                                    disabled={!file || !uploadData}
                                    className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2">
                                    <Upload className="h-5 w-5" />
                                    Upload File
                                </button>
                                <button
                                    type="submit"
                                    disabled={!file || isSubmitting}
                                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2">
                                    <CheckCircle className="h-5 w-5" />
                                    {isSubmitting ? 'Submitting...' : 'Submit Assignment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssignmentUpload;
