import '@fontsource-variable/unbounded';
import '@fontsource-variable/instrument-sans';
import '@fontsource-variable/martian-mono';
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { installDebugHook } from './utils/debug';

installDebugHook();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
