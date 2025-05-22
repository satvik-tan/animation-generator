import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import ChatBox from './components/ChatBox'
import Main from '@/pages/Main';

function App() {
  const [count, setCount] = useState(0)

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Main />} />
        {/* Add more routes as needed */}
      </Routes>
    </Router>
  );
}

export default App
