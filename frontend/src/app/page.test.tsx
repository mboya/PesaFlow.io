import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Home from './page';

describe('Home Page', () => {
  it('renders the main heading', () => {
    render(<Home />);
    // Verify actual content from the component is rendered
    const heading = screen.getByRole('heading', {
      name: /to get started, edit the page\.tsx file\./i,
    });
    expect(heading).toBeInTheDocument();
  });

  it('renders navigation links', () => {
    render(<Home />);
    // Verify links are rendered
    const templatesLink = screen.getByRole('link', { name: /templates/i });
    const learningLink = screen.getByRole('link', { name: /learning/i });
    expect(templatesLink).toBeInTheDocument();
    expect(learningLink).toBeInTheDocument();
  });

  it('renders action buttons', () => {
    render(<Home />);
    // Verify action buttons are rendered
    const deployButton = screen.getByRole('link', { name: /deploy now/i });
    const docsButton = screen.getByRole('link', { name: /documentation/i });
    expect(deployButton).toBeInTheDocument();
    expect(docsButton).toBeInTheDocument();
  });

  // TODO: Add more comprehensive tests as the application grows
  // Example tests to add:
  // - Test user interactions (clicks, form submissions)
  // - Test API integrations with mocks
  // - Test responsive behavior
  // - Test dark mode toggle
});

