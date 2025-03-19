
import { Link } from 'react-router-dom';

const ForgotPassword = () => {
  return (
    <div className="mx-auto w-full max-w-md">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
          Forgot your password?
        </h2>
        <p className="text-sm text-muted-foreground">
          Enter your email address and we'll send you a link to reset your password
        </p>
      </div>
      
      <div className="glass-panel p-6 rounded-lg shadow-sm">
        <form className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="hello@example.com"
              className="form-input"
            />
          </div>
          
          <button type="submit" className="btn-primary w-full">
            Send reset link
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

export default ForgotPassword;
