import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App.jsx';
import { LanguageProvider } from './components/LanguageSelector.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
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
import './styles/offers.css';
import './styles/community.css';
import './styles/finalist-orientation.css';
import './styles/help.css';
import './styles/reports.css';
import './styles/assistant-widget.css';
import './styles/location-picker.css';
import './styles/organization-application.css';
import './styles/theme.css';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => null);
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <LanguageProvider><App /></LanguageProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
