import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Home from '../Home'
import userEvent from '@testing-library/user-event'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('convex/react', () => ({
  useMutation: vi.fn().mockReturnValue(vi.fn()),
  useQuery: vi.fn().mockReturnValue(null),
  useConvex: vi.fn(),
}))

const mockCreateRoom = vi.fn()
vi.mock('@/hooks/useSession', () => ({
  useSessionMutation: vi.fn(() => mockCreateRoom),
  useSessionQuery: vi.fn().mockReturnValue(null),
  useSessionId: vi.fn().mockReturnValue('test-session-id'),
}))

describe('Home Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('renders create room form with all fields', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    expect(screen.getByLabelText(/Room Name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Card Set/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Project Key$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Base URL$/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Create Room/i })).toBeInTheDocument()
  })

  it('card set selector shows 3 options', async () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    
    const trigger = screen.getByRole('combobox', { name: /Card Set/i })
    await userEvent.click(trigger)
    
    await waitFor(() => {
      // Use more specific queries to prevent overlap (Fibonacci matches both)
      expect(screen.getByRole('option', { name: /Fibonacci \(/i })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /Fibonacci Extended/i })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /Custom/i })).toBeInTheDocument()
    })
  })

  it('custom input appears only when "Custom" selected', async () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    
    expect(screen.queryByLabelText(/Custom Card Values/i)).not.toBeInTheDocument()
    
    const trigger = screen.getByRole('combobox', { name: /Card Set/i })
    await userEvent.click(trigger)
    
    const customOption = await screen.findByRole('option', { name: /Custom/i })
    await userEvent.click(customOption)
    
    expect(screen.getByLabelText(/Custom Card Values/i)).toBeInTheDocument()
  })

  it('submit with empty name shows validation error', async () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    
    const submitButton = screen.getByRole('button', { name: /Create Room/i })
    await userEvent.click(submitButton)
    
    expect(await screen.findByText(/Room name is required/i)).toBeInTheDocument()
    expect(mockCreateRoom).not.toHaveBeenCalled()
  })

  it('join room input exists and has basic render', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    expect(screen.getByLabelText(/Room Code/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Join Room/i })).toBeInTheDocument()
  })
  
  it('creates room and navigates successfully', async () => {
    mockCreateRoom.mockResolvedValueOnce({ roomCode: 'abc123xy' })
    
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )
    
    const nameInput = screen.getByLabelText(/Room Name/i)
    await userEvent.type(nameInput, 'Sprint Planning')
    
    const submitButton = screen.getByRole('button', { name: /Create Room/i })
    await userEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockCreateRoom).toHaveBeenCalledWith({
        name: 'Sprint Planning',
        cardSet: ["1", "2", "3", "5", "8", "13", "21"],
      })
      expect(mockNavigate).toHaveBeenCalledWith('/room/abc123xy')
    })
  })
})
