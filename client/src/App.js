import { BrowserRouter as Router, Route } from 'react-router-dom'
import Home from './components/Home';
import GameRoom from './components/GameRoom';

function App() {
  return (
    <div className="App">
      <Router>
        <Route path='/' exact>
          <Home />
        </Route>
        <Route path='/game/:roomID'>
          <GameRoom />
        </Route>
      </Router>
    </div>
  );
}

export default App;
