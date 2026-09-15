import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { LanguageProvider } from './i18n';
import { UpdateProvider } from './context/UpdateContext';
import { AuthProvider } from './context/AuthContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <UpdateProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </UpdateProvider>
    </LanguageProvider>
  </StrictMode>,
);
