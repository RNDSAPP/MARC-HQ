import { Navigate, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Workspace from './pages/Workspace';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/rnds" element={<Navigate to="/rnds/vue-d-ensemble" replace />} />
      <Route path="/club421" element={<Navigate to="/club421/vue-d-ensemble" replace />} />
      <Route path="/rnds/:module" element={<Workspace key="rnds" project="rnds" />} />
      <Route path="/club421/:module" element={<Workspace key="club421" project="club421" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
