import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  ArrowLeft,
  CheckCircle2,
  Users,
  ShieldAlert,
  Layers,
  AlertTriangle,
} from 'lucide-react';
import { LiveSession } from '../types/index.ts';
import { sessionStore } from '../services/storage.ts';
import { exportGradebookCsv } from '../logic/sessionRules.ts';

interface ResultsGradebookPageProps {
  sessionId: string;
  onNavigate: (route: string) => void;
}

export const ResultsGradebookPage: React.FC<ResultsGradebookPageProps> = ({
  sessionId,
  onNavigate,
}) => {
  const [session, setSession] = useState<LiveSession | undefined>(() =>
    sessionStore.getSession(sessionId)
  );

  useEffect(() => {
    const s = sessionStore.getSession(sessionId);
    if (s) {
      setSession(s);
    }
  }, [sessionId]);

  if (!session) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-zinc-500 font-normal">
        Session data not found.
      </div>
    );
  }

  const participantsList = Object.values(session.participants || {});
  const totalStudents = participantsList.length;
  const totalViolations = session.violations.length;
  const totalResponses = session.responses.length;
  const correctResponses = session.responses.filter(r => r.isCorrect).length;
  const averageAccuracy = totalResponses > 0
    ? Math.round((correctResponses / totalResponses) * 100)
    : 0;

  const handleDownloadCsv = () => {
    const csvContent = exportGradebookCsv(session);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `ClassLock_${session.joinCode}_Gradebook_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-white py-16 px-6 sm:px-10 font-normal">
      <div className="max-w-5xl mx-auto">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-12 pb-8 border-b border-zinc-200/80">
          <div>
            <button
              onClick={() => onNavigate('/dashboard')}
              className="inline-flex items-center gap-1.5 text-xs font-normal text-zinc-500 hover:text-zinc-900 mb-3 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Presentations</span>
            </button>
            <h1 className="text-3xl font-semibold text-zinc-950 tracking-tight">
              Session Gradebook &amp; Analytics
            </h1>
            <div className="flex items-center gap-2 text-xs text-zinc-500 mt-2 font-normal">
              <span className="font-mono font-semibold text-blue-600">{session.joinCode}</span>
              <span aria-hidden="true">·</span>
              <span>{session.presentationTitle}</span>
              <span aria-hidden="true">·</span>
              <span>Hosted by {session.teacherName}</span>
            </div>
          </div>

          <button
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Gradebook CSV</span>
          </button>
        </div>

        {/* Stats Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-zinc-50/50 rounded-xl p-6 border border-zinc-200/90">
            <div className="flex items-center gap-2 text-zinc-500 text-xs font-normal mb-2">
              <Users className="w-4 h-4 text-zinc-700" />
              <span>Total Students</span>
            </div>
            <div className="text-3xl font-semibold text-zinc-950 font-mono tabular-nums">{totalStudents}</div>
          </div>

          <div className="bg-zinc-50/50 rounded-xl p-6 border border-zinc-200/90">
            <div className="flex items-center gap-2 text-zinc-500 text-xs font-normal mb-2">
              <CheckCircle2 className="w-4 h-4 text-zinc-700" />
              <span>Accuracy</span>
            </div>
            <div className="text-3xl font-semibold text-zinc-950 font-mono tabular-nums">{averageAccuracy}%</div>
          </div>

          <div className="bg-zinc-50/50 rounded-xl p-6 border border-zinc-200/90">
            <div className="flex items-center gap-2 text-zinc-500 text-xs font-normal mb-2">
              <ShieldAlert className="w-4 h-4 text-zinc-700" />
              <span>Focus Infractions</span>
            </div>
            <div className="text-3xl font-semibold text-zinc-950 font-mono tabular-nums">{totalViolations}</div>
          </div>

          <div className="bg-zinc-50/50 rounded-xl p-6 border border-zinc-200/90">
            <div className="flex items-center gap-2 text-zinc-500 text-xs font-normal mb-2">
              <Layers className="w-4 h-4 text-zinc-700" />
              <span>Lockdown Mode</span>
            </div>
            <div className="text-2xl font-semibold text-zinc-950 capitalize">
              {session.lockMode}
            </div>
          </div>
        </div>

        {/* Gradebook Table */}
        <div className="bg-white rounded-2xl border border-zinc-200/90 overflow-hidden mb-12">
          <div className="p-6 border-b border-zinc-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
              <h2 className="font-semibold text-zinc-900 text-sm">Student Attendance &amp; Score Register</h2>
            </div>
            <span className="text-xs text-zinc-500 font-mono tabular-nums">
              {participantsList.length} records
            </span>
          </div>

          {participantsList.length === 0 ? (
            <div className="py-16 text-center text-zinc-400 text-sm">
              No students were recorded in this session.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 border-b border-zinc-200/80 text-zinc-500 text-xs font-semibold">
                  <tr>
                    <th className="px-6 py-3.5">Student</th>
                    <th className="px-6 py-3.5">Student ID</th>
                    <th className="px-6 py-3.5 text-center">Score</th>
                    <th className="px-6 py-3.5 text-center">Questions</th>
                    <th className="px-6 py-3.5 text-center">Accuracy</th>
                    <th className="px-6 py-3.5 text-center">Violations</th>
                    <th className="px-6 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-normal">
                  {participantsList
                    .sort((a, b) => b.score - a.score)
                    .map((p, idx) => {
                      const studentResponses = session.responses.filter(r => r.studentId === p.id);
                      const answered = studentResponses.length;
                      const correct = studentResponses.filter(r => r.isCorrect).length;
                      const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0;

                      return (
                        <tr key={p.id} className="hover:bg-zinc-50/50 transition-colors">
                          <td className="px-6 py-3.5">
                            <div>
                              <span className="font-semibold text-zinc-900 block">{p.name}</span>
                              {idx === 0 && p.score > 0 && (
                                <span className="text-[10px] text-blue-600 font-semibold">
                                  Top Performer
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-3.5 font-mono text-xs text-zinc-500 tabular-nums">
                            {p.studentIdNumber || 'N/A'}
                          </td>
                          <td className="px-6 py-3.5 text-center font-mono font-semibold text-blue-600 tabular-nums">
                            {p.score} pts
                          </td>
                          <td className="px-6 py-3.5 text-center text-xs text-zinc-600 font-mono tabular-nums">
                            {answered} answered ({correct} correct)
                          </td>
                          <td className="px-6 py-3.5 text-center font-mono tabular-nums text-xs text-zinc-700">
                            {accuracy}%
                          </td>
                          <td className="px-6 py-3.5 text-center font-mono tabular-nums">
                            {p.violationCount > 0 ? (
                              <span className="text-xs text-zinc-900 font-semibold">
                                {p.violationCount} infraction{p.violationCount === 1 ? '' : 's'}
                              </span>
                            ) : (
                              <span className="text-xs text-zinc-400">
                                Clean (0)
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-3.5">
                            <span className="text-xs text-zinc-700">
                              {p.isLockedOut ? 'Locked Out' : 'Active'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Focus Violation Timeline Log */}
        {session.violations.length > 0 && (
          <div className="bg-white rounded-2xl border border-zinc-200/90 p-6 sm:p-8">
            <h3 className="font-semibold text-zinc-900 text-sm mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-zinc-700" />
              <span>Detailed Focus Infractions Log</span>
            </h3>

            <div className="space-y-2">
              {session.violations.map(v => (
                <div
                  key={v.id}
                  className="p-3 bg-zinc-50/50 border border-zinc-200/80 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                    <div>
                      <span className="font-semibold text-zinc-900">{v.studentName}</span>
                      <span className="text-zinc-500 ml-2">
                        {v.type === 'tab_switched' && 'Left classroom tab'}
                        {v.type === 'fullscreen_exited' && 'Exited fullscreen'}
                        {v.type === 'window_blur' && 'Window blur / defocus'}
                        {v.type === 'shortcut_attempt' && 'Shortcut blocked'}
                      </span>
                    </div>
                  </div>
                  <span className="text-zinc-400 font-mono tabular-nums">
                    {new Date(v.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
