import { BrowserRouter } from 'react-router';
import { AuthProvider } from './components/AuthProvider';
import { AppRoutes } from './app/AppRoutes';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
