import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './firebase.ts';
import App from './App.tsx';
import AdminPanel from './AdminPanel.tsx';
import { ExportDataProvider } from './networkContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ExportDataProvider>
        <Routes>
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/*" element={<App />} />
        </Routes>
      </ExportDataProvider>
    </BrowserRouter>
  </StrictMode>,
);
