import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Browse from '../browse';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Browse Component', () => {
  it('renders and fetches popular shows', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { results: [{ name: 'Test Show', poster_path: '/image.jpg' }] }
    });

    render(<Browse />);
    await waitFor(() => expect(screen.getByText('Test Show')).toBeInTheDocument());
  });

  it('searches for a show when typing and pressing Enter', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        data: [{ name: 'Search Result Show', poster_path: '/search.jpg' }]
      }
    });

    render(<Browse />);
    const input = screen.getByPlaceholderText('Search titles...');
    fireEvent.change(input, { target: { value: 'Search' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText('Search Result Show')).toBeInTheDocument();
    });
  });
});
