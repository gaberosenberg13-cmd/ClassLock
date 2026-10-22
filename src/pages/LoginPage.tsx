import React, { useState } from 'react';
import { Mail, Lock, User, School, ArrowRight, Check } from 'lucide-react';
import { TeacherProfile } from '../types/index.ts';
import { sessionStore } from '../services/storage.ts';

interface LoginPageProps {
  onSuccess: (teacher: TeacherProfile) => void;
  onNavigate: (route: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess, onNavigate }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('teacher@classlock.edu');
  const [password, setPassword] = useState('password123');
  const [name, setName] = useState('Prof. Sarah Jenkins');
  const [school, setSchool] = useState('Roosevelt High Science Dept');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }

    const teacher: TeacherProfile = {
      id: isSignUp ? `teacher-${Date.now()}` : 'teacher-demo-1',
      email: email.trim(),
      name: isSignUp ? name.trim() || 'Instructor' : 'Prof. Sarah Jenkins',
      school: isSignUp ? school.trim() || 'ClassLock Academy' : 'Roosevelt High Science Dept',
    };

    sessionStore.setTeacher(teacher);
    onSuccess(teacher);
    onNavigate('/dashboard');
  };

  const handleDemoSignIn = () => {
    const demoTeacher: TeacherProfile = {
      id: 'teacher-demo-1',
      email: 'teacher@classlock.edu',
      name: 'Prof. Sarah Jenkins',
      school: 'Roosevelt High Science Dept',
    };
    sessionStore.setTeacher(demoTeacher);
    onSuccess(demoTeacher);
    onNavigate('/dashboard');
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center bg-[#faf8f5] text-[#171614] py-16 px-6 sm:px-8 font-normal">
      <div className="max-w-md w-full bg-white border border-[#171614] p-8 sm:p-10 shadow-[6px_6px_0px_0px_#171614]">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-xs text-[#eb4b26] uppercase tracking-widest">
              § Instructor Portal
            </span>
            <span className="text-[#a09a8f]">/</span>
            <span className="font-mono text-xs text-[#6e6961]">
              Desk Access
            </span>
          </div>
          <h1 className="font-serif italic text-3xl text-[#171614] tracking-tight">
            {isSignUp ? 'Open New Instructor Desk' : 'Sign in to Instructor Desk'}
          </h1>
          <p className="font-mono text-xs text-[#6e6961] mt-2 leading-relaxed">
            Manage your presentations, launch live synchronized sessions, and download unvarnished gradebooks.
          </p>
        </div>

        {/* 1-Click Demo Teacher Login button */}
        <div className="mb-6">
          <button
            type="button"
            onClick={handleDemoSignIn}
            className="w-full inline-flex items-center justify-center gap-2 p-3 bg-[#faf8f5] hover:bg-[#f0ede6] border border-[#e5e0d8] text-[#171614] font-mono text-xs uppercase tracking-wider font-semibold transition-colors cursor-pointer"
          >
            <Check className="w-3.5 h-3.5 text-[#eb4b26]" />
            <span>1-Click Sign In as Demo Teacher</span>
          </button>
          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#e5e0d8]" />
            </div>
            <span className="relative px-3 bg-white font-mono text-[11px] text-[#a09a8f] uppercase tracking-wider">
              or enter credentials
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-[#faf8f5] border border-[#eb4b26] font-mono text-xs text-[#eb4b26]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <>
              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-[#6e6961] mb-1.5">
                  Full Name & Title
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#a09a8f] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Prof. Sarah Jenkins"
                    className="w-full pl-9 pr-3 py-2 text-xs font-sans bg-[#faf8f5] border border-[#e5e0d8] focus:border-[#eb4b26] text-[#171614] focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-[#6e6961] mb-1.5">
                  School / Institution
                </label>
                <div className="relative">
                  <School className="w-4 h-4 text-[#a09a8f] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={school}
                    onChange={e => setSchool(e.target.value)}
                    placeholder="Roosevelt High Science Dept"
                    className="w-full pl-9 pr-3 py-2 text-xs font-sans bg-[#faf8f5] border border-[#e5e0d8] focus:border-[#eb4b26] text-[#171614] focus:outline-hidden"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-[#6e6961] mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#a09a8f] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="teacher@school.edu"
                className="w-full pl-9 pr-3 py-2 text-xs font-sans bg-[#faf8f5] border border-[#e5e0d8] focus:border-[#eb4b26] text-[#171614] focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-[#6e6961] mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#a09a8f] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-xs font-sans bg-[#faf8f5] border border-[#e5e0d8] focus:border-[#eb4b26] text-[#171614] focus:outline-hidden"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-[#eb4b26] hover:bg-[#cb3815] text-white font-mono text-xs uppercase tracking-wider font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            <span>{isSignUp ? 'Create Desk Account' : 'Sign In to Desk'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[#f0ede6] text-center font-mono text-xs text-[#6e6961]">
          {isSignUp ? (
            <p>
              Already registered?{' '}
              <button
                type="button"
                onClick={() => setIsSignUp(false)}
                className="text-[#eb4b26] underline hover:text-[#cb3815] cursor-pointer"
              >
                Sign in here
              </button>
            </p>
          ) : (
            <p>
              Need a classroom desk?{' '}
              <button
                type="button"
                onClick={() => setIsSignUp(true)}
                className="text-[#eb4b26] underline hover:text-[#cb3815] cursor-pointer"
              >
                Create an account
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
