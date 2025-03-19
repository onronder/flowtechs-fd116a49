
import { Link } from 'react-router-dom';

const SignIn = () => {
  return (
    <div className="mx-auto w-full max-w-md">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
          Welcome back
        </h2>
        <p className="text-sm text-muted-foreground">
          Enter your credentials to access your account
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
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Link
                to="/auth/forgot-password"
                className="text-xs text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              className="form-input"
            />
          </div>
          
          <button type="submit" className="btn-primary w-full">
            Sign in
          </button>
        </form>
        
        <div className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">Don't have an account?</span>{' '}
          <Link to="/auth/signup" className="text-primary hover:underline">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
