import logo from './logo.svg';
import './App.css';
import { Routes, Route } from 'react-router-dom';
import DashBoardUI from './Components/HomePage/DashBoardUI';
import Signup from './Components/HomePage/Signup';
import Login from './Components/HomePage/Login';

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<DashBoardUI />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </div>
  );
}

export default App;
