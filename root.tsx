import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import App from './App.tsx';
import AdminPanel from './AdminPanel.tsx';
import { ExportDataProvider } from './networkContext.tsx';

const routerBasename =
  import.meta.env.BASE_URL.replace(/\/$/, '') === '' ? undefined : import.meta.env.BASE_URL.replace(/\/$/, '');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={routerBasename}>
      <ExportDataProvider>
        <Routes>
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/*" element={<App />} />
        </Routes>
      </ExportDataProvider>
    </BrowserRouter>
  </StrictMode>,
);
