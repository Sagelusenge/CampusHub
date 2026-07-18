import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import './styles/index.css';
import './styles/features.css';
import './styles/packs.css';
import './styles/social.css';
import './styles/messages.css';
import './styles/public-redesign.css';
import './styles/social-enhanced.css';
import './styles/ai-orientation.css';
import './styles/home-ai.css';
import './styles/institution-copilot.css';
import './styles/campus.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
