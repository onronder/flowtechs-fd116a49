
import { Link } from 'react-router-dom';

const ResetPassword = () => {
  return (
    <div className="mx-auto w-full max-w-md">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
          Reset your password
        </h2>
        <p className="text-sm text-muted-foreground">
          Enter a new password for your account
        </p>
      </div>
      
      <div className="glass-panel p-6 rounded-lg shadow-sm">
        <form className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              New Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              className="form-input"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="confirm-password" className="text-sm font-medium">
              Confirm New Password
            </label>
            <input
              id="confirm-password"
              type="password"
              placeholder="••••••••"
              className="form-input"
            />
          </div>
          
          <button type="submit" className="btn-primary w-full">
            Reset password
          </button>
        </form>
        
        <div className="mt-6 text-center text-sm">
          <Link to="/auth/signin" className="text-primary hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
