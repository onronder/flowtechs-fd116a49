
import { Link } from 'react-router-dom';

const SignUp = () => {
  return (
    <div className="mx-auto w-full max-w-md">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
          Create your account
        </h2>
        <p className="text-sm text-muted-foreground">
          Enter your details to create a new account
        </p>
      </div>
      
      <div className="glass-panel p-6 rounded-lg shadow-sm">
        <form className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="first-name" className="text-sm font-medium">
                First Name
              </label>
              <input
                id="first-name"
                type="text"
                placeholder="John"
                className="form-input"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="last-name" className="text-sm font-medium">
                Last Name
              </label>
              <input
                id="last-name"
                type="text"
                placeholder="Doe"
                className="form-input"
              />
            </div>
          </div>
          
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
            <label htmlFor="password" className="text-sm font-medium">
              Password
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
              Confirm Password
            </label>
            <input
              id="confirm-password"
              type="password"
              placeholder="••••••••"
              className="form-input"
            />
          </div>
          
          <button type="submit" className="btn-primary w-full">
            Sign up
          </button>
        </form>
        
        <div className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">Already have an account?</span>{' '}
          <Link to="/auth/signin" className="text-primary hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
