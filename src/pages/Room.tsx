import { useParams } from 'react-router-dom'

export default function Room() {
  const { roomCode } = useParams<{ roomCode: string }>()
  return <h1>Room: {roomCode}</h1>
}
