import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Auth } from '../Auth';
import { supabase } from '../../lib/supabase';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn()
    }
  }
}));

describe('Auth', () => {
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders sign in form by default', () => {
    render(<Auth onSuccess={mockOnSuccess} />);
    
    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('toggles between sign in and sign up', async () => {
    render(<Auth onSuccess={mockOnSuccess} />);
    
    // Initially shows sign in
    expect(screen.getByText('Sign In')).toBeInTheDocument();
    
    // Click to switch to sign up
    await userEvent.click(screen.getByText(/Don't have an account\? Sign Up/));
    expect(screen.getByText('Create Account')).toBeInTheDocument();
    
    // Click to switch back to sign in
    await userEvent.click(screen.getByText(/Already have an account\? Sign In/));
    expect(screen.getByText('Sign In')).toBeInTheDocument();
  });

  it('handles sign in submission', async () => {
    const mockSignIn = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(supabase.auth.signInWithPassword).mockImplementation(mockSignIn);

    render(<Auth onSuccess={mockOnSuccess} />);
    
    await userEvent.type(screen.getByLabelText('Email'), 'test@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.click(screen.getByText('Sign In'));

    expect(mockSignIn).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123'
    });
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('handles sign up submission', async () => {
    const mockSignUp = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(supabase.auth.signUp).mockImplementation(mockSignUp);

    render(<Auth onSuccess={mockOnSuccess} />);
    
    // Switch to sign up
    await userEvent.click(screen.getByText(/Don't have an account\? Sign Up/));
    
    await userEvent.type(screen.getByLabelText('Email'), 'test@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.click(screen.getByText('Sign Up'));

    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123'
    });
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('displays error message on auth failure', async () => {
    const mockError = new Error('Invalid credentials');
    vi.mocked(supabase.auth.signInWithPassword).mockRejectedValue(mockError);

    render(<Auth onSuccess={mockOnSuccess} />);
    
    await userEvent.type(screen.getByLabelText('Email'), 'test@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.click(screen.getByText('Sign In'));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });
});