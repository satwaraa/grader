import { AlertCircle, ArrowLeft, CheckCircle, FileText, Upload } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MeshBackground from '../components/MeshBackground';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../components/ui/dialog';
import { useSocket } from '../context/SocketContext';
import {
    useGetAssignmentQuery,
    useLazyGetUploadUrlQuery,
    useSubmitAssignmentMutation,
    useVerifyOtpMutation,
} from '../features/assignments/assignmentApi';

const AssignmentUpload: React.FC = () => {
    const { assignmentId } = useParams<{ assignmentId: string }>();
    const navigate = useNavigate();
    const [file, setFile] = useState<File | null>(null);
    const [fileName, setFileName] = useState<string>();
    const [fileType, setFileType] = useState<string>();
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [fileError, setFileError] = useState<string>('');

    // Error Dialog state
    const [showErrorDialog, setShowErrorDialog] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // OTP Dialog state
    const [showOtpDialog, setShowOtpDialog] = useState(false);
    const [otp, setOtp] = useState('');
    const [otpError, setOtpError] = useState('');

    // Unique ID state
    const [studentUniqueId, setStudentUniqueId] = useState('');

    // Collapsible sections
    const [showRubric, setShowRubric] = useState(false);

    // Real-time grading state
    const { socket } = useSocket();
    const [progressLogs, setProgressLogs] = useState<string[]>([]);
    const [progressPercent, setProgressPercent] = useState(0);
    const [gradingStatus, setGradingStatus] = useState<
        'idle' | 'processing' | 'completed' | 'failed'
    >('idle');

    const [getUploadUrl] = useLazyGetUploadUrlQuery();
    const [verifyOtp, { isLoading: isVerifyingOtp }] = useVerifyOtpMutation();
    const { data: assignmentData, isLoading } = useGetAssignmentQuery(assignmentId || '', {
        skip: !assignmentId,
    });

    // const [createSubmission, { isLoading: isSubmitting }] = useCreateSubmissionMutation();
    const [markSubmission] = useSubmitAssignmentMutation();

    // Socket listener
    useEffect(() => {
        if (!socket) return;

        const handleProgress = (event: {
            error?: string;
            percent?: number;
            step?: string;
            page?: number;
            total_pages?: number;
            score?: number;
            maxScore?: number;
        }) => {
            // console.log('Progress Event:', event);

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
                    logMessage = `🎉 Grading completed! Score: ${event.score}/${event.maxScore || 100}`;
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
        setFileError('');
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];

            // Only allow PDF files
            if (selectedFile.type !== 'application/pdf') {
                setFileError('Only PDF files are allowed');
                setFile(null);
                setFileName(undefined);
                setFileType(undefined);
                return;
            }

            setFileName(selectedFile.name);
            setFileType(selectedFile.type);
            setFile(selectedFile);
        }
    };

    const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 4);
        setOtp(value);
        setOtpError('');
    };

    const handleUploadClick = () => {
        if (!file) return;

        // Validate unique ID if required
        if (assignmentData?.data?.requireUniqueId && !studentUniqueId.trim()) {
            setErrorMessage('University ID is required for this assignment.');
            setShowErrorDialog(true);
            return;
        }

        setShowOtpDialog(true);
    };

    const handleOtpSubmit = async () => {
        if (otp.length !== 4) {
            setOtpError('Please enter a 4-digit OTP');
            return;
        }

        try {
            if (!assignmentId) return;

            // 1. Verify OTP
            await verifyOtp({ assignmentId, otp }).unwrap();

            // 2. Get Upload URL
            if (file && fileName && fileType) {
                const urlData = await getUploadUrl({
                    fileName: fileName,
                    type: fileType,
                    assignmentId,
                }).unwrap();

                // setUploadData(urlData);
                setShowOtpDialog(false);

                // 3. Upload
                await performUpload(urlData);
            }
        } catch (err: unknown) {
            const apiError = err as { data?: { message?: string }; error?: string; status?: number };
            console.error('Verification or Upload failed', err);
            const backendMessage = apiError?.data?.message || apiError?.error;

            if (backendMessage === 'You can only make One Submission') {
                setShowOtpDialog(false);
                setErrorMessage(backendMessage);
                setShowErrorDialog(true);
                return;
            }

            if (apiError?.status === 403 || backendMessage === 'invalid otp') {
                setOtpError('Invalid OTP');
            } else {
                setOtpError('Verification failed. Please try again.');
            }
        }
    };

    const performUpload = async (currentUploadData: { url: string; key: string }) => {
        if (!file || !currentUploadData) return;

        setIsUploading(true);
        setUploadProgress(0);

        try {
            console.log('Starting upload...');

            // Use XMLHttpRequest for progress tracking
            const uploadSuccess = await new Promise<boolean>((resolve, reject) => {
                const xhr = new XMLHttpRequest();

                xhr.upload.addEventListener('progress', (event) => {
                    if (event.lengthComputable) {
                        const percent = Math.round((event.loaded / event.total) * 100);
                        setUploadProgress(percent);
                    }
                });

                xhr.addEventListener('load', () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                });

                xhr.addEventListener('error', () => reject(new Error('Upload failed')));
                xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

                xhr.open('PUT', currentUploadData.url);
                xhr.setRequestHeader('Content-Type', file.type);
                xhr.send(file);
            });

            if (uploadSuccess) {
                console.log('Upload successful!');
                setUploadProgress(100);

                if (assignmentId) {
                    try {
                        const res = await markSubmission({
                            assignmentId,
                            otp,
                            studentUniqueId: studentUniqueId || undefined,
                        }).unwrap();
                        console.log('Submission created:', res);
                        const submissionId = res.data?.id;

                        if (socket && submissionId) {
                            setGradingStatus('processing');
                            setProgressLogs(['🚀 Submission received, starting grading...']);
                            socket.emit('watch-submission', submissionId);
                        }

                        setIsSubmitted(true);
                    } catch (err) {
                        console.error('Failed to mark submission:', err);
                        const message =
                            (err as { data?: { message?: string }; message?: string })?.data?.message ||
                            (err as { message?: string })?.message ||
                            'You cannot submit this assignment again.';
                        setErrorMessage(message);
                        setShowErrorDialog(true);
                    }
                }
            } else {
                console.error('Upload failed.');
                setErrorMessage('File upload failed. Please try again.');
                setShowErrorDialog(true);
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            const message =
                error instanceof Error
                    ? error.message
                    : 'Unexpected error while uploading. Please try again.';
            setErrorMessage(message);
            setShowErrorDialog(true);
        } finally {
            setIsUploading(false);
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
            <div className="min-h-screen bg-gray-50 dark:bg-[#030712] flex items-center justify-center px-4 relative overflow-hidden">
                <MeshBackground />
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

                    <div className="mt-8 flex justify-center">
                        <button
                            type="button"
                            onClick={() => navigate('/dashboard')}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            <ArrowLeft className="h-4 w-4" />
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#030712] py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300 relative overflow-hidden">
            <MeshBackground />
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

                    <div className="p-6">
                        {/* Compact Instructions */}
                        <div className="mb-4">
                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                                Instructions
                            </h3>
                            <p className="text-gray-700 dark:text-gray-300 text-sm">
                                {assignment.description || 'No instructions provided.'}
                            </p>
                        </div>

                        {/* Collapsible Rubric */}
                        {assignment.rubric && (
                            <div className="mb-4">
                                <button
                                    type="button"
                                    onClick={() => setShowRubric(!showRubric)}
                                    className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-900 dark:text-white py-2 px-3 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                                    <span>Grading Rubric: {assignment.rubric.name} ({assignment.rubric.criteria.reduce((sum: number, c: { points: number }) => sum + c.points, 0)} pts)</span>
                                    <span className="text-gray-500">{showRubric ? '▼' : '▶'}</span>
                                </button>
                                {showRubric && (
                                    <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                                        {assignment.rubric.criteria.map(
                                            (criterion: { name: string; description: string; points: number }, index: number) => (
                                                <div
                                                    key={index}
                                                    className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                                                            {criterion.name}
                                                        </h4>
                                                        <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium rounded-full">
                                                            {criterion.points} pts
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        {criterion.description}
                                                    </p>
                                                </div>
                                            )
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Unique ID Input (if required) */}
                        {assignment.requireUniqueId && (
                            <div className="mb-4">
                                <label htmlFor="studentUniqueId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    University ID <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="studentUniqueId"
                                    value={studentUniqueId}
                                    onChange={(e) => setStudentUniqueId(e.target.value)}
                                    placeholder="Enter your University ID"
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    required
                                />
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 text-center hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors bg-gray-50 dark:bg-gray-800/30">
                                <input
                                    type="file"
                                    id="file-upload"
                                    className="hidden"
                                    onChange={handleFileChange}
                                    accept=".pdf,application/pdf"
                                    disabled={isUploading}
                                    required
                                />
                                <label
                                    htmlFor="file-upload"
                                    className={`flex flex-col items-center justify-center ${isUploading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                                    {file ? (
                                        <>
                                            <FileText className="h-12 w-12 text-indigo-600 dark:text-indigo-400 mb-3" />
                                            <span className="text-lg font-medium text-gray-900 dark:text-white">
                                                {file.name}
                                            </span>
                                            <span className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                {(file.size / 1024 / 1024).toFixed(2)} MB
                                            </span>
                                            {!isUploading && (
                                                <span className="text-sm text-indigo-600 dark:text-indigo-400 mt-4 hover:underline">
                                                    Change file
                                                </span>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="h-12 w-12 text-gray-400 dark:text-gray-500 mb-3" />
                                            <span className="text-lg font-medium text-gray-900 dark:text-white">
                                                Click to upload or drag and drop
                                            </span>
                                            <span className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                PDF files only, up to 10MB
                                            </span>
                                        </>
                                    )}
                                </label>
                                {fileError && (
                                    <p className="text-sm text-red-500 mt-2">{fileError}</p>
                                )}
                            </div>

                            {/* Upload Progress Bar */}
                            {isUploading && (
                                <div className="mt-4">
                                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                                        <span>Uploading...</span>
                                        <span>{uploadProgress}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                        <div
                                            className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                                            style={{ width: `${uploadProgress}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-4">
                                {/* <button
                                    type="button"
                                    onClick={handleUploadClick}
                                    disabled={!file || !uploadData}
                                    className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2">
                                    <Upload className="h-5 w-5" />
                                    Upload File
                                </button> */}
                                <button
                                    type="button"
                                    onClick={handleUploadClick}
                                    disabled={!file || isUploading}
                                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2">
                                    {isUploading ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Uploading... {uploadProgress}%
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="h-5 w-5" />
                                            Submit Assignment
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* OTP Dialog */}
                <Dialog open={showOtpDialog} onOpenChange={setShowOtpDialog}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Enter OTP</DialogTitle>
                            <DialogDescription>
                                Please enter the 4-digit OTP to verify and submit your assignment.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex flex-col gap-4 py-4">
                            <div className="flex flex-col gap-2">
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="\d{4}"
                                    maxLength={4}
                                    value={otp}
                                    onChange={handleOtpChange}
                                    placeholder="Enter 4-digit OTP"
                                    className="w-full px-4 py-3 text-center text-2xl tracking-widest border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white"
                                    autoFocus
                                />
                                {otpError && <p className="text-sm text-red-500">{otpError}</p>}
                            </div>
                        </div>
                        <DialogFooter>
                            <button
                                type="button"
                                onClick={() => setShowOtpDialog(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleOtpSubmit}
                                disabled={otp.length !== 4 || isVerifyingOtp}
                                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors">
                                {isVerifyingOtp ? 'Verifying...' : 'Verify & Submit'}
                            </button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Error Dialog */}
                <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                                <AlertCircle className="h-5 w-5" />
                                Submission Not Allowed
                            </DialogTitle>
                            <DialogDescription>
                                {errorMessage || 'You cannot submit this assignment again.'}
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <button
                                type="button"
                                onClick={() => setShowErrorDialog(false)}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                                Okay
                            </button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
};

export default AssignmentUpload;
