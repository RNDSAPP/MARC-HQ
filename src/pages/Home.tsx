import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <main style={{ padding: 32 }}>
      <h1>Marc HQ</h1>
      <p>
        <Link to="/rnds/vue-d-ensemble">RNDS</Link> · <Link to="/club421/vue-d-ensemble">Club 421</Link>
      </p>
    </main>
  );
}
