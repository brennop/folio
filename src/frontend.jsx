import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { useRoute } from '@/router';
import Home from '@/pages/Home';
import Stocks from '@/pages/Stocks';

const routes = {
  '/': Home,
  '/stocks': Stocks,
};

function App() {
  const path = useRoute();
  const Page = routes[path] ?? Home;
  return <Page />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
