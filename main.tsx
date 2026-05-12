import './index.css';
import { ensureFirebaseApp } from './firebase.ts';

void ensureFirebaseApp().then(() => import('./root.tsx'));
