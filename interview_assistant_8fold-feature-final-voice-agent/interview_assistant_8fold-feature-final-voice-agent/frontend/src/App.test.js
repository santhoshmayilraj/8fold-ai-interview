import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the main app heading', () => {
  render(<App />);
  const headingElement = screen.getByText(/AI Interview Coach/i);
  expect(headingElement).toBeInTheDocument();
});

test('renders welcome text', () => {
  render(<App />);
  const welcomeText = screen.getByText(/Welcome to Your Interview Practice Session/i);
  expect(welcomeText).toBeInTheDocument();
});