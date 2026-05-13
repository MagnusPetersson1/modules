const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000'

export default function App() {
  return (
    <main>
      <h1>{{MODULE_TITLE}}</h1>
      <p>API: {API_BASE_URL}</p>
    </main>
  )
}
