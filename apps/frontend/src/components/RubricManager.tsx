import { Award, Edit, Plus, Trash2, X } from 'lucide-react';
import React, { useState } from 'react';
import {
    useCreateRubricMutation,
    useDeleteRubricMutation,
    useGetRubricsQuery,
    useUpdateRubricMutation,
} from '../features/rubrics/rubricApi';
import type { RubricCriterion } from '../types';

const RubricManager: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { data: rubricsData, isLoading } = useGetRubricsQuery();
    const [createRubric, { isLoading: isCreating }] = useCreateRubricMutation();
    const [updateRubric, { isLoading: isUpdating }] = useUpdateRubricMutation();
    const [deleteRubric] = useDeleteRubricMutation();

    const isSubmitting = isCreating || isUpdating;

    const [isCreatingNew, setIsCreatingNew] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [criteria, setCriteria] = useState<RubricCriterion[]>([
        { name: '', description: '', points: 10 },
    ]);

    const handleAddCriterion = () => {
        setCriteria([...criteria, { name: '', description: '', points: 10 }]);
    };

    const handleRemoveCriterion = (index: number) => {
        setCriteria(criteria.filter((_, i) => i !== index));
    };

    const handleCriterionChange = (
        index: number,
        field: keyof RubricCriterion,
        value: string | number
    ) => {
        const newCriteria = [...criteria];
        newCriteria[index] = { ...newCriteria[index], [field]: value };
        setCriteria(newCriteria);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await updateRubric({ id: editingId, name, criteria }).unwrap();
                alert('Rubric updated successfully');
            } else {
                await createRubric({ name, criteria }).unwrap();
                alert('Rubric created successfully');
            }
            resetForm();
        } catch (error) {
            console.error('Failed to save rubric', error);
            alert('Failed to save rubric');
        }
    };

    const handleEdit = (rubric: { id: string; name: string; criteria: RubricCriterion[] }) => {
        setEditingId(rubric.id);
        setName(rubric.name);
        setCriteria(rubric.criteria);
        setIsCreatingNew(true);
    };

    const resetForm = () => {
        setIsCreatingNew(false);
        setEditingId(null);
        setName('');
        setCriteria([{ name: '', description: '', points: 10 }]);
    };

    const handleNewRubric = () => {
        resetForm();
        setIsCreatingNew(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this rubric?')) {
            try {
                setDeletingId(id);
                await deleteRubric(id).unwrap();
                if (editingId === id) {
                    resetForm();
                }
            } catch (error) {
                console.error('Failed to delete rubric', error);
                alert('Failed to delete rubric');
            } finally {
                setDeletingId(null);
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-4xl shadow-xl border border-gray-200 dark:border-gray-800 flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Manage Rubrics</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    {/* Sidebar List */}
                    <div className="w-full md:w-1/3 border-r border-gray-200 dark:border-gray-800 p-4 overflow-y-auto">
                        <button
                            onClick={handleNewRubric}
                            className="w-full mb-4 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors">
                            <Plus className="h-4 w-4" /> New Rubric
                        </button>

                        {isLoading ? (
                            <p className="text-center text-gray-500">Loading...</p>
                        ) : (
                            <div className="space-y-2">
                                {rubricsData?.data.map((rubric) => (
                                    <div
                                        key={rubric.id}
                                        className={`p-3 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 flex justify-between items-center group ${
                                            editingId === rubric.id
                                                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                                                : ''
                                        }`}>
                                        <div
                                            className="flex-1 cursor-pointer"
                                            onClick={() => handleEdit(rubric)}>
                                            <h4 className="font-medium">{rubric.name}</h4>
                                            <p className="text-xs text-gray-500">
                                                {rubric.criteria.length} criteria
                                            </p>
                                        </div>
                                        <div className="flex gap-1 transition-opacity">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEdit(rubric);
                                                }}
                                                disabled={deletingId === rubric.id}
                                                className="p-1 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded disabled:opacity-50">
                                                <Edit className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(rubric.id);
                                                }}
                                                disabled={deletingId === rubric.id}
                                                className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-50">
                                                {deletingId === rubric.id ? (
                                                    <div className="h-4 w-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <Trash2 className="h-4 w-4" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 p-6 overflow-y-auto">
                        {isCreatingNew ? (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-semibold">
                                        {editingId ? 'Edit Rubric' : 'Create New Rubric'}
                                    </h3>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">
                                        Rubric Name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent"
                                        placeholder="e.g., Essay Grading Rubric"
                                    />
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-semibold">Criteria</h3>
                                        <button
                                            type="button"
                                            onClick={handleAddCriterion}
                                            className="text-sm text-blue-600 hover:text-blue-500 flex items-center gap-1">
                                            <Plus className="h-4 w-4" /> Add Criterion
                                        </button>
                                    </div>

                                    {criteria.map((criterion, index) => (
                                        <div
                                            key={index}
                                            className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30 space-y-3 relative group">
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveCriterion(index)}
                                                className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <X className="h-4 w-4" />
                                            </button>

                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                <div className="md:col-span-3">
                                                    <input
                                                        type="text"
                                                        required
                                                        value={criterion.name}
                                                        onChange={(e) =>
                                                            handleCriterionChange(
                                                                index,
                                                                'name',
                                                                e.target.value
                                                            )
                                                        }
                                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                                                        placeholder="Criterion Name (e.g., Clarity)"
                                                    />
                                                </div>
                                                <div>
                                                    <input
                                                        type="number"
                                                        required
                                                        min="1"
                                                        value={criterion.points}
                                                        onChange={(e) =>
                                                            handleCriterionChange(
                                                                index,
                                                                'points',
                                                                parseInt(e.target.value)
                                                            )
                                                        }
                                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                                                        placeholder="Points"
                                                    />
                                                </div>
                                            </div>
                                            <textarea
                                                required
                                                value={criterion.description}
                                                onChange={(e) =>
                                                    handleCriterionChange(
                                                        index,
                                                        'description',
                                                        e.target.value
                                                    )
                                                }
                                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                                                placeholder="Description of what constitutes full points..."
                                                rows={2}
                                            />
                                        </div>
                                    ))}
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        disabled={isSubmitting}
                                        className="px-4 py-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 disabled:opacity-50">
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2">
                                        {isSubmitting && (
                                            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        )}
                                        {isSubmitting ? 'Saving...' : editingId ? 'Update Rubric' : 'Save Rubric'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-500">
                                <Award className="h-16 w-16 mb-4 opacity-20" />
                                <p>Select "New Rubric" to create a grading rubric.</p>
                                <p className="text-sm mt-2">
                                    Or select an existing rubric to edit.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RubricManager;
