import { Award, BarChart3, FolderClock, Search } from "lucide-react";
import React from "react";
import { useAppSelector } from "../app/store";
import { selectCurrentUser } from "../features/auth/authSlice";

interface Assignment {
  id: number;
  title: string;
  student: string;
  status: "Pending" | "Graded" | "Reviewing";
  score: string;
  date: string;
}

const Dashboard: React.FC = () => {
  const user = useAppSelector(selectCurrentUser);

  const assignments: Assignment[] = [
    {
      id: 1,
      title: "Adv. Algorithms Final",
      student: "Sarah Connor",
      status: "Pending",
      score: "-",
      date: "Oct 24",
    },
    {
      id: 2,
      title: "Database Design",
      student: "John Smith",
      status: "Graded",
      score: "94/100",
      date: "Oct 23",
    },
    {
      id: 3,
      title: "UI/UX Case Study",
      student: "Emily Blunt",
      status: "Graded",
      score: "88/100",
      date: "Oct 22",
    },
    {
      id: 4,
      title: "Network Security",
      student: "Michael Chang",
      status: "Reviewing",
      score: "-",
      date: "Oct 21",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#030712] text-gray-900 dark:text-gray-100 px-4 py-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
          <div>
            <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-500">
              Instructor Dashboard
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Overview for {user?.email}
            </p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search students..."
              className="pl-10 pr-4 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none w-full md:w-64 shadow-sm"
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white dark:bg-gradient-to-br dark:from-indigo-900/40 dark:to-indigo-900/10 border border-gray-200 dark:border-indigo-500/20 p-6 rounded-2xl shadow-sm dark:shadow-none">
            <div className="flex items-center gap-4 mb-2">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg">
                <FolderClock className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-gray-600 dark:text-gray-300 font-medium">
                To Grade
              </h3>
            </div>
            <p className="text-4xl font-bold text-gray-900 dark:text-white mt-2">
              12
            </p>
          </div>
          <div className="bg-white dark:bg-gradient-to-br dark:from-emerald-900/40 dark:to-emerald-900/10 border border-gray-200 dark:border-emerald-500/20 p-6 rounded-2xl shadow-sm dark:shadow-none">
            <div className="flex items-center gap-4 mb-2">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg">
                <Award className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-gray-600 dark:text-gray-300 font-medium">
                Graded This Week
              </h3>
            </div>
            <p className="text-4xl font-bold text-gray-900 dark:text-white mt-2">
              45
            </p>
          </div>
          <div className="bg-white dark:bg-gradient-to-br dark:from-purple-900/40 dark:to-purple-900/10 border border-gray-200 dark:border-purple-500/20 p-6 rounded-2xl shadow-sm dark:shadow-none">
            <div className="flex items-center gap-4 mb-2">
              <div className="p-2 bg-purple-100 dark:bg-purple-500/20 rounded-lg">
                <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-gray-600 dark:text-gray-300 font-medium">
                Avg Score
              </h3>
            </div>
            <p className="text-4xl font-bold text-gray-900 dark:text-white mt-2">
              78%
            </p>
          </div>
        </div>

        {/* Recent Table */}
        <div className="bg-white dark:bg-gray-900/30 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden backdrop-blur-sm shadow-sm dark:shadow-none">
          <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Submissions
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assignment
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-transparent">
                {assignments.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                      {item.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {item.student}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                            ${
                              item.status === "Graded"
                                ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                                : item.status === "Pending"
                                ? "bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/20"
                                : "bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20"
                            }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700 dark:text-gray-300">
                      {item.score}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
