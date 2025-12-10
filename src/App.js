import logo from './logo.svg';
import './App.css';
import { Routes, Route } from 'react-router-dom';
import DashBoardUI from './Components/HomePage/DashBoardUI';

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<DashBoardUI />} />
      </Routes>
    </div>
  );
}

export default App;
