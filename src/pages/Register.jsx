import React from 'react';
import PageContainer from '../components/layout/PageContainer';

const Register = () => {
  return (
    <PageContainer>
      <div className="card mx-auto w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-2xl font-bold text-center">Create Account</h2>
          <form>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Username</span>
              </label>
              <input type="text" placeholder="username" className="input input-bordered" />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Email</span>
              </label>
              <input type="email" placeholder="email@example.com" className="input input-bordered" />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Password</span>
              </label>
              <input type="password" placeholder="••••••••" className="input input-bordered" />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Confirm Password</span>
              </label>
              <input type="password" placeholder="••••••••" className="input input-bordered" />
            </div>
            <div className="form-control mt-6">
              <button className="btn btn-primary">Register</button>
            </div>
          </form>
          <div className="divider">OR</div>
          <div className="text-center">
            <p>Already have an account?</p>
            <a href="/login" className="link link-primary">Login</a>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default Register;