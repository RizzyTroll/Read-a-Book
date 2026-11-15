import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  User as UserIcon,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  BookOpen,
} from 'lucide-react';
import {
  checkUsernameAvailable,
  claimUsernameForExistingUser,
  fetchUserProfile,
  logInWithEmailPassword,
  normalizeUsername,
  sendPasswordResetForEmail,
  signUpWithUsernameEmailPassword,
  UserProfileData,
  validateUsernameFormat,
} from '../utils/firestoreSync';
import { auth } from '../firebase';
import { Book } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  starterBooks: Book[];
  initialMode?: 'signup' | 'login' | 'claim';
  onAuthSuccess?: (mode: 'signup' | 'login', profile?: UserProfileData) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  starterBooks,
  initialMode = 'signup',
  onAuthSuccess,
}) => {
  const [mode, setMode] = useState<'signup' | 'login' | 'claim'>(initialMode);
  const [usernameInput, setUsernameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [usernameStatus, setUsernameStatus] = useState<
    'idle' | 'checking' | 'available' | 'taken' | 'invalid'
  >('idle');
  const [usernameHint, setUsernameHint] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMsg(null);
      setInfoMsg(null);
    }
  }, [isOpen, initialMode]);

  // Debounced live username uniqueness check during Sign Up or Claim Username
  useEffect(() => {
    if (!isOpen || (mode !== 'signup' && mode !== 'claim')) return;
    const raw = usernameInput.trim().toLowerCase();
    if (!raw) {
      setUsernameStatus('idle');
      setUsernameHint('');
      return;
    }

    const formatErr = validateUsernameFormat(raw);
    if (formatErr) {
      setUsernameStatus('invalid');
      setUsernameHint(formatErr);
      return;
    }

    let cancelled = false;
    setUsernameStatus('checking');
    setUsernameHint('Checking availability...');

    const timer = setTimeout(async () => {
      try {
        const available = await checkUsernameAvailable(raw);
        if (cancelled) return;
        if (available) {
          setUsernameStatus('available');
          setUsernameHint(`@${raw} is available`);
        } else {
          setUsernameStatus('taken');
          setUsernameHint(`@${raw} is already taken`);
        }
      } catch {
        if (!cancelled) {
          setUsernameStatus('idle');
          setUsernameHint('');
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [usernameInput, mode, isOpen]);

  const handleSendResetEmail = async () => {
    if (isSendingReset) return;
    setErrorMsg(null);
    setInfoMsg(null);
    setIsSendingReset(true);

    try {
      await sendPasswordResetForEmail(emailInput);
      setMode('login');
      setInfoMsg(
        `Password link sent to ${emailInput.trim().toLowerCase()}. Open the email from Firebase, set a new password, then Log In below.`
      );
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not send password email.');
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMsg(null);
    setInfoMsg(null);

    if (mode === 'signup' || mode === 'claim') {
      const normalized = normalizeUsername(usernameInput);
      const formatErr = validateUsernameFormat(normalized);
      if (formatErr) {
        setErrorMsg(formatErr);
        return;
      }
      if (usernameStatus === 'taken') {
        setErrorMsg(`Username "@${normalized}" is already taken. Please pick another.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (mode === 'signup') {
        const { profile } = await signUpWithUsernameEmailPassword(
          usernameInput,
          emailInput,
          passwordInput,
          starterBooks
        );
        onAuthSuccess?.('signup', profile);
        onClose();
      } else if (mode === 'claim') {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          setMode('login');
          setErrorMsg('Please log in first to claim your username.');
          return;
        }
        const profile = await claimUsernameForExistingUser(
          currentUser,
          usernameInput,
          starterBooks
        );
        onAuthSuccess?.('signup', profile);
        onClose();
      } else {
        const user = await logInWithEmailPassword(emailInput, passwordInput);
        const existingProfile = await fetchUserProfile(user.uid);
        if (!existingProfile) {
          setMode('claim');
          setInfoMsg('Almost done! Choose a unique username for your account.');
          return;
        }
        onAuthSuccess?.('login', existingProfile);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to continue. Please check your details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  const canOfferReset =
    !!emailInput.trim() &&
    (mode === 'login' ||
      (errorMsg && errorMsg.toLowerCase().includes('already registered')));

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        className="w-full sm:max-w-md bg-[#F5F5F7] rounded-t-3xl sm:rounded-3xl border border-black/[0.08] shadow-2xl overflow-hidden max-h-[94vh] flex flex-col"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-white border-b border-black/[0.06] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#1D1D1F] text-white flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[16px] font-semibold text-[#1D1D1F] leading-tight">
                {mode === 'claim'
                  ? 'Pick Your Username'
                  : mode === 'signup'
                  ? 'Create Your Account'
                  : 'Welcome Back'}
              </h3>
              <p className="text-[12px] text-[#6E6E73]">
                {mode === 'claim'
                  ? 'One quick step to finish setting up your account'
                  : mode === 'signup'
                  ? 'Includes 20 starter books synced to your library'
                  : 'Sign in with your Gmail and password'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F2F2F7] text-[#6E6E73] hover:text-[#1D1D1F] flex items-center justify-center cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {mode !== 'claim' && (
            <div className="grid grid-cols-2 gap-1 p-1 bg-[#E5E5EA]/80 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setErrorMsg(null);
                  setInfoMsg(null);
                }}
                className={`h-9 rounded-lg text-[13px] font-semibold transition-all cursor-pointer ${
                  mode === 'signup'
                    ? 'bg-white text-[#1D1D1F] shadow-xs'
                    : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                }`}
              >
                Sign Up
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                  setInfoMsg(null);
                }}
                className={`h-9 rounded-lg text-[13px] font-semibold transition-all cursor-pointer ${
                  mode === 'login'
                    ? 'bg-white text-[#1D1D1F] shadow-xs'
                    : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                }`}
              >
                Log In
              </button>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-black/[0.05] p-4 space-y-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            {mode === 'login' && (
              <p className="text-[12px] text-[#6E6E73] bg-[#F5F5F7] rounded-xl px-3 py-2 leading-relaxed">
                Haven&apos;t set a password yet? Use <strong>Sign Up</strong> first, or tap <strong>Set / Forgot Password</strong> below to get a password link in Gmail.
              </p>
            )}

            {(mode === 'signup' || mode === 'claim') && (
              <div className="space-y-1.5">
                <label className="block text-[12px] font-semibold text-[#6E6E73]">
                  Unique Username
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#86868B]" />
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) =>
                      setUsernameInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                    }
                    placeholder="e.g. alex_reader"
                    maxLength={24}
                    autoComplete="username"
                    required
                    className="w-full h-11 bg-[#F5F5F7] border border-black/[0.08] focus:bg-white focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/20 rounded-xl pl-10 pr-10 text-[14px] text-[#1D1D1F] placeholder-[#86868B] focus:outline-none transition-all"
                  />
                  {usernameStatus === 'checking' && (
                    <Loader2 className="w-4 h-4 animate-spin text-[#86868B] absolute right-3.5 top-1/2 -translate-y-1/2" />
                  )}
                  {usernameStatus === 'available' && (
                    <CheckCircle2 className="w-4 h-4 text-[#34C759] absolute right-3.5 top-1/2 -translate-y-1/2" />
                  )}
                  {(usernameStatus === 'taken' || usernameStatus === 'invalid') && (
                    <AlertCircle className="w-4 h-4 text-[#FF3B30] absolute right-3.5 top-1/2 -translate-y-1/2" />
                  )}
                </div>
                {usernameHint ? (
                  <p
                    className={`text-[12px] font-medium ${
                      usernameStatus === 'available'
                        ? 'text-[#248A3D]'
                        : usernameStatus === 'taken' || usernameStatus === 'invalid'
                        ? 'text-[#D70015]'
                        : 'text-[#6E6E73]'
                    }`}
                  >
                    {usernameHint}
                  </p>
                ) : (
                  <p className="text-[11px] text-[#86868B]">
                    3–24 characters using letters, numbers, or underscores. Once claimed, it belongs only to you.
                  </p>
                )}
              </div>
            )}

            {mode !== 'claim' && (
              <>
                <div className="space-y-1.5">
                  <label className="block text-[12px] font-semibold text-[#6E6E73]">
                    Gmail Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#86868B]" />
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="you@gmail.com"
                      autoComplete="email"
                      required
                      className="w-full h-11 bg-[#F5F5F7] border border-black/[0.08] focus:bg-white focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/20 rounded-xl pl-10 pr-3.5 text-[14px] text-[#1D1D1F] placeholder-[#86868B] focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[12px] font-semibold text-[#6E6E73]">
                      Password
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={handleSendResetEmail}
                        disabled={isSendingReset}
                        className="text-[12px] font-medium text-[#007AFF] hover:underline cursor-pointer disabled:opacity-50"
                      >
                        {isSendingReset ? 'Sending...' : 'Set / Forgot Password?'}
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#86868B]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="At least 6 characters"
                      minLength={6}
                      autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                      required
                      className="w-full h-11 bg-[#F5F5F7] border border-black/[0.08] focus:bg-white focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/20 rounded-xl pl-10 pr-10 text-[14px] text-[#1D1D1F] placeholder-[#86868B] focus:outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#86868B] hover:text-[#1D1D1F] cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {infoMsg && (
            <div className="p-3.5 rounded-2xl bg-[#34C759]/[0.12] border border-[#34C759]/25 text-[13px] text-[#1B6B31] flex items-start gap-2.5 leading-snug">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#248A3D]" />
              <span>{infoMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-[#FF3B30]/[0.08] border border-[#FF3B30]/20 text-[13px] text-[#D70015] space-y-2 leading-snug">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
              {canOfferReset && (
                <button
                  type="button"
                  onClick={handleSendResetEmail}
                  disabled={isSendingReset}
                  className="text-[12px] font-semibold text-[#007AFF] hover:underline cursor-pointer pl-6"
                >
                  {isSendingReset
                    ? 'Sending password email...'
                    : `Send password reset / setup email to ${emailInput.trim().toLowerCase()}`}
                </button>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={
              isSubmitting ||
              ((mode === 'signup' || mode === 'claim') && usernameStatus === 'taken')
            }
            className="w-full h-12 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] disabled:opacity-50 text-white text-[15px] font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>
                  {mode === 'claim'
                    ? 'Saving Username...'
                    : mode === 'signup'
                    ? 'Creating Account...'
                    : 'Signing In...'}
                </span>
              </>
            ) : (
              <span>
                {mode === 'claim'
                  ? 'Save Username & Continue'
                  : mode === 'signup'
                  ? 'Create Account & Start Reading'
                  : 'Log In'}
              </span>
            )}
          </button>

          {mode === 'claim' && (
            <div className="flex items-center justify-center gap-4 text-[12px]">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                }}
                className="font-medium text-[#007AFF] hover:underline cursor-pointer"
              >
                Use another account (Sign In)
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setErrorMsg(null);
                }}
                className="font-medium text-[#6E6E73] hover:text-[#1D1D1F] hover:underline cursor-pointer"
              >
                Sign Up new
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-[13px] font-medium text-[#6E6E73] hover:text-[#1D1D1F] cursor-pointer text-center"
          >
            Continue reading as guest
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
};
