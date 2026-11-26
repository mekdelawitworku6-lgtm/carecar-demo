import { useState, useEffect } from 'react';
import { api, formatPhoneForApi } from '../services/api';
import { isValidEmail, isValidEthPhone, normalizeEthPhone, validateGoogleMapsLink } from '../utils/validation';
import { User, ArrowLeft, MapPin, Building2, Lock, Eye, EyeOff, KeyRound, RefreshCw, CheckCircle2 } from 'lucide-react';

/* ─── Phone helpers ─────────────────────────────────────────
   Always stores the LOCAL part (digits only, no leading 0).
   The full international number is always +251 + localPart.
──────────────────────────────────────────────────────────── */
const toLocalPart = (raw = '') =>
  normalizeEthPhone(raw.replace(/\D/g, '')).slice(0, 9); // max 9 digits
const toIntl = (localPart) => `+251${localPart}`;
const isAllowedProofFile = (file) => {
  if (!file) return false;
  const fileName = (file.name || '').toLowerCase();
  const fileType = (file.type || '').toLowerCase();
  return (
    fileType.startsWith('image/') ||
    fileType === 'application/pdf' ||
    /\.(pdf|jpg|jpeg|png)$/.test(fileName)
  );
};

function PhoneInput({ value, onChange, disabled, onSendOtp, sendingOtp, otpSent, phoneOk, hideOtpButton }) {
  return (
    <div className="phone-input-integrated">
      <div className="phone-input-prefix-text">ET +251</div>
      <input
        type="tel"
        placeholder="9xxxxxxxx"
        inputMode="numeric"
        value={value}
        disabled={disabled}
        onChange={e => onChange(toLocalPart(e.target.value))}
      />
      {!hideOtpButton && (!otpSent ? (
        <button
          type="button"
          onClick={onSendOtp}
          disabled={sendingOtp || !phoneOk}
          className="inline-otp-btn"
        >
          {sendingOtp ? '...' : 'Send OTP'}
        </button>
      ) : (
        <button
          type="button"
          onClick={onSendOtp}
          disabled={sendingOtp}
          className="inline-otp-btn"
          style={{ background: 'transparent', color: 'var(--primary)', border: '1px solid var(--primary)' }}
        >
          Resend
        </button>
      ))}
    </div>
  );
}

/* ─── OTP Input ──────────────────────────────────────────── */
function OtpInput({ value, onChange }) {
  return (
    <div className="form-group">
      <label className="form-label">OTP Code</label>
      <input
        type="text"
        className="form-input"
        placeholder="Enter 4-digit code"
        maxLength={4}
        value={value}
        onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
        inputMode="numeric"
        autoComplete="one-time-code"
        style={{ letterSpacing: '0.3em', fontSize: 22, textAlign: 'center', fontWeight: 700 }}
      />
      {value.length > 0 && value.length < 4 && (
        <p style={{ fontSize: 11, color: 'var(--warning)', marginTop: 4 }}>
          Enter all 4 digits
        </p>
      )}
    </div>
  );
}

/* ─── Main Auth Component ────────────────────────────────── */
export default function Auth({ onAuthSuccess, showToast }) {
  const [mode, setMode] = useState('signin');   // 'signin' | 'register' | 'forgot'

  // localPhone = 9-digit local part (without leading 0 or +251)
  const [localPhone, setLocalPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('CUSTOMER');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [digitalId, setDigitalId] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [licenseFile, setLicenseFile] = useState(null);
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  // identifier = phone or email used for password sign-in.
  // Phone input auto-prefixes +251 — the full number is always +251 + 9 digits.
  const toSignInDigits = raw => {
    if (raw.includes('@')) return raw;
    const d = toLocalPart(raw);
    return d ? `+251 ${d}` : '';
  };
  const [identifier, setIdentifier] = useState('+251 ');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password flow states
  const [forgotStep, setForgotStep] = useState('phone'); // 'phone' | 'otp' | 'reset'
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false);
  const [forgotTimer, setForgotTimer] = useState(0);
  const [sendingForgotOtp, setSendingForgotOtp] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  // 60-second countdown timer for Forgot Password OTP
  useEffect(() => {
    if (mode !== 'forgot' || forgotStep !== 'otp' || forgotTimer <= 0) return;
    const interval = setInterval(() => {
      setForgotTimer(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [mode, forgotStep, forgotTimer]);

  const [bizName, setBizName] = useState('');
  const [bizPhone, setBizPhone] = useState('');
  const [bizEmail, setBizEmail] = useState('');
  const [bizAddress, setBizAddress] = useState('');
  const [bizGoogleMaps, setBizGoogleMaps] = useState('');

  // Owner signup is two-phase: the business is approved by an admin BEFORE the
  // account is created. 'apply' -> 'waiting' -> 'account'
  const [ownerStage, setOwnerStage] = useState('apply');
  const [applicationStatus, setApplicationStatus] = useState(null);
  const [applicationNote, setApplicationNote] = useState('');

  const resetForm = () => {
    setLocalPhone(''); setFullName('');
    setOtpCode(''); setOtpSent(false); setTerms(false);
    setDigitalId(''); setProofFile(null); setLicenseFile(null);
    setIdentifier('+251 '); setPassword(''); setConfirmPassword(''); setShowPassword(false);
    setBizName(''); setBizPhone(''); setBizEmail(''); setBizAddress(''); setBizGoogleMaps('');
    setOwnerStage('apply'); setApplicationStatus(null); setApplicationNote('');
    setForgotStep('phone'); setForgotPhone(''); setForgotOtp('');
    setForgotNewPassword(''); setForgotConfirmPassword(''); setForgotTimer(0);
  };

  const handleStartForgot = () => {
    // If identifier contains 9 digits, prefill forgotPhone
    const digits = toLocalPart(identifier);
    if (digits && digits.length >= 9) {
      setForgotPhone(digits.slice(0, 9));
    } else {
      setForgotPhone('');
    }
    setForgotOtp('');
    setForgotNewPassword('');
    setForgotConfirmPassword('');
    setForgotStep('phone');
    setForgotTimer(0);
    setMode('forgot');
  };

  const handleSendForgotOtp = async () => {
    if (forgotPhone.length < 9) {
      showToast('Enter a valid 9-digit phone number after +251', 'error');
      return;
    }
    setSendingForgotOtp(true);
    try {
      await api.auth.sendPasswordResetOtp(toIntl(forgotPhone));
      setForgotTimer(60);
      setForgotStep('otp');
      showToast('Verification code sent to your phone!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to send verification code', 'error');
    } finally {
      setSendingForgotOtp(false);
    }
  };

  const handleResendForgotOtp = async () => {
    if (forgotTimer > 0 || sendingForgotOtp) return;
    setSendingForgotOtp(true);
    try {
      await api.auth.sendPasswordResetOtp(toIntl(forgotPhone));
      setForgotTimer(60);
      showToast('A new verification code has been sent!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to resend code', 'error');
    } finally {
      setSendingForgotOtp(false);
    }
  };

  const handleVerifyForgotOtp = async (e) => {
    if (e) e.preventDefault();
    if (forgotOtp.length !== 4) {
      showToast('Enter the 4-digit verification code', 'error');
      return;
    }
    setForgotLoading(true);
    try {
      await api.auth.verifyPasswordResetOtp(toIntl(forgotPhone), forgotOtp);
      setForgotStep('reset');
      showToast('Code verified! Set your new password.', 'success');
    } catch (err) {
      showToast(err.message || 'Invalid or expired OTP code', 'error');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    if (e) e.preventDefault();
    if (!forgotNewPassword) {
      showToast('Enter a new password', 'error');
      return;
    }
    if (forgotNewPassword.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }
    setForgotLoading(true);
    try {
      await api.auth.resetPassword(toIntl(forgotPhone), forgotOtp, forgotNewPassword);
      showToast('Password reset successfully! Please sign in.', 'success');
      setIdentifier(`+251 ${forgotPhone}`);
      setPassword('');
      setMode('signin');
      setForgotStep('phone');
      setForgotOtp('');
      setForgotNewPassword('');
      setForgotConfirmPassword('');
    } catch (err) {
      showToast(err.message || 'Failed to reset password', 'error');
    } finally {
      setForgotLoading(false);
    }
  };

  const phoneOk = localPhone.length >= 9;
  const otpOk   = otpCode.length === 4;

  const handleSendOtp = async () => {
    if (!phoneOk) { showToast('Enter a valid 9-digit phone number after +251', 'error'); return; }
    setSendingOtp(true);
    try {
      const type = mode === 'signin' ? 'LOGIN' : 'PHONE_VERIFY';
      await api.auth.sendOtp(toIntl(localPhone), type);
      setOtpSent(true);
      showToast('OTP sent to your phone!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to send OTP', 'error');
    } finally {
      setSendingOtp(false);
    }
  };

  const saveSession = res => {
    // Backend wraps everything under res.data:
    // { success: true, data: { accessToken, refreshToken, user }, message }
    const payload = res?.data ?? res ?? {};
    const u     = payload.user     ?? res?.user;
    const token = payload.accessToken ?? res?.accessToken;
    const refreshToken = payload.refreshToken ?? res?.refreshToken;

    if (!u?.id)    throw new Error('Authentication failed: no user returned from server');
    if (!token)    throw new Error('Authentication failed: no access token returned');

    localStorage.setItem('userId',       u.id);
    localStorage.setItem('token',        token);
    localStorage.setItem('role',         u.role     || '');
    localStorage.setItem('fullName',     u.fullName || 'User');
    localStorage.setItem('phone',        u.phone    || '');
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    return u;
  };


  const handleSignIn = async e => {
    e.preventDefault();
    const id = identifier.trim();
    if (!id)       { showToast('Enter your phone number or email', 'error'); return; }
    if (id.includes('@') && !isValidEmail(id)) { showToast('Enter a valid email address', 'error'); return; }
    const phoneOnly = !id.includes('@') && id.replace(/\D/g, '').length < 9;
    if (phoneOnly) { showToast('Enter your full 9-digit phone number after +251', 'error'); return; }
    if (!password) { showToast('Enter your password', 'error'); return; }
    if (password.length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }
    setLoading(true);
    try {
      const res = id.includes('@')
        ? await api.auth.loginWithEmail(id, password)
        : await api.auth.login(formatPhoneForApi(id), password);
      const u = saveSession(res);
      showToast('Welcome back!', 'success');
      onAuthSuccess(u);
    } catch (err) {
      showToast(err.message || 'Authentication failed', 'error');
    } finally { setLoading(false); }
  };

  const validateBusinessDetails = () => {
    if (!fullName.trim()) { showToast('Enter your full name', 'error'); return false; }
    if (!phoneOk) { showToast('Enter a valid phone number', 'error'); return false; }
    if (!digitalId.trim() || digitalId.replace(/\s/g, '').length < 4) { showToast('Enter a valid Fayda ID (national ID)', 'error'); return false; }
    if (!proofFile) { showToast('Upload proof of ownership', 'error'); return false; }
    if (!licenseFile) { showToast('Upload business license', 'error'); return false; }
    if (!isAllowedProofFile(proofFile)) { showToast('Proof of ownership must be a PDF, JPG, JPEG, or PNG file', 'error'); return false; }
    if (!isAllowedProofFile(licenseFile)) { showToast('Business license must be a PDF, JPG, JPEG, or PNG file', 'error'); return false; }
    if (!bizName.trim()) { showToast('Enter your business name', 'error'); return false; }
    if (bizPhone && !isValidEthPhone(bizPhone)) { showToast('Enter a valid business phone number (e.g. 09XX XXX XXX)', 'error'); return false; }
    if (bizEmail && !isValidEmail(bizEmail)) { showToast('Enter a valid business email address', 'error'); return false; }
    const mapsError = validateGoogleMapsLink(bizGoogleMaps);
    if (mapsError) { showToast(mapsError, 'error'); return false; }
    return true;
  };

  // Phase 1 — submit the business for admin approval. No account is created yet.
  const handleSubmitApplication = async e => {
    e.preventDefault();
    if (!validateBusinessDetails()) return;
    setLoading(true);
    try {
      // Stop a returning user before we collect documents, not after.
      const existing = await api.auth.checkPhone(localPhone);
      if (existing?.data?.exists) {
        showToast('This number is already registered. Please sign in instead.', 'error');
        return;
      }
    } catch {
      /* never block signup because the availability check failed */
    }
    try {
      const fd = new FormData();
      fd.append('ownerPhone', toIntl(localPhone));
      fd.append('fullName', fullName.trim());
      fd.append('faydaId', digitalId.trim());
      fd.append('businessName', bizName.trim());
      if (bizPhone) fd.append('phone', bizPhone);
      if (bizEmail) fd.append('email', bizEmail);
      if (bizAddress) fd.append('address', bizAddress);
      fd.append('googleMapsLink', bizGoogleMaps.trim());
      if (proofFile) fd.append('proofOfOwnership', proofFile);
      if (licenseFile) fd.append('businessLicense', licenseFile);

      const res = await api.user.submitBusinessApplication(fd);
      setApplicationStatus(res?.data?.status || 'PENDING');
      setOwnerStage('waiting');
      showToast('Application submitted. We will notify you once it is approved.', 'success');
    } catch (err) {
      showToast(err.message || 'Could not submit application', 'error');
    } finally { setLoading(false); }
  };

  const handleCheckApplication = async () => {
    if (!phoneOk) { showToast('Enter the phone number you applied with', 'error'); return; }
    setLoading(true);
    try {
      const res = await api.user.getBusinessApplicationStatus(toIntl(localPhone));
      const status = res?.data?.status;
      setApplicationStatus(status);
      setApplicationNote(res?.data?.reviewNote || '');
      if (status === 'APPROVED') {
        setOwnerStage('account');
        showToast('Your business is approved. Finish creating your account.', 'success');
      } else if (status === 'REJECTED') {
        showToast('Your application was rejected. You can update it and apply again.', 'error');
      } else if (status === 'COMPLETED') {
        setOwnerStage('account');
        showToast('An account already exists for this application. Try signing in.', 'success');
      } else {
        showToast('Still awaiting admin approval', 'info');
      }
    } catch (err) {
      showToast(err.message || 'Could not check application status', 'error');
    } finally { setLoading(false); }
  };

  // Phase 2 — create the account. Backend rejects this unless the business is approved.
  const handleRegister = async e => {
    e.preventDefault();
    if (!fullName.trim()) { showToast('Enter your full name', 'error'); return; }
    if (!phoneOk)     { showToast('Enter a valid phone number', 'error'); return; }
    if (!otpSent)     { showToast('Send and verify OTP first', 'error'); return; }
    if (!otpOk)       { showToast('Enter the full OTP code', 'error'); return; }
    if (!terms)       { showToast('Agree to Terms & Conditions', 'error'); return; }
    if (!password)            { showToast('Create a password', 'error'); return; }
    if (password.length < 6)  { showToast('Password must be at least 6 characters', 'error'); return; }
    if (password !== confirmPassword) { showToast('Passwords do not match', 'error'); return; }
    if (role === 'BUSINESS_OWNER') {
      if (!digitalId.trim() || digitalId.replace(/\s/g, '').length < 4) { showToast('Enter a valid Fayda ID (national ID)', 'error'); return; }
    }
    setLoading(true);
    const intlPhone = toIntl(localPhone);
    try {
      const payload = role === 'BUSINESS_OWNER'
        ? (() => {
            const fd = new FormData();
            fd.append('phone', intlPhone);
            fd.append('role', role);
            fd.append('fullName', fullName.trim());
            fd.append('password', password);
            fd.append('digitalId', digitalId.trim());
            fd.append('faydaId', digitalId.trim());
            fd.append('code', otpCode);
            return fd;
          })()
        : { phone: intlPhone, role, fullName: fullName.trim(), digitalId: digitalId.trim(), code: otpCode, password };

      const res = await api.auth.register(payload);
      const u = saveSession(res);
      showToast(
        role === 'BUSINESS_OWNER' ? 'Account created! Welcome.' : 'Account created! Welcome.',
        'success'
      );
      onAuthSuccess(u);
    } catch (err) {
      showToast(err.message || 'Registration failed', 'error');
    } finally { setLoading(false); }
  };

  const isOwner = role === 'BUSINESS_OWNER';
  const showWaiting = isOwner && ownerStage === 'waiting';
  const showApplyForm = isOwner && ownerStage === 'apply';
  const showAccountForm = isOwner && ownerStage === 'account';

  /* ════════════════════════════════════════════════════════
     SIGN IN SCREEN
  ════════════════════════════════════════════════════════ */
  if (mode === 'signin') {
    return (
      <div className="auth-wrapper">
        <div className="auth-card slide-in">
          {/* Logo */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <div className="auth-logo-sq">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13" rx="2"/>
                <path d="m16 8 5 0 2 5-4 2"/>
                <circle cx="5.5" cy="18.5" r="2.5"/>
                <circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
            </div>
          </div>

          <h1 className="auth-title">Sign in</h1>
          <p className="auth-subtitle">Hi welcome back, you've been missed.</p>

          <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Phone or email */}
            <div className="form-group">
              <label className="form-label">Phone number or email</label>
              <div className="form-input-icon-wrap">
                <span className="form-input-icon"><User size={16} /></span>
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: 44 }}
                  placeholder="9xx xxx xxx or you@email.com"
                  value={identifier}
                  onChange={e => setIdentifier(toSignInDigits(e.target.value))}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="form-input-icon-wrap">
                <span className="form-input-icon"><Lock size={16} /></span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  style={{ paddingLeft: 44, paddingRight: 44 }}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  className="form-input-icon-right"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0 }}
                  onClick={handleStartForgot}
                >
                  Forgot Password?
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading}
              style={{ marginTop: 4 }}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>

            <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>
              Don't have an account?{' '}
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
                onClick={() => { resetForm(); setMode('register'); }}
              >
                Sign Up
              </button>
            </p>
          </form>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════
     FORGOT PASSWORD SCREEN
  ════════════════════════════════════════════════════════ */
  if (mode === 'forgot') {
    return (
      <div className="auth-wrapper">
        <div className="auth-card slide-in">
          {/* Back to Sign In */}
          <button
            type="button"
            style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', marginBottom: 20 }}
            onClick={() => { resetForm(); setMode('signin'); }}
          >
            <ArrowLeft size={16} /> Back to Sign In
          </button>

          {/* Logo */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px var(--primary-glow)',
            }}>
              <KeyRound size={28} color="#fff" />
            </div>
          </div>

          <h1 className="auth-title">
            {forgotStep === 'phone' ? 'Forgot Password' : forgotStep === 'otp' ? 'Verify Your Phone' : 'Set New Password'}
          </h1>
          <p className="auth-subtitle">
            {forgotStep === 'phone'
              ? 'Enter the phone number linked to your account. We\'ll send you a verification code.'
              : forgotStep === 'otp'
                ? `Enter the 4-digit code we sent to +251 ${forgotPhone}`
                : 'Create a strong new password for your account.'}
          </p>

          {/* Step indicator */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
            {['phone', 'otp', 'reset'].map((step, i) => (
              <div key={step} style={{
                width: forgotStep === step ? 32 : 10, height: 10, borderRadius: 5,
                background: ['phone', 'otp', 'reset'].indexOf(forgotStep) >= i
                  ? 'var(--primary)' : 'var(--border)',
                transition: 'all 0.3s ease',
              }} />
            ))}
          </div>

          {/* ── Step 1: Phone ── */}
          {forgotStep === 'phone' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Phone number</label>
                <PhoneInput
                  value={forgotPhone}
                  onChange={v => setForgotPhone(v)}
                  disabled={sendingForgotOtp}
                  phoneOk={forgotPhone.length >= 9}
                  hideOtpButton
                />
              </div>
              <button
                type="button"
                className="btn btn-primary btn-full"
                disabled={sendingForgotOtp || forgotPhone.length < 9}
                onClick={handleSendForgotOtp}
              >
                {sendingForgotOtp ? 'Sending...' : 'Send Verification Code'}
              </button>
            </div>
          )}

          {/* ── Step 2: OTP Verify ── */}
          {forgotStep === 'otp' && (
            <form onSubmit={handleVerifyForgotOtp} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Verification Code</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter 4-digit code"
                  maxLength={4}
                  value={forgotOtp}
                  onChange={e => setForgotOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  style={{ letterSpacing: '0.3em', fontSize: 22, textAlign: 'center', fontWeight: 700 }}
                />
              </div>

              {/* Countdown + Resend */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {forgotTimer > 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                    Resend code in <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{forgotTimer}s</span>
                  </p>
                ) : (
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                    onClick={handleResendForgotOtp}
                    disabled={sendingForgotOtp}
                  >
                    <RefreshCw size={13} /> {sendingForgotOtp ? 'Sending...' : 'Resend Code'}
                  </button>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={forgotLoading || forgotOtp.length !== 4}
              >
                {forgotLoading ? 'Verifying...' : 'Verify Code'}
              </button>
            </form>
          )}

          {/* ── Step 3: New Password ── */}
          {forgotStep === 'reset' && (
            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: 'rgba(34,197,94,0.1)', marginBottom: 4 }}>
                <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />
                <span style={{ fontSize: 13, color: 'var(--success)', fontWeight: 600 }}>Phone verified successfully</span>
              </div>

              <div className="form-group">
                <label className="form-label">New Password <span style={{ color: 'var(--danger)' }}>*</span></label>
                <div className="form-input-icon-wrap">
                  <span className="form-input-icon"><Lock size={16} /></span>
                  <input
                    type={showForgotNewPassword ? 'text' : 'password'}
                    className="form-input"
                    style={{ paddingLeft: 44, paddingRight: 44 }}
                    placeholder="Create a new password (min 6 characters)"
                    value={forgotNewPassword}
                    onChange={e => setForgotNewPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={6}
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    className="form-input-icon-right"
                    onClick={() => setShowForgotNewPassword(v => !v)}
                    aria-label={showForgotNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showForgotNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {forgotNewPassword && forgotNewPassword.length < 6 && (
                  <p style={{ fontSize: 11, color: 'var(--warning)', marginTop: 4 }}>Minimum 6 characters</p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Confirm Password <span style={{ color: 'var(--danger)' }}>*</span></label>
                <div className="form-input-icon-wrap">
                  <span className="form-input-icon"><Lock size={16} /></span>
                  <input
                    type={showForgotConfirmPassword ? 'text' : 'password'}
                    className="form-input"
                    style={{ paddingLeft: 44, paddingRight: 44 }}
                    placeholder="Confirm your new password"
                    value={forgotConfirmPassword}
                    onChange={e => setForgotConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    className="form-input-icon-right"
                    onClick={() => setShowForgotConfirmPassword(v => !v)}
                    aria-label={showForgotConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showForgotConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {forgotConfirmPassword && forgotNewPassword !== forgotConfirmPassword && (
                  <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>Passwords do not match</p>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={forgotLoading || forgotNewPassword.length < 6 || forgotNewPassword !== forgotConfirmPassword}
              >
                {forgotLoading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════
     CREATE ACCOUNT / REGISTER SCREEN
  ════════════════════════════════════════════════════════ */
  return (
    <div className="auth-wrapper" style={{ alignItems: 'flex-start', paddingTop: 32 }}>
      <div className="auth-card slide-in">
        <button
          type="button"
          style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', marginBottom: 20 }}
          onClick={() => { resetForm(); setMode('signin'); }}
        >
          <ArrowLeft size={16} /> Back to Sign In
        </button>

        <h1 className="auth-title">
          {showWaiting ? 'Application submitted' : showApplyForm ? 'Apply as Business Owner' : 'Create Account'}
        </h1>
        <p className="auth-subtitle">
          {showWaiting
            ? 'Your business is being reviewed. You can create your account as soon as an admin approves it.'
            : showApplyForm
              ? 'Submit your business details for approval. Your account is created only after an admin approves your business.'
              : "Create your login details below to securely access your account anytime. Save them for future use — we'll keep everything safe!"}
        </p>

        {showWaiting ? (
          <div className="auth-card slide-in" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{
              border: '1px solid var(--border)', borderRadius: 12, padding: 16,
              background: 'var(--bg-input)', display: 'flex', flexDirection: 'column', gap: 8
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Application status</div>
              <div style={{
                fontSize: 15, fontWeight: 700,
                color: applicationStatus === 'APPROVED' ? 'var(--success)'
                  : applicationStatus === 'REJECTED' ? 'var(--danger)'
                  : 'var(--warning)'
              }}>
                {applicationStatus === 'APPROVED' ? 'Approved'
                  : applicationStatus === 'REJECTED' ? 'Rejected'
                  : applicationStatus === 'COMPLETED' ? 'Completed'
                  : 'Awaiting admin approval'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Applied with +251{localPhone}
              </div>
              {applicationNote && (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Note from admin: {applicationNote}</div>
              )}
            </div>

            <button
              type="button"
              className="btn btn-primary btn-full"
              disabled={loading}
              onClick={handleCheckApplication}
            >
              {loading ? 'Checking...' : 'Check application status'}
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-full"
              onClick={() => { setOwnerStage('apply'); setApplicationStatus(null); }}
            >
              Edit &amp; resubmit application
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-full"
              onClick={() => { resetForm(); setMode('signin'); }}
            >
              Back to Sign In
            </button>
          </div>
        ) : (
        <form onSubmit={showApplyForm ? handleSubmitApplication : handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Role selector */}
          <div className="form-group">
            <label className="form-label">Register as</label>
            <div className="grid-2" style={{ gap: 10 }}>
              {[
                { value: 'CUSTOMER',       label: '👤 Customer' },
                { value: 'BUSINESS_OWNER', label: '🏢 Owner' },
              ].map(r => (
                <label
                  key={r.value}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                    padding: '11px 14px', borderRadius: 10, cursor: 'pointer',
                    border: `2px solid ${role === r.value ? 'var(--primary)' : 'var(--border)'}`,
                    background: role === r.value ? 'var(--primary-bg)' : 'var(--bg-input)',
                    transition: 'var(--transition)',
                  }}
                >
                  <input
                    type="radio" name="role" value={r.value}
                    checked={role === r.value}
                    onChange={() => { setRole(r.value); setOwnerStage('apply'); }}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  <span style={{ fontSize: 14, fontWeight: 600, color: role === r.value ? 'var(--primary)' : 'var(--text-secondary)' }}>
                    {r.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Full Name */}
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <div className="form-input-icon-wrap">
              <span className="form-input-icon"><User size={16} /></span>
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: 44 }}
                placeholder="Enter your full name"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Phone + OTP send. During the application stage there is no OTP yet. */}
          <div className="form-group">
            <label className="form-label">Phone number</label>
            <div className="auth-phone-field">
              <PhoneInput
                value={localPhone}
                onChange={v => { setLocalPhone(v); setOtpSent(false); setOtpCode(''); }}
                disabled={sendingOtp || showAccountForm}
                onSendOtp={handleSendOtp}
                sendingOtp={sendingOtp}
                otpSent={otpSent}
                phoneOk={phoneOk}
                hideOtpButton={showApplyForm}
              />
            </div>
          </div>

          {/* OTP */}
          {!showApplyForm && otpSent && <OtpInput value={otpCode} onChange={setOtpCode} />}

          {/* Password — not collected until the business is approved */}
          {!showApplyForm && (
            <>
              <div className="form-group">
                <label className="form-label">Password <span style={{ color: 'var(--danger)' }}>*</span></label>
                <div className="form-input-icon-wrap">
                  <span className="form-input-icon"><Lock size={16} /></span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    style={{ paddingLeft: 44, paddingRight: 44 }}
                    placeholder="Create a password (min 6 characters)"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    className="form-input-icon-right"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Save this password — you'll use it to sign in on every device.</span>
              </div>

              {/* Confirm Password */}
              <div className="form-group">
                <label className="form-label">Confirm Password <span style={{ color: 'var(--danger)' }}>*</span></label>
                <div className="form-input-icon-wrap">
                  <span className="form-input-icon"><Lock size={16} /></span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className={`form-input ${confirmPassword && confirmPassword !== password ? 'form-input-error' : ''}`}
                    style={{ paddingLeft: 44, paddingRight: 44 }}
                    placeholder="Repeat your password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={6}
                    required
                  />
                </div>
                {confirmPassword && confirmPassword !== password && (
                  <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>Passwords do not match</p>
                )}
              </div>
            </>
          )}

          {/* Fayda ID (national ID) */}
          <div className="form-group">
            <label className="form-label">
              Fayda ID (National ID) {role === 'BUSINESS_OWNER' ? <span style={{ color: 'var(--danger)' }}>*</span> : <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>}
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="National ID / Digital ID number"
              value={digitalId}
              onChange={e => setDigitalId(e.target.value)}
            />
          </div>

          {/* Business owner: proof of ownership */}
          {showApplyForm && (
            <div className="form-group">
              <label className="form-label">Proof of Ownership <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={e => setProofFile(e.target.files[0])}
                style={{ fontSize: 13, color: 'var(--text-secondary)' }}
              />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>PDF or image. Required for business verification.</span>
            </div>
          )}

          {/* Business owner: business license */}
          {showApplyForm && (
            <div className="form-group">
              <label className="form-label">Business License <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={e => setLicenseFile(e.target.files[0])}
                style={{ fontSize: 13, color: 'var(--text-secondary)' }}
              />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>PDF or image. Required for business verification.</span>
            </div>
          )}

          {/* Business owner: business details */}
          {showApplyForm && (
            <>
              <div style={{
                borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 4,
                display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)'
              }}>
                <Building2 size={14} /> Business Details
              </div>

              <div className="form-group">
                <label className="form-label">Business Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                <div className="form-input-icon-wrap">
                  <span className="form-input-icon"><Building2 size={16} /></span>
                  <input type="text" className="form-input" style={{ paddingLeft: 44 }}
                    placeholder="Your business name"
                    value={bizName} onChange={e => setBizName(e.target.value)} required />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Business Phone</label>
                <input type="tel" className="form-input"
                  placeholder="Business phone number"
                  value={bizPhone} onChange={e => setBizPhone(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Business Email</label>
                <input type="email" className="form-input"
                  placeholder="business@email.com"
                  value={bizEmail} onChange={e => setBizEmail(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Address</label>
                <div className="form-input-icon-wrap">
                  <span className="form-input-icon"><MapPin size={16} /></span>
                  <input type="text" className="form-input" style={{ paddingLeft: 44 }}
                    placeholder="Street address"
                    value={bizAddress} onChange={e => setBizAddress(e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Google Maps Link <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <div className="form-input-icon-wrap">
                  <span className="form-input-icon"><MapPin size={16} /></span>
                  <input
                    type="url"
                    className="form-input"
                    style={{ paddingLeft: 44 }}
                    placeholder="https://maps.google.com/?q=9.0084,38.7575"
                    value={bizGoogleMaps}
                    onChange={e => setBizGoogleMaps(e.target.value)}
                    required
                  />
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Open your business in Google Maps, tap Share &rarr; Copy link, then paste it here. We read the location from this link.
                </span>
                {bizGoogleMaps.trim() && !validateGoogleMapsLink(bizGoogleMaps) && (
                  <p style={{ fontSize: 11, color: 'var(--success)', marginTop: 4 }}>Valid location link</p>
                )}
                {bizGoogleMaps.trim() && validateGoogleMapsLink(bizGoogleMaps) && (
                  <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>{validateGoogleMapsLink(bizGoogleMaps)}</p>
                )}
              </div>
            </>
          )}

          {/* Terms */}
          {!showApplyForm && (
            <label className="checkbox-label" style={{ marginTop: 4 }}>
              <input
                type="checkbox"
                checked={terms}
                onChange={e => setTerms(e.target.value)}
              />
              <span>
                Agree with{' '}
                <span style={{ color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}>Terms &amp; Conditions</span>
              </span>
            </label>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading || (!showApplyForm && !terms)}
            style={{ marginTop: 8 }}
          >
            {loading
              ? (showApplyForm ? 'Submitting...' : 'Creating account...')
              : (showApplyForm ? 'Submit for Approval' : 'Sign Up')}
          </button>

          <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <button
              type="button"
              style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
              onClick={() => { resetForm(); setMode('signin'); }}
            >
              Sign in
            </button>
          </p>
        </form>
        )}
      </div>
    </div>
  );
}

