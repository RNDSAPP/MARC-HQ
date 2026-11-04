import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import AuthGate from './components/AuthGate';
import CommandPalette from './components/CommandPalette';
import NewProjectDialog from './components/NewProjectDialog';
import PhaseTheme from './components/PhaseTheme';
import ProjectStyles from './components/ProjectStyles';
import UpdateBanner from './components/UpdateBanner';
import { useMotionDriver } from './lib/motion';
import Home from './pages/Home';
import Workspace from './pages/Workspace';

/** Any project, built in or added: /rnds/clubs, /club421/bde, /mon-projet/todo… */
function ProjectRoute() {
  const { project } = useParams();
  return <Workspace key={project} project={project ?? ''} />;
}

function ProjectHome() {
  const { project } = useParams();
  return <Navigate to={`/${project}/vue-d-ensemble`} replace />;
}

export default function App() {
  useMotionDriver();
  return (
    <>
      <UpdateBanner />
      <AuthGate>
        <PhaseTheme />
        <ProjectStyles />
        <CommandPalette />
        <NewProjectDialog />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/:project" element={<ProjectHome />} />
          <Route path="/:project/:module" element={<ProjectRoute />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthGate>
    </>
  );
}
