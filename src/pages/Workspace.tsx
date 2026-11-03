import { useParams } from 'react-router-dom';

type Props = { project: 'rnds' | 'club421' };

export default function Workspace({ project }: Props) {
  const { module } = useParams();
  return (
    <main data-project={project} style={{ padding: 32 }}>
      <h1>
        {project} / {module}
      </h1>
    </main>
  );
}
