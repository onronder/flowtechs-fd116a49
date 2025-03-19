
import { Link } from 'react-router-dom';

const Verify = () => {
  return (
    <div className="mx-auto w-full max-w-md">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
          Verify your email
        </h2>
        <p className="text-sm text-muted-foreground">
          We've sent a verification link to your email address
        </p>
      </div>
      
      <div className="glass-panel p-6 rounded-lg shadow-sm text-center">
        <div className="mb-6">
          <p className="text-muted-foreground text-sm">
            Please check your email inbox and click on the verification link to complete your account setup.
          </p>
        </div>
        
        <div className="space-y-4">
          <button className="btn-primary w-full">
            Resend verification email
          </button>
          
          <Link to="/auth/signin" className="btn-ghost w-full inline-block">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Verify;
